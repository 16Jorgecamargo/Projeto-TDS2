import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `social-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Social User', email, phone, password: 'S3nh@Forte', role },
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

describe('social routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('favorita profissional, lista e remove', async () => {
    const client = await registerUser(app, 'client');
    const pro = await createProfessionalWithProfile(app);

    const create = await app.inject({
      method: 'POST',
      url: '/api/favorites',
      headers: client.headers,
      payload: { professionalId: pro.profileId },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({ professionalId: pro.profileId });

    const list = await app.inject({
      method: 'GET',
      url: '/api/favorites?page=1&limit=20',
      headers: client.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);
    expect(list.json().items[0]).toMatchObject({ professionalId: pro.profileId });

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/favorites/${pro.profileId}`,
      headers: client.headers,
    });
    expect(remove.statusCode).toBe(204);

    const listAfter = await app.inject({
      method: 'GET',
      url: '/api/favorites?page=1&limit=20',
      headers: client.headers,
    });
    expect(listAfter.json().total).toBe(0);
  });

  it('rejeita favorito duplicado', async () => {
    const client = await registerUser(app, 'client');
    const pro = await createProfessionalWithProfile(app);

    await app.inject({
      method: 'POST',
      url: '/api/favorites',
      headers: client.headers,
      payload: { professionalId: pro.profileId },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/favorites',
      headers: client.headers,
      payload: { professionalId: pro.profileId },
    });
    expect(res.statusCode).toBe(409);
  });

  it('cria denuncia', async () => {
    const reporter = await registerUser(app, 'client');
    const target = await registerUser(app, 'client');

    const res = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: reporter.headers,
      payload: { targetType: 'user', targetId: target.userId, reason: 'abuse', description: 'Comportamento inadequado' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'pending' });
  });

  it('bloqueia usuario, lista e desbloqueia', async () => {
    const blocker = await registerUser(app, 'client');
    const blocked = await registerUser(app, 'client');

    const create = await app.inject({
      method: 'POST',
      url: '/api/blocks',
      headers: blocker.headers,
      payload: { blockedId: blocked.userId },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({ blockedId: blocked.userId });

    const list = await app.inject({
      method: 'GET',
      url: '/api/blocks?page=1&limit=20',
      headers: blocker.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/blocks/${blocked.userId}`,
      headers: blocker.headers,
    });
    expect(remove.statusCode).toBe(204);
  });

  it('bloquear a si mesmo retorna 409', async () => {
    const client = await registerUser(app, 'client');

    const res = await app.inject({
      method: 'POST',
      url: '/api/blocks',
      headers: client.headers,
      payload: { blockedId: client.userId },
    });
    expect(res.statusCode).toBe(409);
  });

  it('retorna 401 sem autenticacao', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/favorites',
    });
    expect(res.statusCode).toBe(401);
  });
});
