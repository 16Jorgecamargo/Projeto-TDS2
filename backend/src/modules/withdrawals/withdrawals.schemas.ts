import { z } from 'zod';
import 'zod-openapi/extend';

export const withdrawalMethodEnum = z
  .enum(['pix', 'bank_transfer'])
  .describe('Metodo do saque')
  .openapi({ example: 'pix' });

export const withdrawalStatusEnum = z
  .enum(['pending', 'processing', 'completed', 'failed'])
  .describe('Estado do saque')
  .openapi({ example: 'pending' });

export const requestWithdrawalSchema = z.object({
  amount: z.number().positive().describe('Valor do saque').openapi({ example: 200 }),
  paymentMethod: withdrawalMethodEnum,
  destination: z
    .string()
    .min(3)
    .max(255)
    .describe('Destino (chave PIX ou dados bancarios)')
    .openapi({ example: 'user@pix.com' }),
});

export const withdrawalResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID do saque')
    .openapi({ example: 'b1c2d3e4-2222-4b2b-9b2b-222222222222' }),
  walletId: z
    .string()
    .uuid()
    .describe('Carteira de origem')
    .openapi({ example: 'a1b2c3d4-1111-4a1a-9a1a-111111111111' }),
  amount: z.number().describe('Valor').openapi({ example: 200 }),
  paymentMethod: withdrawalMethodEnum,
  status: withdrawalStatusEnum,
  destination: z.string().describe('Destino').openapi({ example: 'user@pix.com' }),
  processedAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Processamento')
    .openapi({ example: null }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
export type WithdrawalResponse = z.infer<typeof withdrawalResponseSchema>;
