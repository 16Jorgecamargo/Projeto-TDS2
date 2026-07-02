import { http } from '../../lib/http';
import {
  reportsPageSchema,
  disputesPageSchema,
  type ReportsPage,
  type DisputesPage,
  type ReportResolution,
  type DisputeOutcome,
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
