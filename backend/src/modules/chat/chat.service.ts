import { type Repository } from 'typeorm';
import type { ChatRoom } from '../../infra/database/entities/chat-room.entity.js';
import type { Message } from '../../infra/database/entities/message.entity.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { SocialService } from '../social/social.service.js';
import type { EnqueueNotification } from '../notification/notification.service.js';
import type { ChatRoomListItem, ChatRoomResponse, MessageResponse } from './chat.schemas.js';

interface ChatServiceDeps {
  rooms: Repository<ChatRoom>;
  messages: Repository<Message>;
  social: SocialService;
  enqueueNotification: EnqueueNotification;
}

export class ChatService {
  constructor(private readonly deps: ChatServiceDeps) {}

  private toRoomResponse(room: ChatRoom): ChatRoomResponse {
    return {
      id: room.id,
      clientId: room.client_id,
      professionalId: room.professional_id,
      contractId: room.contract_id,
    };
  }

  private toMessageResponse(message: Message): MessageResponse {
    return {
      id: message.id,
      roomId: message.room_id,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at.toISOString(),
    };
  }

  private assertParticipant(room: ChatRoom, userId: string): void {
    if (room.client_id !== userId && room.professional_id !== userId) {
      throw new ForbiddenError('Usuario nao participa da sala');
    }
  }

  async listRoomsForUser(userId: string): Promise<ChatRoomListItem[]> {
    const rows = await this.deps.rooms.find({
      where: [{ client_id: userId }, { professional_id: userId }],
      relations: ['client', 'professional'],
      order: { last_message_at: 'DESC' },
    });

    return rows.map((room) => {
      const isClient = room.client_id === userId;
      const otherUser = isClient ? room.professional : room.client;
      return {
        id: room.id,
        contractId: room.contract_id,
        otherUserId: otherUser.id,
        otherUserName: otherUser.full_name,
        lastMessageAt: room.last_message_at ? room.last_message_at.toISOString() : null,
      };
    });
  }

  async getOrCreateRoom(userA: string, userB: string, contractId?: string | null): Promise<ChatRoomResponse> {
    const [clientId, professionalId] = [userA, userB].sort();
    const existing = await this.deps.rooms.findOne({ where: { client_id: clientId, professional_id: professionalId } });
    if (existing) {
      return this.toRoomResponse(existing);
    }
    const saved = await this.deps.rooms.save(
      this.deps.rooms.create({
        client_id: clientId,
        professional_id: professionalId,
        contract_id: contractId ?? null,
        last_message_at: null,
      }),
    );
    return this.toRoomResponse(saved);
  }

  async listMessages(
    roomId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: MessageResponse[]; page: number; limit: number; total: number }> {
    const room = await this.deps.rooms.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundError('Sala nao encontrada');
    }
    this.assertParticipant(room, userId);

    const [rows, total] = await this.deps.messages.findAndCount({
      where: { room_id: roomId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toMessageResponse(row)), page, limit, total };
  }

  async sendMessage(roomId: string, senderId: string, content: string): Promise<MessageResponse> {
    const room = await this.deps.rooms.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundError('Sala nao encontrada');
    }
    this.assertParticipant(room, senderId);

    const recipientId = room.client_id === senderId ? room.professional_id : room.client_id;
    if (await this.deps.social.isBlockedBetween(senderId, recipientId)) {
      throw new ForbiddenError('Conversa bloqueada entre os usuarios');
    }

    const saved = await this.deps.messages.save(
      this.deps.messages.create({ room_id: roomId, sender_id: senderId, content, read_at: null }),
    );

    await this.deps.rooms.save({ ...room, last_message_at: new Date() });

    await this.deps.enqueueNotification({
      userId: recipientId,
      type: 'chat_message',
      title: 'Nova mensagem',
      body: content.slice(0, 120),
      channels: ['in_app', 'push'],
      data: { roomId },
    });

    return this.toMessageResponse(saved);
  }
}
