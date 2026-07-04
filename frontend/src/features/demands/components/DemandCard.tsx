import type { JSX } from 'react';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { Badge } from '../../../components/ui/Badge';
import type { Demand } from '../api';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABELS: Record<Demand['status'], string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Concluída',
  cancelled: 'Cancelada',
};

interface DemandCardProps {
  demand: Demand;
  onOpen: (id: string) => void;
}

export function DemandCard({ demand, onOpen }: DemandCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(demand.id)}
      className="flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{demand.title}</span>
        <Badge tone={demand.status === 'open' ? 'accent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {demand.status === 'cancelled' && (
              <XCircleIcon className="h-3.5 w-3.5 text-muted" data-testid="demand-cancelled-icon" />
            )}
            {STATUS_LABELS[demand.status]}
          </span>
        </Badge>
      </div>
      <span className="text-sm text-muted">
        {currency(demand.budgetMin)} — {currency(demand.budgetMax)}
      </span>
    </button>
  );
}
