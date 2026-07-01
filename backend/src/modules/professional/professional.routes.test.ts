import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `pro-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

async function adminHeader() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `pro-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Pro Admin',
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

describe('professional routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejeita acesso sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/professionals/me' });
    expect(res.statusCode).toBe(401);
  });

  it('cria perfil, adiciona experiencia e le no perfil publico', async () => {
    const headers = await professionalHeader(app);

    const upserted = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
    });
    expect(upserted.statusCode).toBe(200);
    const profileId = upserted.json().id;

    const experience = await app.inject({
      method: 'POST',
      url: '/api/professionals/me/experiences',
      headers,
      payload: {
        title: 'Manutencao',
        company: null,
        description: null,
        startDate: '2020-01-01',
        endDate: null,
        isCurrent: true,
      },
    });
    expect(experience.statusCode).toBe(201);

    const publicProfile = await app.inject({ method: 'GET', url: `/api/professionals/${profileId}` });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json().experiences).toHaveLength(1);
  });

  it('rejeita id de categoria inexistente e nao deixa associacoes parciais', async () => {
    const headers = await professionalHeader(app);
    const upserted = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Pintor residencial', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const profileId = upserted.json().id;

    const admin = await adminHeader();
    const category = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: admin,
      payload: { parentId: null, name: 'Pintura', slug: `pintura-${Date.now()}`, icon: null, description: null },
    });
    expect(category.statusCode).toBe(201);
    const validId = category.json().id;

    const res = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me/categories',
      headers,
      payload: { ids: [validId, '11111111-2222-3333-4444-555555555555'] },
    });
    expect(res.statusCode).toBe(404);

    const publicProfile = await app.inject({ method: 'GET', url: `/api/professionals/${profileId}` });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json().categories).toHaveLength(0);
  });

  it('remove experiencia inexistente com 404', async () => {
    const headers = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Encanador', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/professionals/me/experiences/00000000-0000-0000-0000-000000000000',
      headers,
    });
    expect(res.statusCode).toBe(404);
  });
});
