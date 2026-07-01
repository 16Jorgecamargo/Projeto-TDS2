import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function authHeader(app: FastifyInstance) {
  const email = `acc-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Acc', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('account routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('retorna preferencias padrao e atualiza', async () => {
    const headers = await authHeader(app);

    const prefs = await app.inject({ method: 'GET', url: '/api/account/preferences', headers });
    expect(prefs.json().language).toBe('pt-BR');
    expect(prefs.json().smsNotifications).toBe(false);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/account/preferences',
      headers,
      payload: { smsNotifications: true },
    });
    expect(updated.json().smsNotifications).toBe(true);
    expect(updated.json().language).toBe('pt-BR');
  });

  it('registra e lista consentimento LGPD', async () => {
    const headers = await authHeader(app);

    const created = await app.inject({
      method: 'POST',
      url: '/api/account/consents',
      headers,
      payload: { type: 'privacy', granted: true, version: '2026-07-01' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().type).toBe('privacy');

    const list = await app.inject({ method: 'GET', url: '/api/account/consents', headers });
    expect(list.json()[0].type).toBe('privacy');
  });
});
