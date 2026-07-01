import { z } from 'zod';
import 'zod-openapi/extend';
import { paginationQuerySchema } from '../../shared/schemas.js';

export const searchQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional().describe('Filtrar por categoria').openapi({ example: undefined }),
  city: z.string().min(2).max(128).optional().describe('Filtrar por cidade').openapi({ example: 'Porto Alegre' }),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional()
    .describe('Filtrar por UF')
    .openapi({ example: 'RS' }),
  q: z.string().min(2).max(120).optional().describe('Busca textual no titulo/bio').openapi({ example: 'eletricista' }),
});

export const searchResultItemSchema = z.object({
  id: z.string().uuid().describe('ID do perfil profissional').openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  headline: z.string().describe('Titulo').openapi({ example: 'Eletricista residencial' }),
  bio: z.string().nullable().describe('Biografia').openapi({ example: null }),
  hourlyRate: z.number().nullable().describe('Valor por hora').openapi({ example: 120 }),
  ratingAverage: z.number().describe('Media de avaliacoes').openapi({ example: 4.8 }),
  ratingCount: z.number().int().describe('Total de avaliacoes').openapi({ example: 42 }),
  isAvailable: z.boolean().describe('Disponivel').openapi({ example: true }),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
