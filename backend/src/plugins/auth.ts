import type { FastifyPluginCallback, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const roleSchema = z.enum(['client', 'professional', 'admin']);

export type Role = z.infer<typeof roleSchema>;

export type AuthUser = { id: string; role: Role };

interface AuthPluginOptions {
  accessSecret: string;
}

function unauthorized(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 401, code: 'UNAUTHORIZED' });
}

function forbidden(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 403, code: 'FORBIDDEN' });
}

const tokenPayloadSchema = z.object({ sub: z.string(), role: roleSchema });

const handler: FastifyPluginCallback<AuthPluginOptions> = (app, opts, done) => {
  const authenticate: preHandlerHookHandler = async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      unauthorized('Missing bearer token');
    }
    const raw = header.slice('Bearer '.length);
    let decoded: unknown;
    try {
      decoded = jwt.verify(raw, opts.accessSecret);
    } catch {
      unauthorized('Invalid access token');
    }
    const parsed = tokenPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      unauthorized('Malformed access token');
    }
    request.user = { id: parsed.data.sub, role: parsed.data.role };
  };

  app.decorate('authenticate', authenticate);
  done();
};

export const authPlugin = fp(handler, { name: 'auth' });

export function requireRole(...roles: Role[]): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      unauthorized('Authentication required');
    }
    if (!roles.includes(request.user.role)) {
      forbidden('Insufficient role');
    }
  };
}
