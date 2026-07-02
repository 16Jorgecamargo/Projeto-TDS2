import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams } from './api';

export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}
