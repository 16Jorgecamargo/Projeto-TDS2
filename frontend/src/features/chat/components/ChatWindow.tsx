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
    <Card noPadding className="flex h-full flex-col">
      <ul className="flex flex-1 flex-col-reverse gap-1.5 overflow-y-auto p-3">
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
                    'max-w-[80%] break-words rounded-lg px-3 py-1.5 text-sm',
                    isOwn ? 'bg-primary text-bg' : 'bg-surface text-ink',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={cn('mt-0.5 text-xs', isOwn ? 'text-bg/70' : 'text-muted')}>
                    {new Date(message.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <form
        className="flex shrink-0 gap-1.5 border-t border-surface p-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-sm border border-surface px-2.5 py-1.5 text-sm text-ink"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem"
        />
        <Button type="submit" size="sm" className="shrink-0" disabled={!draft.trim()}>
          Enviar
        </Button>
      </form>
    </Card>
  );
}

export default ChatWindow;
