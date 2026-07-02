import type { Server, Socket } from 'socket.io';
import type { ChatService } from './chat.service.js';
import { sendMessageSocketSchema } from './chat.schemas.js';
import type { Role } from '../../plugins/auth.js';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export type VerifyToken = (token: string) => TokenPayload;

export function socketAuthMiddleware(verifyToken: VerifyToken) {
  return (socket: Socket, next: (err?: Error) => void): void => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('unauthorized'));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  };
}

export function handleConnection(io: Server, service: ChatService) {
  return (socket: Socket): void => {
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    socket.on('send_message', async (payload: unknown) => {
      const parsed = sendMessageSocketSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'BAD_REQUEST' });
        return;
      }
      try {
        const message = await service.sendMessage(
          parsed.data.roomId,
          socket.data.userId as string,
          parsed.data.content,
        );
        io.to(parsed.data.roomId).emit('message', message);
      } catch (err) {
        socket.emit('error', { code: err instanceof Error ? err.message : 'ERROR' });
      }
    });
  };
}

export function registerChatGateway(io: Server, service: ChatService, verifyToken: VerifyToken): void {
  io.use(socketAuthMiddleware(verifyToken));
  io.on('connection', handleConnection(io, service));
}
