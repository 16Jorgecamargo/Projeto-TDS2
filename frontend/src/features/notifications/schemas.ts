import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  channel: z.enum(['push', 'in_app', 'email']),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const notificationsPageSchema = z.object({
  items: z.array(notificationSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsPage = z.infer<typeof notificationsPageSchema>;
