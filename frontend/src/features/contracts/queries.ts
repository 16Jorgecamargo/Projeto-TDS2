import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchContracts,
  fetchContract,
  fetchProgress,
  addProgress,
  completeContract,
  openDispute,
} from './api';

export const contractKeys = {
  all: ['contracts'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  progress: (id: string) => ['contracts', id, 'progress'] as const,
};

export function useContracts() {
  return useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });
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
