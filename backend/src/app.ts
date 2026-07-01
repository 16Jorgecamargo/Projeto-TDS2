import 'zod-openapi/extend';
import Fastify, { type FastifyInstance } from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { DataSource } from 'typeorm';
import { env } from './config/env.js';
import { AppDataSource } from './infra/database/data-source.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { requestIdPlugin } from './shared/middlewares/request-id.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';

interface BuildAppOptions {
  dataSource?: DataSource;
}

export async function buildApp(opts?: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(compress, { global: true });

  await app.register(errorHandlerPlugin);
  await app.register(requestIdPlugin);
  await app.register(authPlugin, { accessSecret: env.JWT_ACCESS_SECRET });

  await app.register(swagger, {
    openapi: {
      info: { title: 'Services Marketplace API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  const ds = opts?.dataSource ?? AppDataSource;
  if (!ds.isInitialized) {
    await ds.initialize();
  }
  app.decorate('dataSource', ds);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });

  return app;
}
