import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

describe('search routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('busca profissionais publicamente sem autenticacao', async () => {
    const email = `search-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Pro', email, phone: `+55519${Math.floor(10000000 + Math.random() * 89999999)}`, password: 'S3nh@Forte', role: 'professional' },
    });
    const headers = { authorization: `Bearer ${register.json().accessToken}` };
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Pedreiro experiente', bio: null, yearsExperience: null, hourlyRate: 80, serviceRadiusKm: null },
    });

    const res = await app.inject({ method: 'GET', url: '/api/search/professionals?q=pedreiro' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBeGreaterThan(0);
    expect(res.json().items[0].headline).toContain('Pedreiro');
  });

  it('pagina resultados respeitando limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/search/professionals?page=1&limit=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().limit).toBe(1);
    expect(res.json().items.length).toBeLessThanOrEqual(1);
  });
});
