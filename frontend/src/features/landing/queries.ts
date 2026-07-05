import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams, type SearchResultItem } from './api';

export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}

export function useFeaturedProfessionals(limit = 3) {
  return useQuery({
    queryKey: ['landing', 'search', { limit: 12 }],
    queryFn: () => landingApi.searchProfessionals({ limit: 12 }),
    select: (data): SearchResultItem[] =>
      [...data.items].sort((a, b) => b.ratingAverage - a.ratingAverage).slice(0, limit),
  });
}

export function useTotalProfessionalsCount() {
  return useQuery({
    queryKey: ['landing', 'search', { limit: 1 }],
    queryFn: () => landingApi.searchProfessionals({ limit: 1 }),
    select: (data): number => data.total,
  });
}
