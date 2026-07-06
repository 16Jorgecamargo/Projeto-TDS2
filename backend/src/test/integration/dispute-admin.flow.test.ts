import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../buildTestApp.js';
import { resetDatabase, loginAs } from './helpers.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { User } from '../../infra/database/entities/user.entity.js';

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
      phone: `1188888${String(phoneSequence).padStart(4, '0')}`,
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`register failed: ${response.statusCode} ${response.body}`);
  }
}

async function seedAdmin(email: string): Promise<void> {
  phoneSequence += 1;
  const repo = app.dataSource.getRepository(User);
  const password_hash = await bcrypt.hash('Senha123!', 12);
  await repo.save(
    repo.create({
      email,
      phone: `1177777${String(phoneSequence).padStart(4, '0')}`,
      password_hash,
      role: 'admin',
      full_name: email.split('@')[0],
      cpf: null,
      avatar_url: null,
      status: 'active',
      email_verified_at: null,
      phone_verified_at: null,
    }),
  );
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function createCategory(): Promise<string> {
  const repo = app.dataSource.getRepository(ServiceCategory);
  const category = await repo.save(
    repo.create({
      parent_id: null,
      name: 'Hidraulica',
      slug: `hidraulica-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      icon: null,
      description: null,
      is_active: true,
    }),
  );
  return category.id;
}

async function createActiveContract(clientToken: string, professionalToken: string): Promise<string> {
  const profileResponse = await app.inject({
    method: 'PUT',
    url: '/api/professionals/me',
    headers: bearer(professionalToken),
    payload: {
      headline: 'Encanador residencial',
      bio: 'Atuo ha 8 anos com reparos hidraulicos.',
      yearsExperience: 8,
      hourlyRate: 100,
      serviceRadiusKm: 20,
    },
  });
  expect(profileResponse.statusCode).toBe(200);

  const categoryId = await createCategory();

  const demandResponse = await app.inject({
    method: 'POST',
    url: '/api/demands',
    headers: bearer(clientToken),
    payload: {
      categoryId,
      title: 'Conserto de vazamento',
      description: 'Preciso consertar um vazamento na cozinha',
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
    headers: bearer(professionalToken),
    payload: {
      message: 'Posso ir amanha.',
      validUntil: null,
      total: 200,
    },
  });
  expect(quoteResponse.statusCode).toBe(201);
  const quote = quoteResponse.json() as { id: string };

  const acceptResponse = await app.inject({
    method: 'POST',
    url: `/api/quotes/${quote.id}/accept`,
    headers: bearer(clientToken),
    payload: { schedule: null },
  });
  expect(acceptResponse.statusCode).toBe(201);
  const contract = acceptResponse.json() as { id: string; status: string };
  expect(contract.status).toBe('active');

  return contract.id;
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

describe('fluxo de disputa de contrato, moderacao admin e saque', () => {
  it('cliente abre disputa sobre contrato ativo e admin lista disputas, mas cliente nao pode', async () => {
    await register('cliente-disputa@example.com', 'client');
    await register('profissional-disputa@example.com', 'professional');
    await seedAdmin('admin-disputa@example.com');

    const client = await loginAs(app, { email: 'cliente-disputa@example.com', password: 'Senha123!' });
    const professional = await loginAs(app, {
      email: 'profissional-disputa@example.com',
      password: 'Senha123!',
    });
    const admin = await loginAs(app, { email: 'admin-disputa@example.com', password: 'Senha123!' });

    const contractId = await createActiveContract(client.accessToken, professional.accessToken);

    const openDisputeResponse = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: bearer(client.accessToken),
      payload: { reason: 'O servico nao foi concluido conforme combinado.' },
    });
    expect(openDisputeResponse.statusCode).toBe(201);
    expect(openDisputeResponse.json().status).toBe('open');

    const adminListResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/disputes',
      headers: bearer(admin.accessToken),
    });
    expect(adminListResponse.statusCode).toBe(200);

    const clientListResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/disputes',
      headers: bearer(client.accessToken),
    });
    expect(clientListResponse.statusCode).toBe(403);
    expect(clientListResponse.json().error.code).toBe('FORBIDDEN');
  });

  it('bloqueia acesso de nao-admin a trilha de auditoria', async () => {
    await register('cliente-audit@example.com', 'client');
    const client = await loginAs(app, { email: 'cliente-audit@example.com', password: 'Senha123!' });

    const auditResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/audit',
      headers: bearer(client.accessToken),
    });
    expect(auditResponse.statusCode).toBe(403);
    expect(auditResponse.json().error.code).toBe('FORBIDDEN');
  });

  it('rejeita saque de profissional com valor acima do saldo da carteira', async () => {
    await register('profissional-saque@example.com', 'professional');
    const professional = await loginAs(app, {
      email: 'profissional-saque@example.com',
      password: 'Senha123!',
    });

    const withdrawalResponse = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: bearer(professional.accessToken),
      payload: {
        amount: 500,
        paymentMethod: 'pix',
        destination: 'profissional-saque@pix.com',
      },
    });
    expect(withdrawalResponse.statusCode).toBe(422);
    expect(withdrawalResponse.json().error).toBeDefined();
  });
});
