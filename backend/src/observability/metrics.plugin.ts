import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { metricsRegistry, observeHttp } from './metrics.js';

const START_KEY = 'metricsStart';

async function metricsPluginImpl(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as FastifyRequest & { [START_KEY]?: bigint })[START_KEY] = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const start = (request as FastifyRequest & { [START_KEY]?: bigint })[START_KEY];
    if (start === undefined) {
      return;
    }
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = request.routeOptions?.url ?? request.url;
    observeHttp(request.method, route, reply.statusCode, durationSeconds);
  });

  app.get('/metrics', { schema: { hide: true } }, async (_request, reply) => {
    reply.header('content-type', metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });
}

export const metricsPlugin = fp(metricsPluginImpl, { name: 'metrics-plugin' });
