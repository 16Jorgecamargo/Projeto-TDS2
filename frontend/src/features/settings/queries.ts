import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type Preferences } from './api';

const keys = {
  preferences: ['settings', 'preferences'] as const,
  consents: ['settings', 'consents'] as const,
  deletion: ['settings', 'deletion'] as const,
};

export function usePreferences() {
  return useQuery({ queryKey: keys.preferences, queryFn: settingsApi.getPreferences });
}

export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Preferences>) => settingsApi.updatePreferences(payload),
    onSuccess: (data) => client.setQueryData(keys.preferences, data),
  });
}

export function useConsents() {
  return useQuery({ queryKey: keys.consents, queryFn: settingsApi.listConsents });
}

export function useRecordConsent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.recordConsent,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.consents }),
  });
}

export function useDeletionStatus() {
  return useQuery({ queryKey: keys.deletion, queryFn: settingsApi.getDeletionStatus });
}

export function useRequestDeletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.requestDeletion,
    onSuccess: (data) => client.setQueryData(keys.deletion, data),
  });
}

export function useCancelDeletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.cancelDeletion,
    onSuccess: () => client.setQueryData(keys.deletion, null),
  });
}
