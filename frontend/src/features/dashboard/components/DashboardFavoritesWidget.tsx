import { useRef, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { useFavorites } from '../../favorites/queries';
import { usePublicProfile } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useFitCount } from '../../../lib/hooks/useFitCount';

function FavoriteProfessionalPreview({ professionalId }: { professionalId: string }): JSX.Element | null {
  const { data } = usePublicProfile(professionalId);
  if (!data) return null;
  const category = data.categories[0]?.name;
  const serviceArea = data.serviceAreas[0];

  return (
    <Link
      to={`/professionals/${professionalId}`}
      className="flex items-center gap-3 rounded-lg bg-bg p-4 hover:shadow-hover"
    >
      <Avatar name={data.headline} size="md" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-ink">{data.headline}</span>
        <span className="truncate text-xs text-muted">
          {[category, serviceArea && `${serviceArea.city}, ${serviceArea.state}`].filter(Boolean).join(' · ')}
        </span>
      </div>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted">
        <StarIcon className="h-3.5 w-3.5 text-accent" />
        {data.ratingAverage.toFixed(1)}
      </span>
    </Link>
  );
}

export function DashboardFavoritesWidget(): JSX.Element {
  const { data, isPending } = useFavorites(1);
  const items = data?.items ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const visibleCount = useFitCount(listRef, items.length);

  return (
    <Card className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink">Profissionais favoritos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando favoritos" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Favorite profissionais para encontrá-los rápido aqui."
          className="h-full w-full flex-1 justify-center"
        />
      ) : (
        <div className="min-h-0 flex-1 rounded-lg bg-surface p-2">
          <ul ref={listRef} className="flex h-full flex-col gap-2 overflow-y-auto">
            {items.slice(0, visibleCount).map((favorite) => (
              <li key={favorite.id}>
                <FavoriteProfessionalPreview professionalId={favorite.professionalId} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
