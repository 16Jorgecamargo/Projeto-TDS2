import { useRef, type JSX } from 'react';
import { Link } from 'react-router-dom';
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
  return (
    <Link to={`/professionals/${professionalId}`} className="flex items-center gap-2">
      <Avatar name={data.headline} size="sm" />
      <span className="text-sm font-medium text-ink">{data.headline}</span>
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
        <ul ref={listRef} className="flex flex-1 flex-col gap-2 overflow-hidden">
          {items.slice(0, visibleCount).map((favorite) => (
            <li key={favorite.id}>
              <FavoriteProfessionalPreview professionalId={favorite.professionalId} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
