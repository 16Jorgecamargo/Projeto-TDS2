import Fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { errorHandlerPlugin } from './error-handler.js';

const captureError = vi.fn();
vi.mock('../observability/sentry.js', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

async function buildProbe() {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  app.get('/app-error', async () => {
    throw Object.assign(new Error('boom'), {
      statusCode: 409,
      code: 'CONFLICT',
      details: { field: 'email' },
    });
  });
  app.get('/zod-error', async () => {
    z.object({ id: z.string().uuid() }).parse({ id: 'nope' });
    return { ok: true };
  });
  app.get('/unknown', async () => {
    throw new Error('unexpected');
  });
  app.get('/rate-limited', async () => {
    throw Object.assign(new Error('Rate limit exceeded, retry in 1 second'), { statusCode: 429 });
  });
  await app.ready();
  return app;
}

describe('errorHandlerPlugin', () => {
  it('serializes shaped errors to the error envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'boom', details: { field: 'email' } },
    });
  });

  it('maps ZodError to a 400 BAD_REQUEST envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/zod-error' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.json().error.details)).toBe(true);
  });

  it('hides internal errors behind a 500 envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/unknown' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('repassa o statusCode de erros do framework sem code (ex: rate limit) em vez de virar 500', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/rate-limited' });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({
      error: { code: 'REQUEST_ERROR', message: 'Rate limit exceeded, retry in 1 second' },
    });
  });

  it('captura o erro no Sentry ao tratar uma falha inesperada', async () => {
    captureError.mockClear();
    const app = await buildProbe();
    await app.inject({ method: 'GET', url: '/unknown' });
    expect(captureError).toHaveBeenCalled();
  });
});
