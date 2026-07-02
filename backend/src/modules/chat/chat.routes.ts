import type { FastifyInstance } from 'fastify';
import { ChatRoom } from '../../infra/database/entities/chat-room.entity.js';
import { Message } from '../../infra/database/entities/message.entity.js';
import { Favorite } from '../../infra/database/entities/favorite.entity.js';
import { Report } from '../../infra/database/entities/report.entity.js';
import { UserBlock } from '../../infra/database/entities/user-block.entity.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { SocialService, type RecordAudit } from '../social/social.service.js';
import { buildEnqueueNotification } from '../notification/notification.service.js';
import { notificationQueue } from '../notification/notification.queue.js';
import { idParamSchema, paginationQuerySchema } from '../../shared/schemas.js';
import { createRoomBodySchema, chatRoomResponseSchema, messageListResponseSchema } from './chat.schemas.js';

const recordAudit: RecordAudit = async () => undefined;

export function buildChatService(app: FastifyInstance): ChatService {
  const social = new SocialService({
    favorites: app.dataSource.getRepository(Favorite),
    reports: app.dataSource.getRepository(Report),
    blocks: app.dataSource.getRepository(UserBlock),
    recordAudit,
  });
  return new ChatService({
    rooms: app.dataSource.getRepository(ChatRoom),
    messages: app.dataSource.getRepository(Message),
    social,
    enqueueNotification: buildEnqueueNotification(notificationQueue),
  });
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  const service = buildChatService(app);
  const controller = new ChatController(service);

  app.post('/chat/rooms', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['chat'],
      summary: 'Abrir ou reaproveitar sala de chat',
      body: createRoomBodySchema,
      response: { 201: chatRoomResponseSchema },
    },
    handler: controller.createRoom,
  });

  app.get('/chat/rooms/:id/messages', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['chat'],
      summary: 'Historico de mensagens da sala',
      params: idParamSchema,
      querystring: paginationQuerySchema,
      response: { 200: messageListResponseSchema },
    },
    handler: controller.listMessages,
  });
}
