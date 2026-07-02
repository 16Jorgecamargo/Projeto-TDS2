import { z } from 'zod';

export const reportStatusSchema = z.enum(['pending', 'reviewed', 'dismissed', 'actioned']);
export const reportResolutionSchema = z.enum(['reviewed', 'dismissed', 'actioned']);

export const disputeStatusSchema = z.enum(['open', 'under_review', 'resolved', 'rejected']);
export const disputeOutcomeSchema = z.enum(['refund_client', 'release_professional', 'split']);

export const adminReportSchema = z.object({
  id: z.string().uuid(),
  status: reportStatusSchema,
});

export const adminDisputeSchema = z.object({
  id: z.string().uuid(),
  status: disputeStatusSchema,
  outcome: disputeOutcomeSchema.nullable(),
});

export const reportsPageSchema = z.object({
  items: z.array(adminReportSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export const disputesPageSchema = z.object({
  items: z.array(adminDisputeSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportResolution = z.infer<typeof reportResolutionSchema>;
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;
export type DisputeOutcome = z.infer<typeof disputeOutcomeSchema>;
export type AdminReport = z.infer<typeof adminReportSchema>;
export type AdminDispute = z.infer<typeof adminDisputeSchema>;
export type ReportsPage = z.infer<typeof reportsPageSchema>;
export type DisputesPage = z.infer<typeof disputesPageSchema>;
