import { http } from '../../lib/http';
import {
  chatRoomSchema,
  chatRoomListSchema,
  messagesPageSchema,
  type ChatRoom,
  type ChatRoomListItem,
  type MessagesPage,
} from './schemas';

export async function fetchMessages(roomId: string, page = 1, limit = 20): Promise<MessagesPage> {
  const { data } = await http.get(`/chat/rooms/${roomId}/messages`, { params: { page, limit } });
  return messagesPageSchema.parse(data);
}

export async function fetchRooms(): Promise<ChatRoomListItem[]> {
  const { data } = await http.get('/chat/rooms');
  return chatRoomListSchema.parse(data);
}

export async function createRoom(participantId: string, contractId?: string | null): Promise<ChatRoom> {
  const { data } = await http.post('/chat/rooms', { participantId, contractId: contractId ?? null });
  return chatRoomSchema.parse(data);
}
