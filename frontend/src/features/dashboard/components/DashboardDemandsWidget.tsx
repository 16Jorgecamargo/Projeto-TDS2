import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useDemands } from '../../demands/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';


const OPEN_STATUSES = new Set(['open', 'in_progress']);

export function DashboardDemandsWidget(): JSX.Element {
  const { data, isPending } = useDemands(true);
  const items = (data?.items ?? []).filter((demand) => OPEN_STATUSES.has(demand.status)).slice(0, 3);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Demandas abertas</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando demandas" />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma demanda aberta" />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((demand) => (
            <li key={demand.id}>
              <Link to={`/demands/${demand.id}`} className="text-sm font-medium text-ink hover:text-primary">
                {demand.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/demands" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas
      </Link>
    </Card>
  );
}
