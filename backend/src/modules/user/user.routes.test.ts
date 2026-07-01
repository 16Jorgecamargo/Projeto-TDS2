import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function registerUser(app: FastifyInstance) {
  const email = `me-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Me', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  return res.json().accessToken as string;
}

describe('user routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('exige autenticacao no /users/me', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it('retorna e atualiza o perfil autenticado', async () => {
    const token = await registerUser(app);
    const me = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Novo Nome' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Novo Nome');
  });
});
