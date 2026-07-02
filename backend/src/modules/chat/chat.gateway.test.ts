import { describe, it, expect, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { handleConnection, socketAuthMiddleware } from './chat.gateway.js';
import type { ChatService } from './chat.service.js';

describe('socketAuthMiddleware', () => {
  it('rejeita handshake sem token', () => {
    const verifyToken = vi.fn();
    const next = vi.fn();
    const socket = { handshake: { auth: {} } } as unknown as Socket;

    socketAuthMiddleware(verifyToken)(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejeita token invalido', () => {
    const verifyToken = vi.fn(() => {
      throw new Error('invalid');
    });
    const next = vi.fn();
    const socket = { handshake: { auth: { token: 'bad' } }, data: {} } as unknown as Socket;

    socketAuthMiddleware(verifyToken)(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('popula socket.data.userId com token valido', () => {
    const verifyToken = vi.fn().mockReturnValue({ sub: 'u-1', role: 'client' });
    const next = vi.fn();
    const socket = { handshake: { auth: { token: 'jwt' } }, data: {} } as unknown as Socket;

    socketAuthMiddleware(verifyToken)(socket, next);

    expect(socket.data.userId).toBe('u-1');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('handleConnection', () => {
  it('persiste e emite mensagem para a sala ao receber send_message', async () => {
    const roomId = '11111111-1111-1111-1111-111111111111';
    const service = {
      sendMessage: vi.fn().mockResolvedValue({
        id: 'm-1',
        roomId,
        senderId: 'u-1',
        content: 'oi',
        createdAt: '2026-07-01T12:00:00.000Z',
      }),
    };
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const handlers: Record<string, (payload: unknown) => Promise<void> | void> = {};
    const socket = {
      data: { userId: 'u-1' },
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (payload: unknown) => Promise<void> | void) => {
        handlers[event] = cb;
      }),
    } as unknown as Socket;
    const io = { to } as unknown as Server;

    handleConnection(io, service as unknown as ChatService)(socket);
    await handlers.send_message?.({ roomId, content: 'oi' });

    expect(service.sendMessage).toHaveBeenCalledWith(roomId, 'u-1', 'oi');
    expect(to).toHaveBeenCalledWith(roomId);
    expect(emit).toHaveBeenCalledWith('message', expect.objectContaining({ id: 'm-1' }));
  });

  it('emite erro para payload invalido', async () => {
    const service = { sendMessage: vi.fn() };
    const handlers: Record<string, (payload: unknown) => Promise<void> | void> = {};
    const socket = {
      data: { userId: 'u-1' },
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (payload: unknown) => Promise<void> | void) => {
        handlers[event] = cb;
      }),
    } as unknown as Socket;
    const io = { to: vi.fn() } as unknown as Server;

    handleConnection(io, service as unknown as ChatService)(socket);
    await handlers.send_message?.({ roomId: 'not-a-uuid', content: '' });

    expect(service.sendMessage).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('error', { code: 'BAD_REQUEST' });
  });

  it('emite erro quando o service rejeita', async () => {
    const service = { sendMessage: vi.fn().mockRejectedValue(new Error('Sala nao encontrada')) };
    const handlers: Record<string, (payload: unknown) => Promise<void> | void> = {};
    const socket = {
      data: { userId: 'u-1' },
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (payload: unknown) => Promise<void> | void) => {
        handlers[event] = cb;
      }),
    } as unknown as Socket;
    const io = { to: vi.fn() } as unknown as Server;

    handleConnection(io, service as unknown as ChatService)(socket);
    await handlers.send_message?.({ roomId: '11111111-1111-1111-1111-111111111111', content: 'oi' });

    expect(socket.emit).toHaveBeenCalledWith('error', { code: 'Sala nao encontrada' });
  });

  it('entra na sala ao receber join_room', () => {
    const service = { sendMessage: vi.fn() };
    const handlers: Record<string, (payload: unknown) => void> = {};
    const socket = {
      data: { userId: 'u-1' },
      join: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (payload: unknown) => void) => {
        handlers[event] = cb;
      }),
    } as unknown as Socket;
    const io = { to: vi.fn() } as unknown as Server;

    handleConnection(io, service as unknown as ChatService)(socket);
    handlers.join_room?.('room-1');

    expect(socket.join).toHaveBeenCalledWith('room-1');
  });
});
