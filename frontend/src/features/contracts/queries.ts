import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchContracts,
  fetchContract,
  fetchProgress,
  addProgress,
  startContract,
  completeContract,
  openDispute,
  fetchPayment,
  payContract,
  type PaymentMethod,
} from './api';

export const contractKeys = {
  all: ['contracts'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  progress: (id: string) => ['contracts', id, 'progress'] as const,
  payment: (id: string) => ['contracts', id, 'payment'] as const,
};

export function useContracts(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts, enabled: options?.enabled });
}

export function useContract(id: string) {
  return useQuery({ queryKey: contractKeys.detail(id), queryFn: () => fetchContract(id), enabled: !!id });
}

export function useContractProgress(id: string) {
  return useQuery({ queryKey: contractKeys.progress(id), queryFn: () => fetchProgress(id), enabled: !!id });
}

export function useAddProgress(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: { description: string; percentage: number }) => addProgress(id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.progress(id) }),
  });
}

export function useStartContract(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => startContract(id),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function useCompleteContract(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => completeContract(id),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function useOpenDispute(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => openDispute(id, reason),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function usePayment(contractId: string) {
  return useQuery({
    queryKey: contractKeys.payment(contractId),
    queryFn: () => fetchPayment(contractId),
    enabled: !!contractId,
  });
}

export function usePayContract(contractId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (method: PaymentMethod) => payContract(contractId, method),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: contractKeys.payment(contractId) });
      client.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    },
  });
}
