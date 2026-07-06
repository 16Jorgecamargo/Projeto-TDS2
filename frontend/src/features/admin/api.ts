import { z } from 'zod';
import { http } from '../../lib/http';
import {
  reportsPageSchema,
  disputesPageSchema,
  adminUsersPageSchema,
  auditLogsPageSchema,
  categorySchema,
  tagSchema,
  paymentsPageSchema,
  withdrawalsPageSchema,
  type ReportsPage,
  type DisputesPage,
  type ReportResolution,
  type DisputeOutcome,
  type AdminUsersPage,
  type AuditLogsPage,
  type UserStatus,
  type UserRole,
  type Category,
  type Tag,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateTagInput,
  type PaymentStatus,
  type WithdrawalStatus,
  type PaymentsPage,
  type WithdrawalsPage,
} from './schemas';

export async function fetchReports(page = 1, limit = 20): Promise<ReportsPage> {
  const { data } = await http.get('/admin/reports', { params: { page, limit } });
  return reportsPageSchema.parse(data);
}

export async function resolveReport(id: string, resolution: ReportResolution, note?: string): Promise<void> {
  await http.patch(`/admin/reports/${id}`, { resolution, note });
}

export async function fetchDisputes(page = 1, limit = 20): Promise<DisputesPage> {
  const { data } = await http.get('/admin/disputes', { params: { page, limit } });
  return disputesPageSchema.parse(data);
}

export async function resolveDispute(id: string, outcome: DisputeOutcome, note: string): Promise<void> {
  await http.patch(`/admin/disputes/${id}`, { outcome, note });
}

export interface FetchUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export async function fetchUsers(params: FetchUsersParams = {}): Promise<AdminUsersPage> {
  const { page = 1, limit = 20, search, role, status } = params;
  const { data } = await http.get('/admin/users', { params: { page, limit, search, role, status } });
  return adminUsersPageSchema.parse(data);
}

export async function setUserStatus(id: string, status: UserStatus, reason: string): Promise<void> {
  await http.patch(`/admin/users/${id}/status`, { status, reason });
}

export interface FetchAuditParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
}

export async function fetchAudit(params: FetchAuditParams = {}): Promise<AuditLogsPage> {
  const { page = 1, limit = 20, userId, action } = params;
  const { data } = await http.get('/admin/audit', { params: { page, limit, userId, action } });
  return auditLogsPageSchema.parse(data);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await http.get('/categories');
  return z.array(categorySchema).parse(data);
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data } = await http.post('/categories', input);
  return categorySchema.parse(data);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const { data } = await http.patch(`/categories/${id}`, input);
  return categorySchema.parse(data);
}

export async function fetchTags(): Promise<Tag[]> {
  const { data } = await http.get('/tags');
  return z.array(tagSchema).parse(data);
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const { data } = await http.post('/tags', input);
  return tagSchema.parse(data);
}

export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
}

export async function fetchPayments(params: FetchPaymentsParams = {}): Promise<PaymentsPage> {
  const { page = 1, limit = 20, status } = params;
  const { data } = await http.get('/admin/payments', { params: { page, limit, status } });
  return paymentsPageSchema.parse(data);
}

export async function refundPayment(id: string, reason: string | null): Promise<void> {
  await http.post(`/payments/${id}/refund`, { reason });
}

export interface FetchWithdrawalsParams {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
}

export async function fetchWithdrawals(params: FetchWithdrawalsParams = {}): Promise<WithdrawalsPage> {
  const { page = 1, limit = 20, status } = params;
  const { data } = await http.get('/admin/withdrawals', { params: { page, limit, status } });
  return withdrawalsPageSchema.parse(data);
}

export async function processWithdrawal(id: string): Promise<void> {
  await http.post(`/withdrawals/${id}/process`);
}
