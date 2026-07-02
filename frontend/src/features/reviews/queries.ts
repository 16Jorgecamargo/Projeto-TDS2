import { useQuery } from '@tanstack/react-query';
import { fetchProfessionalReviews } from './api';

export const reviewKeys = {
  list: (professionalId: string | undefined, page: number) => ['reviews', professionalId, page] as const,
};

export function useProfessionalReviews(professionalId: string | undefined, page = 1) {
  return useQuery({
    queryKey: reviewKeys.list(professionalId, page),
    queryFn: () => fetchProfessionalReviews(professionalId as string, page),
    enabled: Boolean(professionalId),
  });
}
