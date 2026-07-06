import { z } from 'zod';
import 'zod-openapi/extend';

export const quoteStatusEnum = z
  .enum(['pending', 'accepted', 'rejected', 'withdrawn'])
  .describe('Estado do orcamento')
  .openapi({ example: 'pending' });

export const createQuoteSchema = z.object({
  message: z
    .string()
    .min(5)
    .max(2000)
    .describe('Mensagem ao cliente')
    .openapi({ example: 'Posso fazer na quinta.' }),
  validUntil: z
    .string()
    .datetime()
    .nullable()
    .describe('Validade do orcamento')
    .openapi({ example: '2026-07-10T00:00:00Z' }),
  total: z
    .number()
    .positive()
    .describe('Valor total do orcamento')
    .openapi({ example: 350 }),
});

export const quoteResponseSchema = z.object({
  id: z.string().uuid().describe('ID do orcamento').openapi({ example: '5a1c1111-1111-1111-1111-111111111111' }),
  demandId: z
    .string()
    .uuid()
    .describe('Demanda')
    .openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional')
    .openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
  message: z.string().nullable().describe('Mensagem').openapi({ example: 'Posso fazer na quinta.' }),
  total: z.number().describe('Total do orcamento').openapi({ example: 350 }),
  status: quoteStatusEnum,
  validUntil: z
    .string()
    .datetime()
    .nullable()
    .describe('Validade')
    .openapi({ example: null }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const myQuoteResponseSchema = quoteResponseSchema.extend({
  demandTitle: z.string().describe('Titulo da demanda').openapi({ example: 'Instalacao eletrica' }),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type MyQuoteResponse = z.infer<typeof myQuoteResponseSchema>;
