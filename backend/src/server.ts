import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startNotificationWorker } from './modules/notification/notification.worker.js';
import { buildChatService } from './modules/chat/chat.routes.js';
import { registerChatGateway } from './modules/chat/chat.gateway.js';
import { verifyAccessToken } from './shared/security/token.js';

export async function start(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  startNotificationWorker();

  const io = new Server(app.server, { cors: { origin: env.CORS_ORIGIN, credentials: true } });
  registerChatGateway(io, buildChatService(app), verifyAccessToken);

  return app;
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
