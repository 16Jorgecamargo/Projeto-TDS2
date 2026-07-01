import { describe, it, expect } from 'vitest';
import { buildApp } from './app.js';

describe('buildApp', () => {
  it('boots and serves the health route', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });

  it('exposes the OpenAPI document with the health path', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    expect(res.json().paths['/health']).toBeDefined();
    await app.close();
  });

  it('serializes the auth guard failure through the global error handler', async () => {
    const app = await buildApp();
    app.get('/guarded', { preHandler: app.authenticate }, async () => ({ ok: true }));
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/guarded' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
    await app.close();
  });
});
