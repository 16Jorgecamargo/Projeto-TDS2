import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';

export function DashboardActiveContractsWidget(): JSX.Element {
  const { data, isPending } = useContracts();
  const active = (data ?? []).filter((contract) => contract.status === 'active');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Serviços em andamento</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando serviços em andamento" />
      ) : active.length === 0 ? (
        <EmptyState title="Nenhum contrato em andamento" />
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((contract) => (
            <li key={contract.id}>
              <Link to={`/contracts/${contract.id}`} className="text-sm font-semibold text-primary">
                {formatCurrency(contract.total)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
