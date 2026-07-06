import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../buildTestApp.js';
import { resetDatabase, loginAs } from './helpers.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';

let app: FastifyInstance;

let phoneSequence = 0;

async function register(email: string, role: 'client' | 'professional'): Promise<void> {
  phoneSequence += 1;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: email.split('@')[0],
      email,
      password: 'Senha123!',
      role,
      phone: `1199999${String(phoneSequence).padStart(4, '0')}`,
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`register failed: ${response.statusCode} ${response.body}`);
  }
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function createCategory(): Promise<string> {
  const repo = app.dataSource.getRepository(ServiceCategory);
  const category = await repo.save(
    repo.create({
      parent_id: null,
      name: 'Eletrica',
      slug: `eletrica-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      icon: null,
      description: null,
      is_active: true,
    }),
  );
  return category.id;
}

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('fluxo demanda -> orcamento -> contrato -> pagamento -> avaliacao', () => {
  it('coloca 100% do valor pago em espera na carteira do profissional e permite avaliacao mutua', async () => {
    await register('cliente@example.com', 'client');
    await register('profissional@example.com', 'professional');

    const client = await loginAs(app, { email: 'cliente@example.com', password: 'Senha123!' });
    const professional = await loginAs(app, {
      email: 'profissional@example.com',
      password: 'Senha123!',
    });

    const profileResponse = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: bearer(professional.accessToken),
      payload: {
        headline: 'Eletricista residencial',
        bio: 'Atuo ha 10 anos com instalacoes.',
        yearsExperience: 10,
        hourlyRate: 120,
        serviceRadiusKm: 30,
      },
    });
    expect(profileResponse.statusCode).toBe(200);

    const categoryId = await createCategory();

    const demandResponse = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers: bearer(client.accessToken),
      payload: {
        categoryId,
        title: 'Instalacao eletrica',
        description: 'Preciso instalar 4 tomadas na sala e cozinha',
        budgetMin: 100,
        budgetMax: 500,
        street: 'Rua Principal',
        number: '100',
        complement: null,
        district: 'Centro',
        city: 'Porto Alegre',
        state: 'RS',
        zipCode: '90000-000',
        tagIds: [],
        images: [],
      },
    });
    expect(demandResponse.statusCode).toBe(201);
    const demandId = demandResponse.json().id as string;

    const quoteResponse = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: bearer(professional.accessToken),
      payload: {
        message: 'Posso fazer na quinta.',
        validUntil: null,
        total: 300,
      },
    });
    expect(quoteResponse.statusCode).toBe(201);
    const quote = quoteResponse.json() as { id: string; total: number };

    const acceptResponse = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quote.id}/accept`,
      headers: bearer(client.accessToken),
      payload: { schedule: null },
    });
    expect(acceptResponse.statusCode).toBe(201);
    const contract = acceptResponse.json() as { id: string; status: string; total: number };
    expect(contract.status).toBe('active');

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/start`,
      headers: bearer(professional.accessToken),
    });
    expect(startResponse.statusCode).toBe(200);

    const progressResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/progress`,
      headers: bearer(professional.accessToken),
      payload: {
        description: 'Fase 1 concluida',
        percentage: 50,
        images: [],
      },
    });
    expect(progressResponse.statusCode).toBe(201);

    const paymentResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/payment`,
      headers: bearer(client.accessToken),
      payload: { method: 'pix' },
    });
    expect(paymentResponse.statusCode).toBe(201);
    expect(paymentResponse.json().status).toBe('captured');

    const completeResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/complete`,
      headers: bearer(professional.accessToken),
    });
    expect(completeResponse.statusCode).toBe(200);
    expect(completeResponse.json().status).toBe('completed');

    const walletResponse = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: bearer(professional.accessToken),
    });
    expect(walletResponse.statusCode).toBe(200);
    expect(walletResponse.json().balance).toBe(0);
    expect(walletResponse.json().pendingBalance).toBe(quote.total);

    const clientReviewResponse = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: bearer(client.accessToken),
      payload: { contractId: contract.id, rating: 5, comment: 'Servico impecavel e pontual.' },
    });
    expect(clientReviewResponse.statusCode).toBe(201);
    expect(clientReviewResponse.json().rating).toBe(5);

    const professionalReviewResponse = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: bearer(professional.accessToken),
      payload: { contractId: contract.id, rating: 5, comment: 'Cliente atencioso e pontual no pagamento.' },
    });
    expect(professionalReviewResponse.statusCode).toBe(201);
    expect(professionalReviewResponse.json().rating).toBe(5);
  });

  it('impede pagamento por quem nao e o cliente do contrato', async () => {
    await register('cliente2@example.com', 'client');
    await register('profissional2@example.com', 'professional');
    await register('outro-profissional@example.com', 'professional');

    const client = await loginAs(app, { email: 'cliente2@example.com', password: 'Senha123!' });
    const professional = await loginAs(app, {
      email: 'profissional2@example.com',
      password: 'Senha123!',
    });
    const otherProfessional = await loginAs(app, {
      email: 'outro-profissional@example.com',
      password: 'Senha123!',
    });

    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: bearer(professional.accessToken),
      payload: {
        headline: 'Eletricista residencial',
        bio: null,
        yearsExperience: null,
        hourlyRate: null,
        serviceRadiusKm: null,
      },
    });

    const categoryId = await createCategory();

    const demandResponse = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers: bearer(client.accessToken),
      payload: {
        categoryId,
        title: 'Instalacao eletrica',
        description: 'Preciso instalar 4 tomadas na sala e cozinha',
        budgetMin: 100,
        budgetMax: 500,
        street: 'Rua Principal',
        number: '100',
        complement: null,
        district: 'Centro',
        city: 'Porto Alegre',
        state: 'RS',
        zipCode: '90000-000',
        tagIds: [],
        images: [],
      },
    });
    const demandId = demandResponse.json().id as string;

    const quoteResponse = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: bearer(professional.accessToken),
      payload: {
        message: 'Posso fazer na quinta.',
        validUntil: null,
        total: 300,
      },
    });
    const quote = quoteResponse.json() as { id: string };

    const acceptResponse = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quote.id}/accept`,
      headers: bearer(client.accessToken),
      payload: { schedule: null },
    });
    const contract = acceptResponse.json() as { id: string };

    const paymentResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/payment`,
      headers: bearer(otherProfessional.accessToken),
      payload: { method: 'pix' },
    });
    expect(paymentResponse.statusCode).toBe(403);
    expect(paymentResponse.json().error).toBeDefined();
  });
});
