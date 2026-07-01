import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `dispute-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Dispute User', email, phone, password: 'S3nh@Forte', role },
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
      email: `dispute-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Dispute Admin',
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
    addressId: null,
    tagIds: [],
    images: [],
  };
}

describe('dispute routes', () => {
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

  async function createStartedContract() {
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
    const contractId = accept.json().id as string;

    await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/start`,
      headers: pro.headers,
    });

    return { client, pro, contractId };
  }

  it('cliente abre disputa e contrato fica disputed', async () => {
    const { client, contractId } = await createStartedContract();

    const dispute = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: client.headers,
      payload: { reason: 'Servico nao concluido no prazo' },
    });
    expect(dispute.statusCode).toBe(201);
    expect(dispute.json().status).toBe('open');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}`,
      headers: client.headers,
    });
    expect(detail.json().status).toBe('disputed');
  });

  it('profissional abre disputa usando o profile id, provando a correcao do id-space', async () => {
    const { pro, contractId } = await createStartedContract();

    const dispute = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: pro.headers,
      payload: { reason: 'Cliente nao permitiu acesso ao local' },
    });
    expect(dispute.statusCode).toBe(201);
    expect(dispute.json().status).toBe('open');
    expect(dispute.json().openedBy).toBe(pro.userId);

    const list = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}/disputes`,
      headers: pro.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });

  it('nao-participante recebe 403 ao abrir ou listar disputas', async () => {
    const { contractId } = await createStartedContract();
    const outsider = await registerUser(app, 'client');

    const openRes = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: outsider.headers,
      payload: { reason: 'Motivo qualquer para disputa' },
    });
    expect(openRes.statusCode).toBe(403);

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}/disputes`,
      headers: outsider.headers,
    });
    expect(listRes.statusCode).toBe(403);
  });

  it('admin resolve disputa; nao-admin recebe 403', async () => {
    const { client, contractId } = await createStartedContract();
    const dispute = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: client.headers,
      payload: { reason: 'Servico nao concluido no prazo' },
    });
    const disputeId = dispute.json().id as string;

    const nonAdminResolve = await app.inject({
      method: 'POST',
      url: `/api/disputes/${disputeId}/resolve`,
      headers: client.headers,
      payload: { status: 'resolved', resolution: 'Reembolso parcial' },
    });
    expect(nonAdminResolve.statusCode).toBe(403);

    const admin = await registerAdmin();
    const resolve = await app.inject({
      method: 'POST',
      url: `/api/disputes/${disputeId}/resolve`,
      headers: admin,
      payload: { status: 'resolved', resolution: 'Reembolso parcial' },
    });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().status).toBe('resolved');
    expect(resolve.json().resolution).toBe('Reembolso parcial');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}`,
      headers: client.headers,
    });
    expect(detail.json().status).toBe('active');
  });
});
