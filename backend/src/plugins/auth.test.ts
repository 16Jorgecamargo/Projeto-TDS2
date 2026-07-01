import Fastify, { type FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach } from 'vitest';
import { errorHandlerPlugin } from './error-handler.js';
import { authPlugin, requireRole, roleSchema } from './auth.js';

const SECRET = 'test-access-secret';

function tokenFor(role: string) {
  return jwt.sign({ sub: 'user-1', role }, SECRET);
}

async function buildProbe(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { accessSecret: SECRET });
  app.get('/me', { preHandler: app.authenticate }, async (request) => request.user);
  app.get(
    '/admin',
    { preHandler: [app.authenticate, requireRole('admin')] },
    async () => ({ ok: true }),
  );
  await app.ready();
  return app;
}

describe('authPlugin', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await buildProbe();
  });

  it('exposes the shared role enum', () => {
    expect(roleSchema.options).toEqual(['client', 'professional', 'admin']);
  });

  it('rejects requests without a bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('populates request.user from a valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${tokenFor('client')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'user-1', role: 'client' });
  });

  it('forbids a role outside the guard set', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${tokenFor('client')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('allows a matching role through the guard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${tokenFor('admin')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
