import { http } from '../../lib/http';
import { notificationsPageSchema, type NotificationsPage } from './schemas';

export async function fetchNotifications(page = 1, limit = 20): Promise<NotificationsPage> {
  const { data } = await http.get('/notifications', { params: { page, limit } });
  return notificationsPageSchema.parse(data);
}

export async function markNotificationRead(id: string): Promise<void> {
  await http.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.patch('/notifications/read-all');
}
