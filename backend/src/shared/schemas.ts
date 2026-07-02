import { z, type ZodTypeAny } from 'zod';
import 'zod-openapi/extend';

export const idParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('Resource identifier')
    .openapi({ example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number, 1-based')
    .openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Items per page, max 100')
    .openapi({ example: 20 }),
});

export function paginatedResponse<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema).describe('Page items'),
    page: z.number().int().describe('Current page').openapi({ example: 1 }),
    limit: z.number().int().describe('Items per page').openapi({ example: 20 }),
    total: z.number().int().describe('Total items available').openapi({ example: 137 }),
  });
}

export const emptyBodySchema = z.object({}).describe('Empty request body').openapi({ example: {} }).nullish();

export const errorResponseSchema = z.object({
  error: z
    .object({
      code: z.string().describe('Machine-readable error code').openapi({ example: 'NOT_FOUND' }),
      message: z.string().describe('Human-readable message').openapi({ example: 'Not found' }),
      details: z.unknown().optional().describe('Optional structured error context'),
    })
    .describe('Error envelope'),
});
