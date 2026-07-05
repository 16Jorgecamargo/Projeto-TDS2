import { useState, type JSX } from 'react';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { Trash2, Wallet, CalendarDays } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { formatRelativeDays } from '../../../lib/utils';
import { useCategories } from '../../professional/queries';
import { useDeleteDemand } from '../queries';
import type { Demand } from '../api';

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
  const { data: categories } = useCategories();
  const deleteDemand = useDeleteDemand();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categoryName = categories?.find((category) => category.id === demand.categoryId)?.name;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={demand.title}
      onClick={() => onOpen(demand.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(demand.id);
      }}
      className="group relative flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover"
    >
      <button
        type="button"
        aria-label="Excluir demanda"
        onClick={(event) => {
          event.stopPropagation();
          setConfirmingDelete(true);
        }}
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex items-center justify-between gap-2 pr-8">
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

      {categoryName && <span className="text-sm text-muted">{categoryName}</span>}

      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Wallet className="h-3.5 w-3.5" />
          {demand.quotesCount} {demand.quotesCount === 1 ? 'orçamento' : 'orçamentos'}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatRelativeDays(demand.createdAt)}
        </span>
      </div>

      {confirmingDelete && (
        <Modal
          open
          onClose={() => setConfirmingDelete(false)}
          title="Excluir demanda"
          description={`Tem certeza que deseja excluir "${demand.title}"? Essa ação não pode ser desfeita.`}
        >
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteDemand.isPending}
              onClick={() => {
                deleteDemand.mutate(demand.id);
                setConfirmingDelete(false);
              }}
            >
              Excluir
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
