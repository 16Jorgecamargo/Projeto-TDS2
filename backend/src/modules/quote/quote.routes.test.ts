import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `quote-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Quote User', email, phone, password: 'S3nh@Forte', role },
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
      email: `quote-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Quote Admin',
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

describe('quote routes', () => {
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

  it('profissional envia orcamento e cliente lista', async () => {
    const client = await registerUser(app, 'client');
    const pro = await createProfessionalWithProfile(app);
    const demandId = await createDemand(client.headers);

    const create = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 2, unitPrice: 150 }] },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().total).toBe(300);

    const list = await app.inject({
      method: 'GET',
      url: `/api/demands/${demandId}/quotes`,
      headers: client.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });

  it('profissional sem perfil recebe 404 ao enviar orcamento', async () => {
    const client = await registerUser(app, 'client');
    const demandId = await createDemand(client.headers);
    const pro = await registerUser(app, 'professional');

    const res = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: 100 }] },
    });
    expect(res.statusCode).toBe(404);
  });

  it('profissional nao pode retirar orcamento de outro profissional', async () => {
    const client = await registerUser(app, 'client');
    const demandId = await createDemand(client.headers);
    const pro = await createProfessionalWithProfile(app);
    const otherPro = await createProfessionalWithProfile(app);

    const create = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: 100 }] },
    });
    const quoteId = create.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/withdraw`,
      headers: otherPro.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('profissional retira o proprio orcamento', async () => {
    const client = await registerUser(app, 'client');
    const demandId = await createDemand(client.headers);
    const pro = await createProfessionalWithProfile(app);

    const create = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: 100 }] },
    });
    const quoteId = create.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/withdraw`,
      headers: pro.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('withdrawn');
  });
});
