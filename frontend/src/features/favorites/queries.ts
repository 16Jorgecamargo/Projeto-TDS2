import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFavorites, addFavorite, removeFavorite } from './api';

const FAVORITES_LIST_LIMIT = 20;
const FAVORITE_IDS_LIMIT = 100;

export const favoriteKeys = {
  list: (page: number, limit: number) => ['favorites', page, limit] as const,
};

export function useFavorites(page = 1) {
  return useQuery({
    queryKey: favoriteKeys.list(page, FAVORITES_LIST_LIMIT),
    queryFn: () => fetchFavorites(page),
  });
}

export function useFavoriteIds() {
  const { data } = useQuery({
    queryKey: favoriteKeys.list(1, FAVORITE_IDS_LIMIT),
    queryFn: () => fetchFavorites(1, FAVORITE_IDS_LIMIT),
  });
  return useMemo(() => new Set((data?.items ?? []).map((item) => item.professionalId)), [data]);
}

export function useAddFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (professionalId: string) => addFavorite(professionalId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useRemoveFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (professionalId: string) => removeFavorite(professionalId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorites'] }),
  });
}
