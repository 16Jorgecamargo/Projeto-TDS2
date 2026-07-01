import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `demand-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Demand User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

async function adminHeaders() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `demand-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Demand Admin',
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

async function createCategory(app: FastifyInstance) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/categories',
    headers: await adminHeaders(),
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

describe('demand routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cliente publica e le demanda; budget volta number', async () => {
    const categoryId = await createCategory(app);
    const { headers, userId } = await registerUser(app, 'client');

    const create = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    expect(create.statusCode).toBe(201);
    const body = create.json();
    expect(body.budgetMin).toBe(100);
    expect(body.clientId).toBe(userId);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/demands/${body.id}`,
      headers,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().budgetMax).toBe(500);
  });

  it('profissional nao pode publicar demanda', async () => {
    const categoryId = await createCategory(app);
    const { headers } = await registerUser(app, 'professional');
    const res = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    expect(res.statusCode).toBe(403);
  });

  it('nao autor da demanda nao pode listar convites', async () => {
    const categoryId = await createCategory(app);
    const { headers } = await registerUser(app, 'client');
    const create = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    const demandId = create.json().id;

    const { headers: otherHeaders } = await registerUser(app, 'client');
    const res = await app.inject({
      method: 'GET',
      url: `/api/demands/${demandId}/invitations`,
      headers: otherHeaders,
    });
    expect(res.statusCode).toBe(403);
  });

  it('autor da demanda pode listar convites', async () => {
    const categoryId = await createCategory(app);
    const { headers } = await registerUser(app, 'client');
    const create = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    const demandId = create.json().id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/demands/${demandId}/invitations`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('cliente convida profissional e profissional responde ao convite', async () => {
    const categoryId = await createCategory(app);
    const { headers } = await registerUser(app, 'client');
    const create = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    const demandId = create.json().id;

    const professional = await createProfessionalWithProfile(app);

    const invite = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/invitations`,
      headers,
      payload: { professionalId: professional.profileId },
    });
    expect(invite.statusCode).toBe(201);
    const invitationId = invite.json().id;
    expect(invite.json().status).toBe('pending');

    const listed = await app.inject({
      method: 'GET',
      url: `/api/demands/${demandId}/invitations`,
      headers,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);

    const respond = await app.inject({
      method: 'POST',
      url: `/api/invitations/${invitationId}/respond`,
      headers: professional.headers,
      payload: { accept: true },
    });
    expect(respond.statusCode).toBe(200);
    expect(respond.json().status).toBe('accepted');
  });
});
