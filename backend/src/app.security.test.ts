import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  app.get('/security-probe', async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('security hardening', () => {
  it('emits hardened security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/security-probe' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('exposes rate limit headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/security-probe' });
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
  });

  it('keeps swagger UI reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });
    expect(res.statusCode).toBeLessThan(400);
  });
});
