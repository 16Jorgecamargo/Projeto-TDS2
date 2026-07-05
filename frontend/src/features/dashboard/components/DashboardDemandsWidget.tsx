import { useRef, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemands } from '../../demands/queries';
import { DemandCard } from '../../demands/components/DemandCard';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useFitCount } from '../../../lib/hooks/useFitCount';

const OPEN_STATUSES = new Set(['open', 'in_progress']);

export function DashboardDemandsWidget(): JSX.Element {
  const navigate = useNavigate();
  const { data, isPending } = useDemands(true);
  const items = (data?.items ?? []).filter((demand) => OPEN_STATUSES.has(demand.status));
  const listRef = useRef<HTMLDivElement>(null);
  const visibleCount = useFitCount(listRef, items.length);

  return (
    <Card className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink">Demandas</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando demandas" />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma demanda aberta" className="h-full w-full flex-1 justify-center" />
      ) : (
        <div className="min-h-0 flex-1 rounded-lg bg-surface p-2">
          <div ref={listRef} className="flex h-full flex-col gap-2 overflow-hidden">
            {items.slice(0, visibleCount).map((demand) => (
              <DemandCard
                key={demand.id}
                demand={demand}
                onOpen={(id) => navigate(`/demands/${id}`)}
                className="bg-bg"
              />
            ))}
          </div>
        </div>
      )}
      <Link to="/demands" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas demandas
      </Link>
    </Card>
  );
}
