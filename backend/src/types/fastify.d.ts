import 'fastify';
import type { preHandlerHookHandler } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AuthUser } from '../plugins/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    dataSource: DataSource;
  }
}
