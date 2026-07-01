import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';

describe('auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra e loga um usuario', async () => {
    const email = `user-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Teste', email, phone: '+5551999990000', password: 'S3nh@Forte', role: 'client' },
    });
    expect(register.statusCode).toBe(201);
    expect(register.json().accessToken).toBeTruthy();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'S3nh@Forte' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.email).toBe(email);
  });

  it('rejeita registro duplicado com 409', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const payload = { name: 'Dup', email, phone: '+5551999990001', password: 'S3nh@Forte', role: 'client' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const second = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');
  });

  it('rotaciona refresh e invalida o antigo', async () => {
    const email = `rot-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Rot', email, phone: '+5551999990002', password: 'S3nh@Forte', role: 'client' },
    });
    const oldRefresh = register.json().refreshToken as string;

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });
    expect(refreshed.statusCode).toBe(200);

    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it('logout revoga o refresh token', async () => {
    const email = `logout-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Out', email, phone: '+5551999990003', password: 'S3nh@Forte', role: 'client' },
    });
    const refreshToken = register.json().refreshToken as string;

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });
    expect(logout.statusCode).toBe(204);

    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
