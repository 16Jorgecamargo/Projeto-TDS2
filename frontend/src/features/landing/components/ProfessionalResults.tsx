import type { JSX } from 'react';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { SearchParams } from '../api';

type SortOption = 'rating' | 'price';

export interface ProfessionalResultsProps {
  params: SearchParams;
  onlyAvailable?: boolean;
  sort?: SortOption;
}

export function ProfessionalResults({
  params,
  onlyAvailable = false,
  sort = 'rating',
}: ProfessionalResultsProps): JSX.Element {
  const { data, isPending, isError } = useSearchProfessionals(params);
  const favoriteIds = useFavoriteIds();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 w-full" aria-label="Carregando profissionais" />
        <Skeleton className="h-40 w-full" aria-label="Carregando profissionais" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Não foi possível carregar os resultados" />;
  }

  let items = data?.items ?? [];
  if (onlyAvailable) {
    items = items.filter((item) => item.isAvailable);
  }
  items = [...items].sort((a, b) =>
    sort === 'rating' ? b.ratingAverage - a.ratingAverage : (a.hourlyRate ?? Infinity) - (b.hourlyRate ?? Infinity),
  );

  if (items.length === 0) {
    return <EmptyState title="Nenhum profissional encontrado" description="Tente ampliar os filtros de busca." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ProfessionalCard
          key={item.id}
          id={item.id}
          headline={item.headline}
          bio={item.bio}
          hourlyRate={item.hourlyRate}
          ratingAverage={item.ratingAverage}
          ratingCount={item.ratingCount}
          isAvailable={item.isAvailable}
          isFavorite={favoriteIds.has(item.id)}
        />
      ))}
    </div>
  );
}
