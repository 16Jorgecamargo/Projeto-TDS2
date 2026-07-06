import { useState, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useDemand, useDemandQuotes, useAcceptQuote, useCreateQuote, useWithdrawQuote } from '../queries';
import { QuoteCard } from '../components/QuoteCard';
import { InviteProfessionalDialog } from '../components/InviteProfessionalDialog';
import { QuoteForm } from '../components/QuoteForm';
import { useAuthStore } from '../../../stores/auth';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BackLink } from '../../../components/ui/BackLink';
import type { Demand } from '../api';

const STATUS_LABELS: Record<Demand['status'], string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Concluída',
  cancelled: 'Cancelada',
};

export default function DemandDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [inviting, setInviting] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const { data: demand, isPending } = useDemand(id);
  const { data: quotes } = useDemandQuotes(id);
  const accept = useAcceptQuote(id);
  const createQuote = useCreateQuote(id);
  const withdrawQuote = useWithdrawQuote(id);

  if (isPending) {
    return <Skeleton className="m-6 h-40 w-full" aria-label="Carregando demanda" />;
  }

  if (!demand) {
    return <EmptyState className="m-6" title="Demanda não encontrada" />;
  }

  return (
    <section className="flex flex-col gap-4 p-6">
      <BackLink />
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{demand.title}</h1>
          <Badge tone="primary">{STATUS_LABELS[demand.status]}</Badge>
        </div>
        {role === 'client' && (
          <Button variant="ghost" onClick={() => setInviting(true)}>
            Convidar profissional
          </Button>
        )}
      </header>
      <p className="text-sm text-muted">
        {demand.city} - {demand.state}
      </p>
      <p className="text-ink">{demand.description}</p>
      {demand.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {demand.images.map((image) => (
            <img
              key={image.url}
              src={image.url}
              alt={demand.title}
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}
      <h2 className="text-lg font-semibold text-ink">Orçamentos ({quotes?.length ?? 0})</h2>
      {!quotes || quotes.length === 0 ? (
        <EmptyState title="Nenhum orçamento recebido ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              canAccept={quote.status === 'pending' && demand.status === 'open'}
              onAccept={() => accept.mutate(quote.id)}
              accepting={accept.isPending}
              onWithdraw={() => withdrawQuote.mutate(quote.id)}
              withdrawing={withdrawQuote.isPending}
            />
          ))}
        </div>
      )}
      {role === 'professional' && demand.status === 'open' && (
        <QuoteForm submitting={createQuote.isPending} onSubmit={(values) => createQuote.mutate(values)} />
      )}
      {inviting && <InviteProfessionalDialog demandId={id} onClose={() => setInviting(false)} />}
    </section>
  );
}
