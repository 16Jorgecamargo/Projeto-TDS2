import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/auth';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      auth: { token: useAuthStore.getState().accessToken },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
