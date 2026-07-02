import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const notificationChannelSchema = z
  .enum(['push', 'in_app', 'email'])
  .describe('Canal de entrega da notificacao')
  .openapi({ example: 'in_app' });

export const notificationPlatformSchema = z
  .enum(['ios', 'android', 'web'])
  .describe('Plataforma do dispositivo')
  .openapi({ example: 'android' });

export const notificationResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'n1b2c3d4-0000-4000-8000-000000000010' }),
  type: z.string().describe('Tipo do evento').openapi({ example: 'review_received' }),
  title: z.string().describe('Titulo').openapi({ example: 'Voce recebeu uma avaliacao' }),
  body: z.string().nullable().describe('Corpo').openapi({ example: 'Nota 5' }),
  channel: notificationChannelSchema,
  readAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Lida em')
    .openapi({ example: null }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criada em')
    .openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const notificationListResponseSchema = paginatedResponse(notificationResponseSchema);

export const registerDeviceBodySchema = z.object({
  token: z.string().min(10).max(512).describe('Token do dispositivo').openapi({ example: 'fcm-token-xyz' }),
  platform: notificationPlatformSchema,
});

export const registerDeviceResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000011' }),
});

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationPlatform = z.infer<typeof notificationPlatformSchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type RegisterDeviceBody = z.infer<typeof registerDeviceBodySchema>;
export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponseSchema>;
