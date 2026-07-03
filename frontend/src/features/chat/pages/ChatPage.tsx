import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { ChatWindow } from '../components/ChatWindow';

export function ChatPage(): JSX.Element {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <p className="p-6 text-muted">Selecione uma conversa.</p>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-ink">Conversa</h1>
      <div className="flex-1">
        <ChatWindow roomId={roomId} />
      </div>
    </div>
  );
}

export default ChatPage;
