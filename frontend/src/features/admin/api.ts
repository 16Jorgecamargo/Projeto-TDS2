import { http } from '../../lib/http';
import {
  reportsPageSchema,
  disputesPageSchema,
  adminUsersPageSchema,
  auditLogsPageSchema,
  type ReportsPage,
  type DisputesPage,
  type ReportResolution,
  type DisputeOutcome,
  type AdminUsersPage,
  type AuditLogsPage,
  type UserStatus,
  type UserRole,
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
