import { z } from 'zod';
import 'zod-openapi/extend';

export const paymentMethodEnum = z
  .enum(['wallet', 'credit_card', 'pix', 'boleto'])
  .describe('Metodo de pagamento')
  .openapi({ example: 'wallet' });

export const paymentStatusEnum = z
  .enum(['pending', 'authorized', 'captured', 'failed', 'refunded'])
  .describe('Estado do pagamento')
  .openapi({ example: 'captured' });

export const payContractSchema = z.object({
  method: paymentMethodEnum,
});

export const paymentResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID do pagamento')
    .openapi({ example: '7a8b9c0d-7777-4a7a-9a7a-777777777777' }),
  contractId: z
    .string()
    .uuid()
    .describe('Contrato pago')
    .openapi({ example: '8b9c0d1e-8888-4b8b-9b8b-888888888888' }),
  payerId: z
    .string()
    .uuid()
    .describe('Pagador')
    .openapi({ example: '9c0d1e2f-9999-4c9c-9c9c-999999999999' }),
  amount: z.number().describe('Valor pago').openapi({ example: 300 }),
  status: paymentStatusEnum,
  method: paymentMethodEnum,
  paidAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Data da captura')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type PayContractInput = z.infer<typeof payContractSchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
