import { useState } from 'react';
import { useMessages, useChatSocket } from '../queries';
import { useAuthStore } from '../../../stores/auth';

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { data, isLoading } = useMessages(roomId);
  const { send } = useChatSocket(roomId);
  const [draft, setDraft] = useState('');
  const currentUserId = useAuthStore((state) => state.user?.id);

  if (isLoading || !data) {
    return <p className="p-6 text-gray-500">Carregando conversa...</p>;
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow">
      <ul className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {data.items.length === 0 ? (
          <li className="text-sm text-gray-400">Nenhuma mensagem ainda.</li>
        ) : (
          data.items.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <li
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isOwn ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <form
        className="flex gap-2 border-t border-gray-100 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
      >
        <input
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
