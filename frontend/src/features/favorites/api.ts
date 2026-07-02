import { http } from '../../lib/http';

export interface Favorite {
  id: string;
  professionalId: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchFavorites(page = 1, limit = 20): Promise<Paginated<Favorite>> {
  const { data } = await http.get<Paginated<Favorite>>('/favorites', { params: { page, limit } });
  return data;
}

export async function addFavorite(professionalId: string): Promise<Favorite> {
  const { data } = await http.post<Favorite>('/favorites', { professionalId });
  return data;
}

export async function removeFavorite(professionalId: string): Promise<void> {
  await http.delete(`/favorites/${professionalId}`);
}
