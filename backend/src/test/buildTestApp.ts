import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { setupTestDatabase } from './database.js';

export async function buildTestApp(): Promise<FastifyInstance> {
  await setupTestDatabase();
  const app = await buildApp();
  await app.ready();
  return app;
}
