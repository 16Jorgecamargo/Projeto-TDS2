import { z } from 'zod';
import 'zod-openapi/extend';

export const refundStatusEnum = z
  .enum(['pending', 'completed', 'failed'])
  .describe('Estado do estorno')
  .openapi({ example: 'completed' });

export const createRefundSchema = z.object({
  reason: z
    .string()
    .min(3)
    .max(1000)
    .nullable()
    .describe('Motivo do estorno')
    .openapi({ example: 'Servico nao executado' }),
});

export const refundResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID do estorno')
    .openapi({ example: 'a1b2c3d4-1111-4a1a-9a1a-111111111111' }),
  paymentId: z
    .string()
    .uuid()
    .describe('Pagamento estornado')
    .openapi({ example: '7a8b9c0d-7777-4a7a-9a7a-777777777777' }),
  amount: z.number().describe('Valor estornado').openapi({ example: 300 }),
  reason: z
    .string()
    .nullable()
    .describe('Motivo')
    .openapi({ example: 'Servico nao executado' }),
  status: refundStatusEnum,
  processedAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Processamento')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type RefundResponse = z.infer<typeof refundResponseSchema>;
