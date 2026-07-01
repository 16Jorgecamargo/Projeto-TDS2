import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { env } from './config/env.js';

export async function start(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  return app;
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
