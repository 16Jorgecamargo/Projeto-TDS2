import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { ContractCard } from '../components/ContractCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BackLink } from '../../../components/ui/BackLink';

export default function ContractListPage(): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isPending } = useContracts();

  return (
    <div className="flex flex-col gap-4 p-6">
      <BackLink />
      <h1 className="text-3xl font-bold text-ink">Contratos</h1>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((contract) => (
            <ContractCard
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
