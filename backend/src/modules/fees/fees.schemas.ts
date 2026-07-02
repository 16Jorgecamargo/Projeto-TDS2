import { z } from 'zod';
import 'zod-openapi/extend';

export const platformFeeResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da taxa')
    .openapi({ example: '5e6f7a8b-5555-4e5e-8e5e-555555555555' }),
  paymentId: z
    .string()
    .uuid()
    .describe('Pagamento')
    .openapi({ example: '6f7a8b9c-6666-4f6f-8f6f-666666666666' }),
  percentage: z.number().describe('Percentual aplicado').openapi({ example: 10 }),
  amount: z.number().describe('Valor da taxa').openapi({ example: 30 }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type PlatformFeeResponse = z.infer<typeof platformFeeResponseSchema>;
