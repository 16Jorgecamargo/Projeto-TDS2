import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { usePublicProfile, useMyProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';
import type { Quote } from '../api';
import { formatCurrency, formatDate } from '../../../lib/utils';

export interface QuoteCardProps {
  quote: Quote;
  canAccept: boolean;
  onAccept: () => void;
  accepting: boolean;
  onWithdraw: () => void;
  withdrawing: boolean;
}

const STATUS_LABELS: Record<Quote['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  rejected: 'Rejeitado',
  withdrawn: 'Retirado',
};

export function QuoteCard({
  quote,
  canAccept,
  onAccept,
  accepting,
  onWithdraw,
  withdrawing,
}: QuoteCardProps): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const { data: profile } = usePublicProfile(quote.professionalId);
  const { data: myProfile } = useMyProfile();
  const createRoom = useCreateRoom();

  const isOwnQuote = role === 'professional' && myProfile?.id === quote.professionalId;
  const isOtherProfessionalView = role === 'professional' && !isOwnQuote;
  const categoryName = profile?.categories[0]?.name;

  function handleChat() {
    if (!profile) return;
    createRoom.mutate({ participantId: profile.userId }, { onSuccess: (room) => navigate(`/chat/${room.id}`) });
  }

  const professionalName = (
    <Link
      to={`/professionals/${quote.professionalId}`}
      className="font-semibold text-ink hover:underline"
    >
      {profile?.fullName ?? 'Profissional'}
    </Link>
  );

  const ratingInfo = (
    <span className="flex items-center gap-1 text-xs text-muted">
      <StarIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      {(profile?.ratingAverage ?? 0).toFixed(1)} ({profile?.ratingCount ?? 0})
    </span>
  );

  if (isOtherProfessionalView) {
    return (
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {professionalName}
          {ratingInfo}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          {categoryName && <span>{categoryName}</span>}
          <span>Enviado {formatDate(quote.createdAt)}</span>
          {quote.validUntil && <span>Válido até {formatDate(quote.validUntil)}</span>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {professionalName}
        <Badge tone={quote.status === 'pending' ? 'accent' : 'neutral'}>{STATUS_LABELS[quote.status]}</Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted">
        {categoryName && <span>{categoryName}</span>}
        <span>{formatCurrency(profile?.hourlyRate ?? 0)}/h</span>
        {ratingInfo}
      </div>
      {quote.message && <p className="text-sm text-muted">{quote.message}</p>}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span>Enviado {formatDate(quote.createdAt)}</span>
        {quote.validUntil && <span>Válido até {formatDate(quote.validUntil)}</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-ink">{formatCurrency(quote.total)}</span>
        <div className="flex gap-2">
          {isOwnQuote ? (
            quote.status === 'pending' && (
              <Button variant="danger" onClick={onWithdraw} disabled={withdrawing}>
                Remover orçamento
              </Button>
            )
          ) : (
            <>
              <Button variant="ghost" onClick={handleChat} disabled={!profile || createRoom.isPending}>
                Conversar
              </Button>
              {canAccept && (
                <Button onClick={onAccept} disabled={accepting}>
                  Aceitar
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
