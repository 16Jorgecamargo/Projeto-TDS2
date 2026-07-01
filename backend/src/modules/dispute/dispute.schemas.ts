import { z } from 'zod';
import 'zod-openapi/extend';

export const disputeStatusEnum = z
  .enum(['open', 'under_review', 'resolved', 'rejected'])
  .describe('Estado da disputa')
  .openapi({ example: 'open' });

export const openDisputeSchema = z.object({
  reason: z.string().min(10).max(2000).describe('Motivo da disputa').openapi({ example: 'Servico nao concluido' }),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['resolved', 'rejected']).describe('Resolucao').openapi({ example: 'resolved' }),
  resolution: z.string().min(3).max(2000).describe('Descricao da resolucao').openapi({ example: 'Reembolso parcial' }),
});

export const disputeResponseSchema = z.object({
  id: z.string().uuid().describe('ID da disputa').openapi({ example: '6a1c1111-1111-1111-1111-111111111111' }),
  contractId: z.string().uuid().describe('Contrato').openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  openedBy: z.string().uuid().describe('Quem abriu').openapi({ example: '1a1c1111-1111-1111-1111-111111111111' }),
  reason: z.string().describe('Motivo').openapi({ example: 'Servico nao concluido' }),
  status: disputeStatusEnum,
  resolution: z.string().nullable().describe('Resolucao').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criacao').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type DisputeResponse = z.infer<typeof disputeResponseSchema>;
