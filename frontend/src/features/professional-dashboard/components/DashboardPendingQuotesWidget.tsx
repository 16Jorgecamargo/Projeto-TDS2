import { useRef, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { useMyPendingQuotes } from '../../demands/queries';
import type { MyQuote } from '../../demands/api';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useFitCount } from '../../../lib/hooks/useFitCount';
import { formatCurrency, formatDate } from '../../../lib/utils';

function PendingQuotePreview({ quote }: { quote: MyQuote }): JSX.Element {
  return (
    <Link
      to={`/demands/${quote.demandId}`}
      className="flex items-center gap-3 rounded-lg bg-bg p-4 hover:shadow-hover"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-ink">{quote.demandTitle}</span>
        <span className="truncate text-xs text-muted">Enviado em {formatDate(quote.createdAt)}</span>
      </div>
      <span className="ml-auto shrink-0 text-sm font-semibold text-ink">{formatCurrency(quote.total)}</span>
    </Link>
  );
}

export function DashboardPendingQuotesWidget(): JSX.Element {
  const { data, isPending } = useMyPendingQuotes();
  const items = data ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const visibleCount = useFitCount(listRef, items.length);

  return (
    <Card className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink">Orçamentos pendentes</h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" aria-label="Carregando orçamentos" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum orçamento pendente"
          description="Seus orçamentos enviados aparecem aqui até serem aceitos ou recusados."
          className="h-full w-full flex-1 justify-center"
        />
      ) : (
        <div className="min-h-0 flex-1 rounded-lg bg-surface p-2">
          <ul ref={listRef} className="flex h-full flex-col gap-2 overflow-y-auto">
            {items.slice(0, visibleCount).map((quote) => (
              <li key={quote.id}>
                <PendingQuotePreview quote={quote} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
