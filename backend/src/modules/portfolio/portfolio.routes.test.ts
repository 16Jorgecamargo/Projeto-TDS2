import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `port-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('portfolio routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria item, adiciona imagem e le publicamente com imagens aninhadas', async () => {
    const headers = await professionalHeader(app);
    const profile = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Marceneiro', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const professionalId = profile.json().id;

    const item = await app.inject({
      method: 'POST',
      url: '/api/portfolio/me/items',
      headers,
      payload: { categoryId: null, title: 'Movel planejado', description: null, completedAt: null },
    });
    expect(item.statusCode).toBe(201);

    const image = await app.inject({
      method: 'POST',
      url: `/api/portfolio/me/items/${item.json().id}/images`,
      headers,
      payload: { imageUrl: 'https://cdn.app/img.jpg', position: 0 },
    });
    expect(image.statusCode).toBe(201);

    const publicList = await app.inject({ method: 'GET', url: `/api/portfolio/${professionalId}/items` });
    expect(publicList.statusCode).toBe(200);
    expect(publicList.json()[0].images).toHaveLength(1);
  });

  it('rejeita atualizar item de outro profissional com 404', async () => {
    const headerA = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: headerA,
      payload: { headline: 'Profissional A', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const item = await app.inject({
      method: 'POST',
      url: '/api/portfolio/me/items',
      headers: headerA,
      payload: { categoryId: null, title: 'Item A', description: null, completedAt: null },
    });

    const headerB = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: headerB,
      payload: { headline: 'Profissional B', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const attempt = await app.inject({
      method: 'PATCH',
      url: `/api/portfolio/me/items/${item.json().id}`,
      headers: headerB,
      payload: { title: 'Tentativa invasora' },
    });
    expect(attempt.statusCode).toBe(404);
  });

  it('rejeita criar item sem autenticacao', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/portfolio/me/items',
      payload: { categoryId: null, title: 'Item sem auth', description: null, completedAt: null },
    });
    expect(res.statusCode).toBe(401);
  });
});
