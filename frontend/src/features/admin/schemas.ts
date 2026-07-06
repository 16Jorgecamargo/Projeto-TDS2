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

export const userStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export const userRoleSchema = z.enum(['client', 'professional', 'admin']);

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  created_at: z.string(),
});

export const adminUsersPageSchema = z.object({
  items: z.array(adminUserSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  createdAt: z.string(),
});

export const auditLogsPageSchema = z.object({
  items: z.array(auditLogSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUsersPage = z.infer<typeof adminUsersPageSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogsPage = z.infer<typeof auditLogsPageSchema>;

export const categorySchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const createCategoryInputSchema = z.object({
  parentId: z.string().uuid().nullable(),
  name: z.string().min(2).max(128),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  icon: z.string().max(128).nullable(),
  description: z.string().max(2000).nullable(),
});

export const updateCategoryInputSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  icon: z.string().max(128).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createTagInputSchema = z.object({
  name: z.string().min(2).max(128),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
});

export type Category = z.infer<typeof categorySchema>;
export type Tag = z.infer<typeof tagSchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type CreateTagInput = z.infer<typeof createTagInputSchema>;
