import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../favorites/queries';
import { usePublicProfile } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

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

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Profissionais favoritos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando favoritos" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Favorite profissionais para encontrá-los rápido aqui."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((favorite) => (
            <li key={favorite.id}>
              <FavoriteProfessionalPreview professionalId={favorite.professionalId} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
