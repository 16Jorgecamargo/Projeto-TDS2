import { z } from 'zod';
import 'zod-openapi/extend';

export const portfolioItemSchema = z.object({
  categoryId: z.string().uuid().nullable().describe('Categoria relacionada').openapi({ example: null }),
  title: z.string().min(2).max(255).describe('Titulo do trabalho').openapi({ example: 'Reforma de banheiro' }),
  description: z.string().max(2000).nullable().describe('Descricao').openapi({ example: 'Troca completa de revestimento' }),
  completedAt: z.string().date().nullable().describe('Concluido em (YYYY-MM-DD)').openapi({ example: '2026-05-01' }),
});

export const updatePortfolioItemSchema = portfolioItemSchema.partial();

export const portfolioItemResponseSchema = portfolioItemSchema.extend({
  id: z.string().uuid().describe('ID do item').openapi({ example: '8b9c1111-1111-1111-1111-111111111111' }),
  images: z
    .array(
      z.object({
        id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
        imageUrl: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/img.jpg' }),
        position: z.number().int().describe('Posicao').openapi({ example: 0 }),
      }),
    )
    .describe('Imagens do item')
    .openapi({ example: [] }),
});

export const portfolioImageSchema = z.object({
  imageUrl: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/img.jpg' }),
  position: z.number().int().min(0).describe('Posicao de exibicao').openapi({ example: 0 }),
});

export const portfolioImageResponseSchema = portfolioImageSchema.extend({
  id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
export type PortfolioItemResponse = z.infer<typeof portfolioItemResponseSchema>;
export type PortfolioImageInput = z.infer<typeof portfolioImageSchema>;
export type PortfolioImageResponse = z.infer<typeof portfolioImageResponseSchema>;
