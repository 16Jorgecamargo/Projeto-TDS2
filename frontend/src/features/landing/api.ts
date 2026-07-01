import { http } from '../../lib/http';

export interface SearchResultItem {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
}

export interface SearchResponse {
  items: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}

export interface SearchParams {
  q?: string;
  city?: string;
  state?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export const landingApi = {
  async searchProfessionals(params: SearchParams): Promise<SearchResponse> {
    const { data } = await http.get<SearchResponse>('/search/professionals', { params });
    return data;
  },
};
