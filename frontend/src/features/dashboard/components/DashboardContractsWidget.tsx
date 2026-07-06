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
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Contratos</h2>
        <Link to="/contracts" className="text-sm font-semibold text-primary">
          Ver mais
        </Link>
      </div>
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
          <div className="min-h-0 flex-1 rounded-lg bg-surface p-2">
            <div ref={listRef} className="flex h-full flex-col gap-2 overflow-hidden">
              {contracts.slice(0, visibleCount).map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  otherPartyName={role === 'professional' ? contract.clientName : contract.professionalHeadline}
                  onOpen={(id) => navigate(`/contracts/${id}`)}
                  className="bg-bg"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
