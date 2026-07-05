import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `review-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Review User', email, phone, password: 'S3nh@Forte', role },
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
      email: `review-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Review Admin',
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

async function createCategory(app: FastifyInstance, admin: { authorization: string }) {
  const res = await app.inject({
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
  return res.json().id as string;
}

async function createCompletedContract(app: FastifyInstance, categoryId: string) {
  const client = await registerUser(app, 'client');
  const pro = await createProfessionalWithProfile(app);

  const demand = await app.inject({
    method: 'POST',
    url: '/api/demands',
    headers: client.headers,
    payload: {
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
    },
  });
  const demandId = demand.json().id as string;

  const quote = await app.inject({
    method: 'POST',
    url: `/api/demands/${demandId}/quotes`,
    headers: pro.headers,
    payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: 300 }] },
  });
  const quoteId = quote.json().id as string;

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

  await app.inject({
    method: 'POST',
    url: `/api/contracts/${contractId}/complete`,
    headers: pro.headers,
  });

  return { client, pro, contractId };
}

describe('review routes', () => {
  let app: FastifyInstance;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
    const admin = await registerAdmin();
    categoryId = await createCategory(app, admin);
  });
  afterAll(async () => {
    await app.close();
  });

  it('cliente cria avaliacao para o profissional do contrato concluido', async () => {
    const { client, pro, contractId } = await createCompletedContract(app, categoryId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: client.headers,
      payload: { contractId, rating: 5, comment: 'Excelente servico' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ contractId, authorId: client.userId, targetId: pro.userId, rating: 5 });

    const list = await app.inject({
      method: 'GET',
      url: `/api/professionals/${pro.profileId}/reviews`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);
    expect(list.json().items[0]).toMatchObject({ targetId: pro.userId, rating: 5 });
  });

  it('rejeita avaliacao duplicada do mesmo autor no mesmo contrato', async () => {
    const { client, contractId } = await createCompletedContract(app, categoryId);

    await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: client.headers,
      payload: { contractId, rating: 4, comment: 'Bom servico' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: client.headers,
      payload: { contractId, rating: 3, comment: 'Repetido' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('rejeita avaliacao de quem nao participa do contrato', async () => {
    const { contractId } = await createCompletedContract(app, categoryId);
    const outsider = await registerUser(app, 'client');

    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: outsider.headers,
      payload: { contractId, rating: 4, comment: 'Nao participei' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('retorna 401 sem autenticacao', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      payload: { contractId: '00000000-0000-4000-8000-000000000000', rating: 5, comment: 'Sem token' },
    });
    expect(res.statusCode).toBe(401);
  });
});
