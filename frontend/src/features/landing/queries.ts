import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams, type SearchResultItem } from './api';

export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}

const PROFESSIONALS_BASE_LIMIT = 12;
const professionalsBaseQueryKey = ['landing', 'professionals-base', PROFESSIONALS_BASE_LIMIT] as const;

function professionalsBaseQueryFn() {
  return landingApi.searchProfessionals({ limit: PROFESSIONALS_BASE_LIMIT });
}

export function useFeaturedProfessionals(limit = 3) {
  return useQuery({
    queryKey: professionalsBaseQueryKey,
    queryFn: professionalsBaseQueryFn,
    select: (data): SearchResultItem[] =>
      [...data.items].sort((a, b) => b.ratingAverage - a.ratingAverage).slice(0, limit),
  });
}

export function useTotalProfessionalsCount() {
  return useQuery({
    queryKey: professionalsBaseQueryKey,
    queryFn: professionalsBaseQueryFn,
    select: (data): number => data.total,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['landing', 'locations'],
    queryFn: landingApi.listLocations,
    staleTime: 5 * 60 * 1000,
  });
}
