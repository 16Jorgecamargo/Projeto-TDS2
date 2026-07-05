import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `contract-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Contract User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

async function createProfessionalWithProfile(app: FastifyInstance) {
  const { headers, userId } = await registerUser(app, 'professional');
  const res = await app.inject({
    method: 'PUT',
    url: '/api/professionals/me',
    headers,
    payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
  });
  return { headers, userId, profileId: res.json().id as string };
}

async function registerAdmin() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `contract-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Contract Admin',
      cpf: null,
      avatar_url: null,
      status: 'active',
      email_verified_at: null,
      phone_verified_at: null,
    }),
  );
  const token = signAccessToken({ sub: admin.id, role: 'admin' });
  return { authorization: `Bearer ${token}` };
}

function demandPayload(categoryId: string) {
  return {
    categoryId,
    title: 'Instalacao eletrica',
    description: 'x'.repeat(25),
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
  };
}

describe('contract routes', () => {
  let app: FastifyInstance;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
    const admin = await registerAdmin();
    const category = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: admin,
      payload: {
        parentId: null,
        name: 'Eletrica',
        slug: `eletrica-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        icon: null,
        description: null,
      },
    });
    categoryId = category.json().id;
  });
  afterAll(async () => {
    await app.close();
  });

  async function createDemand(headers: { authorization: string }) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    return res.json().id as string;
  }

  async function createAcceptedContract() {
    const client = await registerUser(app, 'client');
    const pro = await createProfessionalWithProfile(app);
    const demandId = await createDemand(client.headers);

    const quote = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: 300 }] },
    });
    const quoteId = quote.json().id;

    const accept = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/accept`,
      headers: client.headers,
      payload: { schedule: null },
    });
    return { client, pro, demandId, quoteId, contractId: accept.json().id as string, accept };
  }

  it('aceita orcamento, inicia e registra progresso', async () => {
    const { client, pro, contractId, accept } = await createAcceptedContract();
    expect(accept.statusCode).toBe(201);
    expect(accept.json().status).toBe('active');

    const start = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/start`,
      headers: pro.headers,
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().status).toBe('active');
    expect(start.json().startedAt).not.toBeNull();

    const progress = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/progress`,
      headers: pro.headers,
      payload: { description: 'Fase 1 concluida', percentage: 50, images: [] },
    });
    expect(progress.statusCode).toBe(201);
    expect(progress.json().percentage).toBe(50);

    const listProgress = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}/progress`,
      headers: client.headers,
    });
    expect(listProgress.statusCode).toBe(200);
    expect(listProgress.json()).toHaveLength(1);

    const complete = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/complete`,
      headers: pro.headers,
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json().status).toBe('completed');
  });

  it('resposta do contrato inclui nome do cliente e dados do profissional', async () => {
    const { pro, accept } = await createAcceptedContract();

    expect(accept.json().clientName).toEqual(expect.any(String));
    expect(accept.json().clientName.length).toBeGreaterThan(0);
    expect(accept.json().professionalHeadline).toBe('Eletricista');
    expect(accept.json().professionalUserId).toBe(pro.userId);
  });

  it('cliente nao pode iniciar ou concluir contrato', async () => {
    const { client, contractId } = await createAcceptedContract();

    const start = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/start`,
      headers: client.headers,
    });
    expect(start.statusCode).toBe(403);

    const complete = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/complete`,
      headers: client.headers,
    });
    expect(complete.statusCode).toBe(403);
  });

  it('nao participante nao acessa getById, listProgress ou cancel', async () => {
    const { contractId } = await createAcceptedContract();
    const outsider = await registerUser(app, 'client');

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}`,
      headers: outsider.headers,
    });
    expect(getRes.statusCode).toBe(403);

    const listProgressRes = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}/progress`,
      headers: outsider.headers,
    });
    expect(listProgressRes.statusCode).toBe(403);

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/cancel`,
      headers: outsider.headers,
      payload: { reason: 'Motivo qualquer' },
    });
    expect(cancelRes.statusCode).toBe(403);
  });

  it('profissional sem perfil recebe 404 ao iniciar contrato', async () => {
    const { contractId } = await createAcceptedContract();
    const proWithoutProfile = await registerUser(app, 'professional');

    const start = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/start`,
      headers: proWithoutProfile.headers,
    });
    expect(start.statusCode).toBe(404);
  });

  it('cliente cancela contrato', async () => {
    const { client, contractId } = await createAcceptedContract();

    const cancel = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/cancel`,
      headers: client.headers,
      payload: { reason: 'Mudanca de planos' },
    });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().status).toBe('cancelled');
  });

  it('lista contratos do cliente e do profissional', async () => {
    const { client, pro } = await createAcceptedContract();

    const clientList = await app.inject({
      method: 'GET',
      url: '/api/contracts',
      headers: client.headers,
    });
    expect(clientList.statusCode).toBe(200);
    expect(clientList.json().length).toBeGreaterThanOrEqual(1);

    const proList = await app.inject({
      method: 'GET',
      url: '/api/contracts',
      headers: pro.headers,
    });
    expect(proList.statusCode).toBe(200);
    expect(proList.json().length).toBeGreaterThanOrEqual(1);
  });
});
