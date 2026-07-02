import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { ChatService } from './chat.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { ChatRoom } from '../../infra/database/entities/chat-room.entity.js';
import type { Message } from '../../infra/database/entities/message.entity.js';
import type { SocialService } from '../social/social.service.js';

function makeDeps() {
  const rooms = mockRepo<ChatRoom>();
  const messages = mockRepo<Message>();
  const social = { isBlockedBetween: vi.fn().mockResolvedValue(false) };
  const enqueueNotification = vi.fn().mockResolvedValue(undefined);
  const service = new ChatService({
    rooms: rooms as unknown as Repository<ChatRoom>,
    messages: messages as unknown as Repository<Message>,
    social: social as unknown as SocialService,
    enqueueNotification,
  });
  return { service, rooms, messages, social, enqueueNotification };
}

describe('ChatService', () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('getOrCreateRoom', () => {
    it('normaliza os participantes ao criar a sala', async () => {
      deps.rooms.save.mockImplementationOnce(async (value: Partial<ChatRoom>) => ({ id: 'room-1', ...value }));

      const room = await deps.service.getOrCreateRoom('zzz', 'aaa');

      expect(room.clientId).toBe('aaa');
      expect(room.professionalId).toBe('zzz');
      expect(deps.rooms.findOne).toHaveBeenCalledWith({ where: { client_id: 'aaa', professional_id: 'zzz' } });
    });

    it('reaproveita sala existente', async () => {
      deps.rooms.findOne.mockResolvedValueOnce({
        id: 'room-x',
        client_id: 'aaa',
        professional_id: 'zzz',
        contract_id: null,
      });

      const room = await deps.service.getOrCreateRoom('zzz', 'aaa');

      expect(room.id).toBe('room-x');
      expect(deps.rooms.save).not.toHaveBeenCalled();
    });
  });

  describe('listMessages', () => {
    it('lanca NotFound para sala inexistente', async () => {
      await expect(deps.service.listMessages('nope', 'aaa', 1, 20)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejeita listagem por quem nao e participante', async () => {
      deps.rooms.findOne.mockResolvedValueOnce({
        id: 'room-1',
        client_id: 'aaa',
        professional_id: 'zzz',
        contract_id: null,
      });

      await expect(deps.service.listMessages('room-1', 'intruso', 1, 20)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('sendMessage', () => {
    it('bloqueia mensagem entre usuarios bloqueados', async () => {
      deps.rooms.findOne.mockResolvedValueOnce({
        id: 'room-1',
        client_id: 'aaa',
        professional_id: 'zzz',
        contract_id: null,
      });
      deps.social.isBlockedBetween.mockResolvedValueOnce(true);

      await expect(deps.service.sendMessage('room-1', 'aaa', 'oi')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejeita envio por quem nao e participante', async () => {
      deps.rooms.findOne.mockResolvedValueOnce({
        id: 'room-1',
        client_id: 'aaa',
        professional_id: 'zzz',
        contract_id: null,
      });

      await expect(deps.service.sendMessage('room-1', 'intruso', 'oi')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca NotFound para sala inexistente', async () => {
      await expect(deps.service.sendMessage('nope', 'aaa', 'oi')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('persiste mensagem e notifica o destinatario', async () => {
      deps.rooms.findOne.mockResolvedValueOnce({
        id: 'room-1',
        client_id: 'aaa',
        professional_id: 'zzz',
        contract_id: null,
      });
      deps.messages.save.mockImplementationOnce(async (value: Partial<Message>) => ({
        id: 'msg-1',
        created_at: new Date('2026-07-01T12:00:00.000Z'),
        ...value,
      }));

      const msg = await deps.service.sendMessage('room-1', 'aaa', 'oi');

      expect(msg.content).toBe('oi');
      expect(msg.senderId).toBe('aaa');
      expect(deps.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'zzz', type: 'chat_message', channels: ['in_app', 'push'] }),
      );
    });
  });
});
