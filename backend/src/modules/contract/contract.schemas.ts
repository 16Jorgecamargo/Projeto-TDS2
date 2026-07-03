import { z } from 'zod';
import 'zod-openapi/extend';

export const contractStatusEnum = z
  .enum(['active', 'completed', 'cancelled', 'disputed'])
  .describe('Estado do contrato')
  .openapi({ example: 'active' });

export const scheduleStatusEnum = z
  .enum(['scheduled', 'confirmed', 'completed', 'cancelled'])
  .describe('Estado do agendamento')
  .openapi({ example: 'scheduled' });

export const scheduleSchema = z.object({
  scheduledDate: z.string().datetime().describe('Data agendada').openapi({ example: '2026-07-05T09:00:00Z' }),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe('Duracao em minutos')
    .openapi({ example: 120 }),
  notes: z.string().max(500).nullable().describe('Observacoes').openapi({ example: null }),
});

export const acceptQuoteSchema = z.object({
  schedule: scheduleSchema.nullable().describe('Agendamento opcional').openapi({ example: null }),
});

export const progressUpdateSchema = z.object({
  description: z
    .string()
    .min(3)
    .max(1000)
    .describe('Descricao do progresso')
    .openapi({ example: 'Fase 1 concluida' }),
  percentage: z.number().int().min(0).max(100).describe('Percentual concluido').openapi({ example: 50 }),
  images: z.array(z.string().url()).max(10).describe('Imagens do progresso').openapi({ example: [] }),
});

export const cancelContractSchema = z.object({
  reason: z.string().min(3).max(1000).describe('Motivo do cancelamento').openapi({ example: 'Indisponibilidade' }),
});

export const scheduleResponseSchema = scheduleSchema.extend({
  id: z.string().uuid().describe('ID do agendamento').openapi({ example: '5a1c1111-1111-1111-1111-111111111111' }),
  status: scheduleStatusEnum,
});

export const contractResponseSchema = z.object({
  id: z.string().uuid().describe('ID do contrato').openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  demandId: z.string().uuid().describe('Demanda').openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
  quoteId: z.string().uuid().describe('Orcamento').openapi({ example: '5a1c1111-1111-1111-1111-111111111111' }),
  clientId: z.string().uuid().describe('Cliente').openapi({ example: '1a1c1111-1111-1111-1111-111111111111' }),
  professionalId: z.string().uuid().describe('Profissional').openapi({ example: '2a1c1111-1111-1111-1111-111111111111' }),
  total: z.number().describe('Valor total').openapi({ example: 300 }),
  status: contractStatusEnum,
  cancelledBy: z.string().uuid().nullable().describe('Quem cancelou').openapi({ example: null }),
  cancellationReason: z.string().nullable().describe('Motivo do cancelamento').openapi({ example: null }),
  startedAt: z.string().datetime().nullable().describe('Inicio').openapi({ example: null }),
  completedAt: z.string().datetime().nullable().describe('Conclusao').openapi({ example: null }),
  cancelledAt: z.string().datetime().nullable().describe('Cancelamento').openapi({ example: null }),
  schedule: scheduleResponseSchema.nullable().describe('Agendamento').openapi({ example: null }),
  clientName: z.string().describe('Nome do cliente').openapi({ example: 'Maria Cliente' }),
  professionalHeadline: z
    .string()
    .describe('Titulo do profissional')
    .openapi({ example: 'Eletricista Residencial' }),
  professionalUserId: z
    .string()
    .uuid()
    .describe('ID de usuario do profissional')
    .openapi({ example: '2b3c4d5e-2222-4b2b-8b2b-222222222222' }),
  createdAt: z.string().datetime().describe('Criacao').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const progressUpdateResponseSchema = z.object({
  id: z.string().uuid().describe('ID do progresso').openapi({ example: '4a1c1111-1111-1111-1111-111111111111' }),
  contractId: z.string().uuid().describe('Contrato').openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  authorId: z.string().uuid().describe('Autor').openapi({ example: '2a1c1111-1111-1111-1111-111111111111' }),
  description: z.string().describe('Descricao').openapi({ example: 'Fase 1 concluida' }),
  percentage: z.number().nullable().describe('Percentual').openapi({ example: 50 }),
  images: z.array(z.string().url()).describe('Imagens').openapi({ example: [] }),
  createdAt: z.string().datetime().describe('Criacao').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type CancelContractInput = z.infer<typeof cancelContractSchema>;
export type ContractResponse = z.infer<typeof contractResponseSchema>;
export type ProgressUpdateResponse = z.infer<typeof progressUpdateResponseSchema>;
