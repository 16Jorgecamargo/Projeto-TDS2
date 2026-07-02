import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const reportTargetTypeSchema = z
  .enum(['user', 'demand', 'review', 'message'])
  .describe('Tipo do alvo da denuncia')
  .openapi({ example: 'user' });

export const reportReasonSchema = z
  .enum(['spam', 'abuse', 'fraud', 'inappropriate', 'other'])
  .describe('Motivo da denuncia')
  .openapi({ example: 'abuse' });

export const reportStatusSchema = z
  .enum(['pending', 'reviewed', 'dismissed', 'actioned'])
  .describe('Status da denuncia')
  .openapi({ example: 'pending' });

export const createFavoriteBodySchema = z.object({
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional a favoritar')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
});

export const createReportBodySchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z
    .string()
    .uuid()
    .describe('ID do alvo')
    .openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000004' }),
  reason: reportReasonSchema,
  description: z
    .string()
    .min(3)
    .max(2000)
    .nullable()
    .default(null)
    .describe('Detalhes da denuncia')
    .openapi({ example: 'Mensagens ofensivas.' }),
});

export const createBlockBodySchema = z.object({
  blockedId: z
    .string()
    .uuid()
    .describe('Usuario a bloquear')
    .openapi({ example: 'e1b2c3d4-0000-4000-8000-000000000005' }),
});

export const favoriteResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'f1b2c3d4-0000-4000-8000-000000000006' }),
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criado em')
    .openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const reportResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'a2b2c3d4-0000-4000-8000-000000000007' }),
  status: reportStatusSchema,
});

export const blockResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'b3b2c3d4-0000-4000-8000-000000000008' }),
  blockedId: z
    .string()
    .uuid()
    .describe('Bloqueado')
    .openapi({ example: 'e1b2c3d4-0000-4000-8000-000000000005' }),
});

export const favoriteListResponseSchema = paginatedResponse(favoriteResponseSchema);
export const blockListResponseSchema = paginatedResponse(blockResponseSchema);

export type CreateFavoriteBody = z.infer<typeof createFavoriteBodySchema>;
export type CreateReportBody = z.infer<typeof createReportBodySchema>;
export type CreateBlockBody = z.infer<typeof createBlockBodySchema>;
export type FavoriteResponse = z.infer<typeof favoriteResponseSchema>;
export type ReportResponse = z.infer<typeof reportResponseSchema>;
export type BlockResponse = z.infer<typeof blockResponseSchema>;
