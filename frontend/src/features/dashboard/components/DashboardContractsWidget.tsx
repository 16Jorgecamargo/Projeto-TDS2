import { useRef, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContracts } from '../../contracts/queries';
import { ContractCard } from '../../contracts/components/ContractCard';
import { useAuthStore } from '../../../stores/auth';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useFitCount } from '../../../lib/hooks/useFitCount';

export function DashboardContractsWidget(): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isPending } = useContracts();
  const contracts = data ?? [];
  const active = contracts.filter((contract) => contract.status === 'active');
  const completed = contracts.filter((contract) => contract.status === 'completed');
  const listRef = useRef<HTMLDivElement>(null);
  const visibleCount = useFitCount(listRef, contracts.length);

  return (
    <Card className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink">Contratos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : contracts.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" className="h-full w-full flex-1 justify-center" />
      ) : (
        <>
          <div className="mb-3 flex gap-6">
            <div>
              <p className="text-2xl font-bold text-ink">{active.length}</p>
              <p className="text-xs text-muted">Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{completed.length}</p>
              <p className="text-xs text-muted">Concluídos</p>
            </div>
          </div>
          <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-hidden">
            {contracts.slice(0, visibleCount).map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                otherPartyName={role === 'professional' ? contract.clientName : contract.professionalHeadline}
                onOpen={(id) => navigate(`/contracts/${id}`)}
              />
            ))}
          </div>
        </>
      )}
      <Link to="/contracts" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todos contratos
      </Link>
    </Card>
  );
}
