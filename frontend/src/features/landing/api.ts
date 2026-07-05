import { http } from '../../lib/http';

export interface SearchResultItem {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  categories: string[];
}

export interface Location {
  city: string;
  state: string;
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
  async listLocations(): Promise<Location[]> {
    const { data } = await http.get<Location[]>('/search/locations');
    return data;
  },
};
