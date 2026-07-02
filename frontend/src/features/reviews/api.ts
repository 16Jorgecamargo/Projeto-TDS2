import { http } from '../../lib/http';

export interface Review {
  id: string;
  contractId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchProfessionalReviews(
  professionalId: string,
  page = 1,
  limit = 20,
): Promise<Paginated<Review>> {
  const { data } = await http.get<Paginated<Review>>(`/professionals/${professionalId}/reviews`, {
    params: { page, limit },
  });
  return data;
}
