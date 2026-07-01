import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { professionalApi } from './api';

const keys = {
  myProfile: ['professional', 'me'] as const,
  categories: ['catalog', 'categories'] as const,
  tags: ['catalog', 'tags'] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: keys.myProfile, queryFn: professionalApi.getMyProfile, retry: false });
}

export function useUpsertProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.upsertProfile,
    onSuccess: (data) => client.setQueryData(keys.myProfile, data),
  });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: professionalApi.listPublicCategories });
}

export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: professionalApi.listPublicTags });
}

export function useSetCategories() {
  return useMutation({ mutationFn: professionalApi.setCategories });
}

export function useSetTags() {
  return useMutation({ mutationFn: professionalApi.setTags });
}
