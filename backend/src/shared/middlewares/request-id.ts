import { randomUUID } from 'node:crypto';
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const handler: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook('onRequest', async (request) => {
    const incoming = request.headers['x-request-id'];
    request.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  });
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  done();
};

export const requestIdPlugin = fp(handler, { name: 'request-id' });
