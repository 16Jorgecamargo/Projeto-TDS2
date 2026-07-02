import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { metricsPlugin } from './metrics.plugin.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(metricsPlugin);
  app.get('/ping', async () => ({ ok: true }));
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('metricsPlugin', () => {
  it('expõe /metrics em texto Prometheus', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('http_request_duration_seconds');
  });

  it('registra duração após servir uma rota', async () => {
    await app.inject({ method: 'GET', url: '/ping' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toContain('route="/ping"');
  });
});
