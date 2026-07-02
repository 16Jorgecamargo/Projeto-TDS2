import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function DashboardContractsWidget(): JSX.Element {
  const { data, isPending } = useContracts();
  const active = (data ?? []).filter((contract) => contract.status === 'active');
  const completed = (data ?? []).filter((contract) => contract.status === 'completed');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Contratos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : active.length === 0 && completed.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" />
      ) : (
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold text-ink">{active.length}</p>
            <p className="text-xs text-muted">Ativos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{completed.length}</p>
            <p className="text-xs text-muted">Concluídos</p>
          </div>
        </div>
      )}
      <Link to="/contracts" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver contratos
      </Link>
    </Card>
  );
}
