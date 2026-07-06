import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from './api';

export const notificationKeys = {
  list: (page: number) => ['notifications', page] as const,
};

export function useNotifications(page = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => fetchNotifications(page),
    enabled: options?.enabled ?? true,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
