import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { usePublicProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import type { Quote } from '../api';
import { formatCurrency } from '../../../lib/utils';

export interface QuoteCardProps {
  quote: Quote;
  canAccept: boolean;
  onAccept: () => void;
  accepting: boolean;
}

const STATUS_LABELS: Record<Quote['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  rejected: 'Rejeitado',
  withdrawn: 'Retirado',
};

export function QuoteCard({ quote, canAccept, onAccept, accepting }: QuoteCardProps): JSX.Element {
  const navigate = useNavigate();
  const { data: profile } = usePublicProfile(quote.professionalId);
  const createRoom = useCreateRoom();

  function handleChat() {
    if (!profile) return;
    createRoom.mutate({ participantId: profile.userId }, { onSuccess: (room) => navigate(`/chat/${room.id}`) });
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">{profile?.headline ?? 'Profissional'}</span>
        <Badge tone={quote.status === 'pending' ? 'accent' : 'neutral'}>{STATUS_LABELS[quote.status]}</Badge>
      </div>
      {quote.message && <p className="text-sm text-muted">{quote.message}</p>}
      <ul className="flex flex-col gap-1 text-sm text-ink">
        {quote.items.map((item, index) => (
          <li key={index} className="flex justify-between">
            <span>
              <span>{item.quantity}x</span> {item.description}
            </span>
            <span>{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-ink">{formatCurrency(quote.total)}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleChat} disabled={!profile || createRoom.isPending}>
            Conversar
          </Button>
          {canAccept && (
            <Button onClick={onAccept} disabled={accepting}>
              Aceitar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
