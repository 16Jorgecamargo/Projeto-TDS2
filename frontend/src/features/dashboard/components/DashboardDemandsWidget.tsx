import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemands } from '../../demands/queries';
import { DemandCard } from '../../demands/components/DemandCard';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

const OPEN_STATUSES = new Set(['open', 'in_progress']);

export function DashboardDemandsWidget(): JSX.Element {
  const navigate = useNavigate();
  const { data, isPending } = useDemands(true);
  const items = (data?.items ?? []).filter((demand) => OPEN_STATUSES.has(demand.status)).slice(0, 3);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Demandas</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando demandas" />
      ) : items.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center">
          <EmptyState title="Nenhuma demanda aberta" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((demand) => (
            <DemandCard key={demand.id} demand={demand} onOpen={(id) => navigate(`/demands/${id}`)} />
          ))}
        </div>
      )}
      <Link to="/demands" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas demandas
      </Link>
    </Card>
  );
}
