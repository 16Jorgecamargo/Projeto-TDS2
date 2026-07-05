import { z } from 'zod';

export const chatRoomSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  professionalId: z.string().uuid(),
  contractId: z.string().uuid().nullable(),
});

export const chatRoomListItemSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid().nullable(),
  otherUserId: z.string().uuid(),
  otherUserName: z.string(),
  lastMessageAt: z.string().datetime().nullable(),
});

export const chatRoomListSchema = z.array(chatRoomListItemSchema);

export const messageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
});

export const messagesPageSchema = z.object({
  items: z.array(messageSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type ChatRoom = z.infer<typeof chatRoomSchema>;
export type ChatRoomListItem = z.infer<typeof chatRoomListItemSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessagesPage = z.infer<typeof messagesPageSchema>;
