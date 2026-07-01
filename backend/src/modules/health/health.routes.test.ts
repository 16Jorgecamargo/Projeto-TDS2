import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { describe, it, expect } from 'vitest';
import 'zod-openapi/extend';
import { healthRoutes } from './health.routes.js';

async function buildProbe() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(healthRoutes);
  await app.ready();
  return app;
}

describe('healthRoutes', () => {
  it('reports liveness on GET /health', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    expect(typeof res.json().uptime).toBe('number');
  });

  it('reports readiness on GET /health/ready', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });
});
