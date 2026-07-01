import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  idParamSchema,
  paginationQuerySchema,
  paginatedResponse,
  errorResponseSchema,
} from './schemas';

describe('shared schemas', () => {
  it('validates a uuid id param', () => {
    expect(idParamSchema.safeParse({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }).success).toBe(true);
    expect(idParamSchema.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('applies pagination defaults and coercion', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('rejects out-of-range pagination', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('wraps an item schema into a paginated envelope', () => {
    const schema = paginatedResponse(z.object({ id: z.string() }));
    const value = { items: [{ id: 'a' }], page: 1, limit: 20, total: 1 };
    expect(schema.parse(value)).toEqual(value);
    expect(schema.safeParse({ ...value, items: [{ id: 1 }] }).success).toBe(false);
  });

  it('describes the error envelope', () => {
    const parsed = errorResponseSchema.parse({ error: { code: 'NOT_FOUND', message: 'x' } });
    expect(parsed.error.code).toBe('NOT_FOUND');
  });
});
