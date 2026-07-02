import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, createRoom } from './api';
import { getChatSocket } from './socket';
import { messageSchema, type Message, type MessagesPage } from './schemas';

export const chatKeys = {
  messages: (roomId: string) => ['chat', 'messages', roomId] as const,
};

export function useMessages(roomId: string) {
  return useQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: () => fetchMessages(roomId),
  });
}

export function useChatSocket(roomId: string) {
  const client = useQueryClient();

  useEffect(() => {
    const socket = getChatSocket();
    socket.emit('join_room', roomId);

    const onMessage = (raw: unknown) => {
      const message = messageSchema.parse(raw);
      if (message.roomId !== roomId) {
        return;
      }
      client.setQueryData<MessagesPage>(chatKeys.messages(roomId), (prev) =>
        prev
          ? { ...prev, items: [message, ...prev.items], total: prev.total + 1 }
          : prev,
      );
    };

    socket.on('message', onMessage);
    return () => {
      socket.off('message', onMessage);
    };
  }, [roomId, client]);

  const send = (content: string) => {
    getChatSocket().emit('send_message', { roomId, content });
  };

  return { send };
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: (input: { participantId: string; contractId?: string | null }) =>
      createRoom(input.participantId, input.contractId),
  });
}

export type { Message };
