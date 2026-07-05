import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const createRoomBodySchema = z.object({
  participantId: z
    .string()
    .uuid()
    .describe('Outro participante da sala')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  contractId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Contrato vinculado')
    .openapi({ example: null }),
});

export const chatRoomResponseSchema = z.object({
  id: z.string().uuid().describe('ID da sala').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000020' }),
  clientId: z
    .string()
    .uuid()
    .describe('Participante cliente')
    .openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  professionalId: z
    .string()
    .uuid()
    .describe('Participante profissional')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  contractId: z.string().uuid().nullable().describe('Contrato').openapi({ example: null }),
});

export const chatRoomListItemSchema = z.object({
  id: z.string().uuid().describe('ID da sala').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000020' }),
  contractId: z.string().uuid().nullable().describe('Contrato').openapi({ example: null }),
  otherUserId: z
    .string()
    .uuid()
    .describe('ID do outro participante')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  otherUserName: z.string().describe('Nome do outro participante').openapi({ example: 'Ana Souza' }),
  lastMessageAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Ultima mensagem')
    .openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const chatRoomListSchema = z.array(chatRoomListItemSchema);

export const messageResponseSchema = z.object({
  id: z.string().uuid().describe('ID da mensagem').openapi({ example: 'm1b2c3d4-0000-4000-8000-000000000021' }),
  roomId: z.string().uuid().describe('Sala').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000020' }),
  senderId: z.string().uuid().describe('Remetente').openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  content: z.string().describe('Conteudo').openapi({ example: 'Ola, tudo bem?' }),
  createdAt: z.string().datetime().describe('Enviada em').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const sendMessageSocketSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type ChatRoomResponse = z.infer<typeof chatRoomResponseSchema>;
export type ChatRoomListItem = z.infer<typeof chatRoomListItemSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export const messageListResponseSchema = paginatedResponse(messageResponseSchema);
