import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function authHeader(app: FastifyInstance) {
  const email = `addr-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Addr', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('address routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria primeiro endereco como padrao e lista', async () => {
    const headers = await authHeader(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/addresses',
      headers,
      payload: { label: 'Casa', street: 'Rua', number: '1', complement: null, district: 'Centro', city: 'POA', state: 'RS', zipCode: '90000-000' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().isDefault).toBe(true);

    const list = await app.inject({ method: 'GET', url: '/api/addresses', headers });
    expect(list.json()).toHaveLength(1);
  });

  it('nao permite acessar endereco sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/addresses' });
    expect(res.statusCode).toBe(401);
  });
});
