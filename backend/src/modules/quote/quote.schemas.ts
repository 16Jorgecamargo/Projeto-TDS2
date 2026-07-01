import { z } from 'zod';
import 'zod-openapi/extend';

export const quoteStatusEnum = z
  .enum(['pending', 'accepted', 'rejected', 'withdrawn'])
  .describe('Estado do orcamento')
  .openapi({ example: 'pending' });

export const quoteItemSchema = z.object({
  description: z
    .string()
    .min(2)
    .max(200)
    .describe('Item do orcamento')
    .openapi({ example: 'Mao de obra' }),
  quantity: z
    .number()
    .int()
    .positive()
    .describe('Quantidade')
    .openapi({ example: 2 }),
  unitPrice: z
    .number()
    .nonnegative()
    .describe('Preco unitario')
    .openapi({ example: 150 }),
});

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
  items: z
    .array(quoteItemSchema)
    .min(1)
    .max(50)
    .describe('Itens do orcamento')
    .openapi({ example: [] }),
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
  items: z
    .array(
      quoteItemSchema.extend({
        subtotal: z.number().describe('Subtotal do item').openapi({ example: 300 }),
      }),
    )
    .describe('Itens')
    .openapi({ example: [] }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
