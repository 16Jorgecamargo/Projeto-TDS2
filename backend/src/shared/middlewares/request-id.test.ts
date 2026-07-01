import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { requestIdPlugin } from './request-id';

async function buildProbe() {
  const app = Fastify({ genReqId: () => 'ignored' });
  await app.register(requestIdPlugin);
  app.get('/x', async (request) => ({ id: request.id }));
  await app.ready();
  return app;
}

describe('requestIdPlugin', () => {
  it('reuses an incoming x-request-id', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/x', headers: { 'x-request-id': 'abc-123' } });
    expect(res.json().id).toBe('abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
    await app.close();
  });

  it('generates an id when none is provided', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/x' });
    expect(typeof res.headers['x-request-id']).toBe('string');
    expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
    await app.close();
  });
});
