import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const userStatusSchema = z
  .enum(['active', 'suspended', 'deleted'])
  .describe('Status de moderacao do usuario')
  .openapi({ example: 'suspended' });

export const setUserStatusBodySchema = z.object({
  status: userStatusSchema,
  reason: z
    .string()
    .min(3)
    .max(500)
    .describe('Justificativa')
    .openapi({ example: 'Violacao das diretrizes' }),
});

export const reportStatusSchema = z
  .enum(['pending', 'reviewed', 'dismissed', 'actioned'])
  .describe('Status da denuncia')
  .openapi({ example: 'actioned' });

export const resolveReportBodySchema = z.object({
  resolution: z
    .enum(['reviewed', 'dismissed', 'actioned'])
    .describe('Desfecho')
    .openapi({ example: 'actioned' }),
  note: z
    .string()
    .max(1000)
    .optional()
    .describe('Nota interna')
    .openapi({ example: 'Usuario advertido' }),
});

export const disputeStatusSchema = z
  .enum(['open', 'under_review', 'resolved', 'rejected'])
  .describe('Status da disputa')
  .openapi({ example: 'resolved' });

export const disputeOutcomeSchema = z
  .enum(['refund_client', 'release_professional', 'split'])
  .describe('Resultado da disputa')
  .openapi({ example: 'refund_client' });

export const resolveDisputeBodySchema = z.object({
  outcome: disputeOutcomeSchema,
  note: z
    .string()
    .min(3)
    .max(1000)
    .describe('Fundamentacao')
    .openapi({ example: 'Servico nao entregue' }),
});

export const adminUserResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'u1b2c3d4-0000-4000-8000-000000000040' }),
  status: userStatusSchema,
});

export const adminReportResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000041' }),
  status: reportStatusSchema,
});

export const adminDisputeResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000042' }),
  status: disputeStatusSchema,
  outcome: disputeOutcomeSchema.nullable().describe('Resultado').openapi({ example: 'refund_client' }),
});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina').openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Itens por pagina').openapi({ example: 20 }),
  status: z.string().optional().describe('Filtro por status').openapi({ example: 'pending' }),
});

export const adminAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina').openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Itens por pagina').openapi({ example: 20 }),
  userId: z.string().uuid().optional().describe('Filtro por usuario').openapi({ example: 'u1b2c3d4-0000-4000-8000-000000000040' }),
  action: z.string().optional().describe('Filtro por acao').openapi({ example: 'admin.user.status_changed' }),
});

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina').openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Itens por pagina').openapi({ example: 20 }),
  search: z
    .string()
    .optional()
    .describe('Busca por nome ou email')
    .openapi({ example: 'joao' }),
  role: z
    .enum(['client', 'professional', 'admin'])
    .optional()
    .describe('Filtro por papel')
    .openapi({ example: 'client' }),
  status: userStatusSchema.optional(),
});

export const adminUserListItemSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'u1b2c3d4-0000-4000-8000-000000000040' }),
  full_name: z.string().describe('Nome completo').openapi({ example: 'Joao Silva' }),
  email: z.string().describe('Email').openapi({ example: 'joao@example.com' }),
  role: z.enum(['client', 'professional', 'admin']).describe('Papel'),
  status: userStatusSchema,
  created_at: z.string().datetime().describe('Data de cadastro'),
});

export const adminUserListResponseSchema = paginatedResponse(adminUserListItemSchema);

export const paymentStatusSchema = z
  .enum(['pending', 'authorized', 'captured', 'failed', 'refunded'])
  .describe('Status do pagamento')
  .openapi({ example: 'captured' });

export const adminPaymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina').openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Itens por pagina').openapi({ example: 20 }),
  status: paymentStatusSchema.optional(),
});

export const adminPaymentListItemSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'p1b2c3d4-0000-4000-8000-000000000050' }),
  contract_id: z.string().uuid().describe('Contrato'),
  payer_id: z.string().uuid().describe('Pagador'),
  amount: z.string().describe('Valor').openapi({ example: '150.00' }),
  status: paymentStatusSchema,
  method: z.enum(['wallet', 'credit_card', 'pix', 'boleto']).describe('Metodo'),
  paid_at: z.string().datetime().nullable().describe('Pago em'),
  created_at: z.string().datetime().describe('Criado em'),
});

export const adminPaymentListResponseSchema = paginatedResponse(adminPaymentListItemSchema);

export const withdrawalMethodSchema = z.enum(['pix', 'bank_transfer']).describe('Metodo de saque');
export const withdrawalStatusSchema = z
  .enum(['pending', 'processing', 'completed', 'failed'])
  .describe('Status do saque')
  .openapi({ example: 'pending' });

export const adminWithdrawalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina').openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Itens por pagina').openapi({ example: 20 }),
  status: withdrawalStatusSchema.optional(),
});

export const adminWithdrawalListItemSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'w1b2c3d4-0000-4000-8000-000000000060' }),
  wallet_id: z.string().uuid().describe('Carteira'),
  amount: z.string().describe('Valor').openapi({ example: '200.00' }),
  payment_method: withdrawalMethodSchema,
  status: withdrawalStatusSchema,
  destination: z.string().describe('Destino'),
  processed_at: z.string().datetime().nullable().describe('Processado em'),
  created_at: z.string().datetime().describe('Solicitado em'),
});

export const adminWithdrawalListResponseSchema = paginatedResponse(adminWithdrawalListItemSchema);

export const adminReportListResponseSchema = paginatedResponse(adminReportResponseSchema);
export const adminDisputeListResponseSchema = paginatedResponse(adminDisputeResponseSchema);

export const dashboardCounterSchema = z.object({
  totalUsers: z.number().int().describe('Total de usuarios cadastrados'),
  activeContracts: z.number().int().describe('Contratos com status ativo'),
  openDemands: z.number().int().describe('Demandas com status aberto'),
  gmvLast30Days: z.string().describe('GMV liquido dos ultimos 30 dias').openapi({ example: '15320.50' }),
});

export const dashboardPendingSchema = z.object({
  reports: z.number().int().describe('Denuncias pendentes'),
  disputes: z.number().int().describe('Disputas em aberto ou em revisao'),
  withdrawals: z.number().int().describe('Saques pendentes'),
});

export const dashboardActivityPointSchema = z.object({
  date: z.string().describe('Data no formato YYYY-MM-DD').openapi({ example: '2026-07-01' }),
  count: z.number().int(),
});

export const dashboardActivitySchema = z.object({
  newUsersByDay: z.array(dashboardActivityPointSchema),
  completedContractsByDay: z.array(dashboardActivityPointSchema),
});

export const dashboardFinanceSchema = z.object({
  totalCaptured30d: z.string().describe('Total capturado nos ultimos 30 dias').openapi({ example: '18000.00' }),
  totalRefunded30d: z.string().describe('Total estornado nos ultimos 30 dias').openapi({ example: '2679.50' }),
  walletBalanceSum: z.string().describe('Soma dos saldos de todas as carteiras').openapi({ example: '9450.00' }),
  pendingWithdrawalsAmount: z.string().describe('Soma dos saques pendentes').openapi({ example: '1200.00' }),
});

export const adminDashboardResponseSchema = z.object({
  counters: dashboardCounterSchema,
  pending: dashboardPendingSchema,
  activity: dashboardActivitySchema,
  finance: dashboardFinanceSchema,
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type SetUserStatusBody = z.infer<typeof setUserStatusBodySchema>;
export type ResolveReportBody = z.infer<typeof resolveReportBodySchema>;
export type DisputeOutcome = z.infer<typeof disputeOutcomeSchema>;
export type ResolveDisputeBody = z.infer<typeof resolveDisputeBodySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;
export type AdminReportResponse = z.infer<typeof adminReportResponseSchema>;
export type AdminDisputeResponse = z.infer<typeof adminDisputeResponseSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;
export type AdminPaymentListItem = z.infer<typeof adminPaymentListItemSchema>;
export type AdminWithdrawalListQuery = z.infer<typeof adminWithdrawalListQuerySchema>;
export type AdminWithdrawalListItem = z.infer<typeof adminWithdrawalListItemSchema>;
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;
