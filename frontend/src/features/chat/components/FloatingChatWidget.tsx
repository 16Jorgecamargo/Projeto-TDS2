import { useState, type JSX } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useRooms } from '../queries';
import { ChatWindow } from './ChatWindow';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function FloatingChatWidget(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const { data: rooms, isLoading } = useRooms();

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Abrir chat"
        className="fixed bottom-6 right-6 z-modal flex h-14 w-14 items-center justify-center rounded-full bg-primary text-bg shadow-modal hover:bg-primary-hover"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
      </button>
    );
  }

  const activeRoom = rooms?.find((room) => room.id === activeRoomId);

  return (
    <Card noPadding className="fixed bottom-6 right-6 z-modal flex h-[26rem] w-80 flex-col overflow-hidden shadow-modal">
      <div className="flex shrink-0 items-center gap-2 border-b border-surface px-3 py-2.5">
        {activeRoomId ? (
          <button
            type="button"
            onClick={() => setActiveRoomId(null)}
            aria-label="Voltar para conversas"
            className="text-muted hover:text-ink"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        ) : (
          <span className="font-semibold text-ink">Chat</span>
        )}
        {activeRoom && <span className="flex-1 truncate text-sm font-semibold text-ink">{activeRoom.otherUserName}</span>}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Minimizar chat"
          className="ml-auto text-muted hover:text-ink"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeRoomId ? (
          <ChatWindow roomId={activeRoomId} />
        ) : isLoading ? (
          <Skeleton className="h-full w-full" aria-label="Carregando conversas" />
        ) : !rooms || rooms.length === 0 ? (
          <div className="flex h-full items-center justify-center p-3">
            <EmptyState title="Nenhuma conversa ainda" />
          </div>
        ) : (
          <ul className="flex h-full flex-col divide-y divide-surface overflow-y-auto">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface"
                >
                  <Avatar name={room.otherUserName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{room.otherUserName}</p>
                    <p className="truncate text-xs text-muted">
                      {room.lastMessageAt
                        ? new Date(room.lastMessageAt).toLocaleString('pt-BR')
                        : 'Toque para conversar'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default FloatingChatWidget;
