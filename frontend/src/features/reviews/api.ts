import { http } from '../../lib/http';

export interface Review {
  id: string;
  contractId: string;
  authorId: string;
  authorName: string;
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

export interface CreateReviewInput {
  contractId: string;
  rating: number;
  comment: string;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data } = await http.post<Review>('/reviews', input);
  return data;
}
