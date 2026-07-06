import type { JSX } from 'react';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { Badge } from '../../../components/ui/Badge';
import { cn, formatCurrency } from '../../../lib/utils';
import type { Contract, ContractStatus } from '../api';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
};

interface ContractCardProps {
  contract: Contract;
  otherPartyName: string;
  onOpen: (id: string) => void;
  className?: string;
}

export function ContractCard({ contract, otherPartyName, onOpen, className }: ContractCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(contract.id)}
      className={cn('flex w-full flex-col gap-2 rounded-lg p-4 text-left hover:shadow-hover', className ?? 'bg-surface')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{contract.demandTitle}</span>
        <Badge tone={contract.status === 'disputed' ? 'accent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {contract.status === 'cancelled' && (
              <XCircleIcon className="h-3.5 w-3.5 text-muted" data-testid="contract-cancelled-icon" />
            )}
            {STATUS_LABELS[contract.status]}
          </span>
        </Badge>
      </div>
      <span className="text-sm text-muted">{otherPartyName}</span>
      <span className="text-sm text-muted">{formatCurrency(contract.total)}</span>
    </button>
  );
}
