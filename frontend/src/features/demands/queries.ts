import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDemands,
  fetchDemand,
  publishDemand,
  deleteDemand,
  fetchDemandQuotes,
  acceptQuote,
  inviteProfessional,
  createQuote,
} from './api';
import type { DemandFormValues, QuoteFormValues } from './schemas';

export const demandKeys = {
  all: ['demands'] as const,
  list: (mine?: boolean) => ['demands', 'list', { mine }] as const,
  detail: (id: string) => ['demands', 'detail', id] as const,
  quotes: (id: string) => ['demands', id, 'quotes'] as const,
};

export function useDemands(mine?: boolean, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: demandKeys.list(mine),
    queryFn: () => fetchDemands({ mine }),
    enabled: options?.enabled ?? true,
  });
}

export function useDemand(id: string) {
  return useQuery({ queryKey: demandKeys.detail(id), queryFn: () => fetchDemand(id), enabled: !!id });
}

export function usePublishDemand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { values: DemandFormValues; images: string[] }) => publishDemand(input.values, input.images),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.all }),
  });
}

export function useDeleteDemand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDemand(id),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.all }),
  });
}

export function useDemandQuotes(id: string) {
  return useQuery({ queryKey: demandKeys.quotes(id), queryFn: () => fetchDemandQuotes(id), enabled: !!id });
}

export function useAcceptQuote(demandId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => acceptQuote(quoteId),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.detail(demandId) }),
  });
}

export function useInviteProfessional(demandId: string) {
  return useMutation({
    mutationFn: (professionalId: string) => inviteProfessional(demandId, professionalId),
  });
}

export function useCreateQuote(demandId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: QuoteFormValues) => createQuote(demandId, values),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.quotes(demandId) }),
  });
}
