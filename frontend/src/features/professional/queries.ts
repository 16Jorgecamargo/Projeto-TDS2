import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { professionalApi } from './api';

const keys = {
  myProfile: ['professional', 'me'] as const,
  categories: ['catalog', 'categories'] as const,
  tags: ['catalog', 'tags'] as const,
};

export function useMyProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.myProfile,
    queryFn: professionalApi.getMyProfile,
    retry: false,
    enabled: options?.enabled ?? true,
  });
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

export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'public', id],
    queryFn: () => professionalApi.getPublicProfile(id as string),
    enabled: Boolean(id),
  });
}

export function usePortfolio(professionalId: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'portfolio', professionalId],
    queryFn: () => professionalApi.listPortfolio(professionalId as string),
    enabled: Boolean(professionalId),
  });
}

export function useCreatePortfolioItem(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.createPortfolioItem,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useRemovePortfolioItem(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removePortfolioItem,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useSlots(professionalId: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'slots', professionalId],
    queryFn: () => professionalApi.listSlots(professionalId as string),
    enabled: Boolean(professionalId),
  });
}

export function useAddSlot(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.addSlot,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'slots', professionalId] }),
  });
}

export function useRemoveSlot(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removeSlot,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'slots', professionalId] }),
  });
}

export function useAddServiceArea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.addServiceArea,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.myProfile });
      client.invalidateQueries({ queryKey: ['professional', 'public'] });
    },
  });
}

export function useRemoveServiceArea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removeServiceArea,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.myProfile });
      client.invalidateQueries({ queryKey: ['professional', 'public'] });
    },
  });
}

export function useAddPortfolioImage(professionalId: string | undefined, itemId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { imageUrl: string; position: number }) =>
      professionalApi.addPortfolioImage(itemId, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useRemovePortfolioImage(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => professionalApi.removePortfolioImage(imageId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}
