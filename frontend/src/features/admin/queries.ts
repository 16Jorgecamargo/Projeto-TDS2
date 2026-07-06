import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchReports,
  resolveReport,
  fetchDisputes,
  resolveDispute,
  fetchUsers,
  setUserStatus,
  fetchAudit,
  fetchCategories,
  createCategory,
  updateCategory,
  fetchTags,
  createTag,
  fetchPayments,
  refundPayment,
  fetchWithdrawals,
  processWithdrawal,
  type FetchUsersParams,
  type FetchAuditParams,
  type FetchPaymentsParams,
  type FetchWithdrawalsParams,
} from './api';
import type { ReportResolution, DisputeOutcome, UserStatus, CreateCategoryInput, UpdateCategoryInput, CreateTagInput } from './schemas';

export const adminKeys = {
  reports: (page: number) => ['admin', 'reports', page] as const,
  disputes: (page: number) => ['admin', 'disputes', page] as const,
};

export const adminUsersKeys = {
  users: (params: FetchUsersParams) => ['admin', 'users', params] as const,
  audit: (params: FetchAuditParams) => ['admin', 'audit', params] as const,
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

export function useUsers(params: FetchUsersParams = {}) {
  return useQuery({
    queryKey: adminUsersKeys.users(params),
    queryFn: () => fetchUsers(params),
  });
}

export function useSetUserStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: UserStatus; reason: string }) =>
      setUserStatus(id, status, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAudit(params: FetchAuditParams = {}) {
  return useQuery({
    queryKey: adminUsersKeys.audit(params),
    queryFn: () => fetchAudit(params),
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: fetchCategories });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });
}

export function useUpdateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => updateCategory(id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });
}

export function useTags() {
  return useQuery({ queryKey: ['admin', 'tags'], queryFn: fetchTags });
}

export function useCreateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => createTag(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });
}

export function usePayments(params: FetchPaymentsParams = {}) {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => fetchPayments(params),
  });
}

export function useRefundPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) => refundPayment(id, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
  });
}

export function useWithdrawals(params: FetchWithdrawalsParams = {}) {
  return useQuery({
    queryKey: ['admin', 'withdrawals', params],
    queryFn: () => fetchWithdrawals(params),
  });
}

export function useProcessWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processWithdrawal(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
    },
  });
}
