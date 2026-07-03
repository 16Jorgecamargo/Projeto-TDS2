import { useState, type JSX } from 'react';
import { useMessages, useChatSocket } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps): JSX.Element {
  const { data, isLoading } = useMessages(roomId);
  const { send } = useChatSocket(roomId);
  const [draft, setDraft] = useState('');
  const currentUserId = useAuthStore((state) => state.user?.id);

  if (isLoading || !data) {
    return <Skeleton className="h-full w-full" aria-label="Carregando conversa" />;
  }

  return (
    <Card className="flex h-full flex-col p-0">
      <ul className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {data.items.length === 0 ? (
          <li>
            <EmptyState title="Nenhuma mensagem ainda" />
          </li>
        ) : (
          data.items.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <li key={message.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-xs rounded-lg px-4 py-2 text-sm',
                    isOwn ? 'bg-accent text-bg' : 'bg-surface text-ink',
                  )}
                >
                  <p>{message.content}</p>
                  <p className={cn('mt-1 text-xs', isOwn ? 'text-bg/70' : 'text-muted')}>
                    {new Date(message.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <form
        className="flex gap-2 border-t border-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
      >
        <input
          className="flex-1 rounded-sm border border-surface px-3 py-2 text-sm text-ink"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Enviar
        </Button>
      </form>
    </Card>
  );
}

export default ChatWindow;
