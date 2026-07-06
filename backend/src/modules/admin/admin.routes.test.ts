import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `admin-mod-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Admin Mod User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

async function createProfessionalWithProfile(app: FastifyInstance) {
  const { headers, userId } = await registerUser(app, 'professional');
  await app.inject({
    method: 'PUT',
    url: '/api/professionals/me',
    headers,
    payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
  });
  return { headers, userId };
}

async function registerAdmin() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `admin-mod-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Admin Mod Admin',
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

describe('admin routes', () => {
  let app: FastifyInstance;
  let categoryId: string;
  let admin: { authorization: string };

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
    admin = await registerAdmin();
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
      payload: { message: 'orcamento', validUntil: null, total: 300 },
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

  it('nega acesso a nao-admin com 403', async () => {
    const client = await registerUser(app, 'client');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports?page=1&limit=20',
      headers: client.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('requisicao sem autenticacao recebe 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/reports?page=1&limit=20' });
    expect(res.statusCode).toBe(401);
  });

  it('admin suspende usuario', async () => {
    const target = await registerUser(app, 'client');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${target.userId}/status`,
      headers: admin,
      payload: { status: 'suspended', reason: 'teste de moderacao' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('suspended');
  });

  it('retorna 404 ao moderar usuario inexistente', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/admin/users/00000000-0000-4000-8000-000000000000/status',
      headers: admin,
      payload: { status: 'suspended', reason: 'teste' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('admin lista e resolve denuncia', async () => {
    const reporter = await registerUser(app, 'client');
    const target = await registerUser(app, 'client');

    const create = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: reporter.headers,
      payload: { targetType: 'user', targetId: target.userId, reason: 'abuse', description: 'comportamento abusivo' },
    });
    expect(create.statusCode).toBe(201);
    const reportId = create.json().id as string;

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/reports?page=1&limit=20',
      headers: admin,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.some((item: { id: string }) => item.id === reportId)).toBe(true);

    const resolve = await app.inject({
      method: 'PATCH',
      url: `/api/admin/reports/${reportId}`,
      headers: admin,
      payload: { resolution: 'actioned', note: 'usuario advertido' },
    });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().status).toBe('actioned');
  });

  it('admin lista usuarios com filtro de busca', async () => {
    const target = await registerUser(app, 'client');

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=20',
      headers: admin,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.some((item: { id: string }) => item.id === target.userId)).toBe(true);
  });

  it('nega acesso a GET /admin/users para nao-admin', async () => {
    const client = await registerUser(app, 'client');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=20',
      headers: client.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin lista e resolve disputa com outcome, refletindo no dispute original', async () => {
    const { client, contractId } = await createStartedContract();

    const dispute = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/disputes`,
      headers: client.headers,
      payload: { reason: 'Servico nao concluido no prazo' },
    });
    const disputeId = dispute.json().id as string;

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/disputes?page=1&limit=20',
      headers: admin,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.some((item: { id: string }) => item.id === disputeId)).toBe(true);

    const resolve = await app.inject({
      method: 'PATCH',
      url: `/api/admin/disputes/${disputeId}`,
      headers: admin,
      payload: { outcome: 'refund_client', note: 'Servico nao entregue' },
    });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().status).toBe('resolved');
    expect(resolve.json().outcome).toBe('refund_client');

    const contractDetail = await app.inject({
      method: 'GET',
      url: `/api/contracts/${contractId}`,
      headers: client.headers,
    });
    expect(contractDetail.json().status).toBe('active');
  });

  it('admin consulta trilha de auditoria apos moderar usuario', async () => {
    const target = await registerUser(app, 'client');

    await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${target.userId}/status`,
      headers: admin,
      payload: { status: 'suspended', reason: 'auditoria' },
    });

    const audit = await app.inject({
      method: 'GET',
      url: `/api/admin/audit?page=1&limit=20&action=admin.user.status_changed`,
      headers: admin,
    });
    expect(audit.statusCode).toBe(200);
    expect(
      audit.json().items.some((item: { entityId: string }) => item.entityId === target.userId),
    ).toBe(true);
  });
});
