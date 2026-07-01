import { afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './buildTestApp.js';
import { teardownTestDatabase } from './database.js';

describe('buildTestApp', () => {
  let app: FastifyInstance;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  it('boots the real app against the test database', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
  });
});
