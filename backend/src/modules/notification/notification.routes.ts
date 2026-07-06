import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { Notification } from '../../infra/database/entities/notification.entity.js';
import { PushDeviceToken } from '../../infra/database/entities/push-device-token.entity.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { emptyBodySchema, idParamSchema, paginationQuerySchema } from '../../shared/schemas.js';
import {
  notificationListResponseSchema,
  registerDeviceBodySchema,
  registerDeviceResponseSchema,
} from './notification.schemas.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const service = new NotificationService({
    notifications: app.dataSource.getRepository(Notification),
    deviceTokens: app.dataSource.getRepository(PushDeviceToken),
  });
  const controller = new NotificationController(service);

  app.get('/notifications', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['notification'],
      summary: 'Listar notificacoes in-app',
      querystring: paginationQuerySchema,
      response: { 200: notificationListResponseSchema },
    },
    handler: controller.list,
  });

  app.patch('/notifications/:id/read', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['notification'],
      summary: 'Marcar notificacao como lida',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 204: z.void() },
    },
    handler: controller.markRead,
  });

  app.patch('/notifications/read-all', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['notification'],
      summary: 'Marcar todas as notificacoes como lidas',
      body: emptyBodySchema,
      response: { 204: z.void() },
    },
    handler: controller.markAllRead,
  });

  app.post('/notifications/devices', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['notification'],
      summary: 'Registrar token de push',
      body: registerDeviceBodySchema,
      response: { 201: registerDeviceResponseSchema },
    },
    handler: controller.registerDevice,
  });
}
