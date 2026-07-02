import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFavorites, addFavorite, removeFavorite } from './api';

export const favoriteKeys = {
  list: (page: number) => ['favorites', page] as const,
};

export function useFavorites(page = 1) {
  return useQuery({ queryKey: favoriteKeys.list(page), queryFn: () => fetchFavorites(page) });
}

export function useFavoriteIds() {
  const { data } = useQuery({ queryKey: favoriteKeys.list(1), queryFn: () => fetchFavorites(1, 100) });
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
