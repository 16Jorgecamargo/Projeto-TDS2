import type { FastifyPluginCallback, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

interface ShapedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function isShapedError(error: unknown): error is ShapedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Record<string, unknown>).statusCode === 'number' &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

const handler: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Validation failed', details: error.issues },
      });
      return;
    }
    if (isShapedError(error)) {
      reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    app.log.error(error);
    reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
  done();
};

export const errorHandlerPlugin = fp(handler, { name: 'error-handler' });
