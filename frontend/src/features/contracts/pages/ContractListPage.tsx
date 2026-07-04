import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { useContracts } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';
import type { Contract, ContractStatus } from '../api';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
};

function ContractListItem({
  contract,
  otherPartyName,
  onOpen,
}: {
  contract: Contract;
  otherPartyName: string;
  onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(contract.id)}
      className="flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{otherPartyName}</span>
        <Badge tone={contract.status === 'disputed' ? 'accent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {contract.status === 'cancelled' && (
              <XCircleIcon className="h-3.5 w-3.5 text-muted" data-testid="contract-cancelled-icon" />
            )}
            {STATUS_LABELS[contract.status]}
          </span>
        </Badge>
      </div>
      <span className="text-sm text-muted">{formatCurrency(contract.total)}</span>
    </button>
  );
}

export default function ContractListPage(): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isPending } = useContracts();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold text-ink">Contratos</h1>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((contract) => (
            <ContractListItem
              key={contract.id}
              contract={contract}
              otherPartyName={role === 'professional' ? contract.clientName : contract.professionalHeadline}
              onOpen={(id) => navigate(`/contracts/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
