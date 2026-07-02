import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReports, resolveReport, fetchDisputes, resolveDispute } from './api';
import type { ReportResolution, DisputeOutcome } from './schemas';

export const adminKeys = {
  reports: (page: number) => ['admin', 'reports', page] as const,
  disputes: (page: number) => ['admin', 'disputes', page] as const,
};

export function useReports(page = 1) {
  return useQuery({
    queryKey: adminKeys.reports(page),
    queryFn: () => fetchReports(page),
  });
}

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution, note }: { id: string; resolution: ReportResolution; note?: string }) =>
      resolveReport(id, resolution, note),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

export function useDisputes(page = 1) {
  return useQuery({
    queryKey: adminKeys.disputes(page),
    queryFn: () => fetchDisputes(page),
  });
}

export function useResolveDispute() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome, note }: { id: string; outcome: DisputeOutcome; note: string }) =>
      resolveDispute(id, outcome, note),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
  });
}
