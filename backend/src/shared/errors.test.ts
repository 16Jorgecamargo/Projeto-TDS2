import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from './errors.js';

describe('AppError hierarchy', () => {
  it('carries status, code, message and details', () => {
    const error = new AppError(418, 'TEAPOT', 'no coffee', { hint: 'tea' });
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.message).toBe('no coffee');
    expect(error.details).toEqual({ hint: 'tea' });
  });

  it('maps each subclass to its status and code', () => {
    expect([new BadRequestError().statusCode, new BadRequestError().code]).toEqual([400, 'BAD_REQUEST']);
    expect([new UnauthorizedError().statusCode, new UnauthorizedError().code]).toEqual([401, 'UNAUTHORIZED']);
    expect([new ForbiddenError().statusCode, new ForbiddenError().code]).toEqual([403, 'FORBIDDEN']);
    expect([new NotFoundError().statusCode, new NotFoundError().code]).toEqual([404, 'NOT_FOUND']);
    expect([new ConflictError().statusCode, new ConflictError().code]).toEqual([409, 'CONFLICT']);
    expect([new UnprocessableError().statusCode, new UnprocessableError().code]).toEqual([422, 'UNPROCESSABLE']);
  });

  it('accepts a custom message and details on subclasses', () => {
    const error = new NotFoundError('user not found', { id: 'u1' });
    expect(error.message).toBe('user not found');
    expect(error.details).toEqual({ id: 'u1' });
    expect(error).toBeInstanceOf(AppError);
  });
});

import Fastify from 'fastify';
import { errorHandlerPlugin } from '../plugins/error-handler.js';

describe('AppError through the global handler', () => {
  it('serializes a thrown ConflictError to the envelope', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    app.get('/x', async () => {
      throw new ConflictError('email taken', { field: 'email' });
    });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/x' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'email taken', details: { field: 'email' } },
    });
    await app.close();
  });
});
