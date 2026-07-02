import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const createReviewBodySchema = z.object({
  contractId: z
    .string()
    .uuid()
    .describe('Contrato concluido que originou a avaliacao')
    .openapi({ example: '3f1c2b90-0a11-4c33-9b77-2d5e6f7a8b90' }),
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('Nota de 1 a 5')
    .openapi({ example: 5 }),
  comment: z
    .string()
    .min(3)
    .max(2000)
    .describe('Comentario da avaliacao')
    .openapi({ example: 'Servico impecavel e pontual.' }),
});

export const reviewResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da avaliacao')
    .openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  contractId: z
    .string()
    .uuid()
    .describe('Contrato avaliado')
    .openapi({ example: '3f1c2b90-0a11-4c33-9b77-2d5e6f7a8b90' }),
  authorId: z
    .string()
    .uuid()
    .describe('Autor da avaliacao')
    .openapi({ example: 'b1b2c3d4-0000-4000-8000-000000000002' }),
  targetId: z
    .string()
    .uuid()
    .describe('Avaliado')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  rating: z.number().int().min(1).max(5).describe('Nota').openapi({ example: 5 }),
  comment: z
    .string()
    .nullable()
    .describe('Comentario')
    .openapi({ example: 'Servico impecavel e pontual.' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Data de criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const reviewListResponseSchema = paginatedResponse(reviewResponseSchema);

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewListResponse = z.infer<typeof reviewListResponseSchema>;
