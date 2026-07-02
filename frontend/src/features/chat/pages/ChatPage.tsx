import { useParams } from 'react-router-dom';
import { ChatWindow } from '../components/ChatWindow';

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <p className="p-6 text-gray-500">Selecione uma conversa.</p>;
  }

  return (
    <div className="mx-auto h-[calc(100vh-4rem)] max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Conversa</h1>
      <div className="h-[calc(100%-3rem)]">
        <ChatWindow roomId={roomId} />
      </div>
    </div>
  );
}

export default ChatPage;
