import { z } from 'zod';
import 'zod-openapi/extend';
import { paginationQuerySchema, paginatedResponse } from '../../shared/schemas.js';

export const transactionTypeEnum = z
  .enum(['credit', 'debit', 'hold', 'release'])
  .describe('Tipo de movimentacao da carteira')
  .openapi({ example: 'credit' });

export const transactionReferenceTypeEnum = z
  .enum(['payment', 'withdrawal', 'refund', 'fee', 'adjustment'])
  .describe('Origem da movimentacao')
  .openapi({ example: 'payment' });

export const walletResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da carteira')
    .openapi({ example: '1a2b3c4d-1111-4a1a-8a1a-111111111111' }),
  userId: z
    .string()
    .uuid()
    .describe('Dono da carteira')
    .openapi({ example: '2b3c4d5e-2222-4b2b-8b2b-222222222222' }),
  balance: z.number().describe('Saldo disponivel').openapi({ example: 270 }),
  pendingBalance: z.number().describe('Saldo pendente').openapi({ example: 0 }),
  currency: z.string().describe('Moeda').openapi({ example: 'BRL' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
  updatedAt: z
    .string()
    .datetime()
    .describe('Atualizacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const walletTransactionResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da transacao')
    .openapi({ example: '3c4d5e6f-3333-4c3c-8c3c-333333333333' }),
  walletId: z
    .string()
    .uuid()
    .describe('Carteira')
    .openapi({ example: '1a2b3c4d-1111-4a1a-8a1a-111111111111' }),
  type: transactionTypeEnum,
  amount: z.number().describe('Valor movimentado').openapi({ example: 270 }),
  balanceAfter: z.number().describe('Saldo apos a movimentacao').openapi({ example: 270 }),
  referenceType: transactionReferenceTypeEnum
    .nullable()
    .describe('Origem')
    .openapi({ example: 'payment' }),
  referenceId: z
    .string()
    .uuid()
    .nullable()
    .describe('ID da origem')
    .openapi({ example: '4d5e6f7a-4444-4d4d-8d4d-444444444444' }),
  description: z
    .string()
    .nullable()
    .describe('Descricao')
    .openapi({ example: 'Pagamento de contrato' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const transactionListQuerySchema = paginationQuerySchema.extend({
  type: transactionTypeEnum.optional(),
});

export const transactionListResponseSchema = paginatedResponse(walletTransactionResponseSchema);

export type WalletResponse = z.infer<typeof walletResponseSchema>;
export type WalletTransactionResponse = z.infer<typeof walletTransactionResponseSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;
