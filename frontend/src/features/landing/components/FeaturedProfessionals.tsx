import type { JSX } from 'react';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useFeaturedProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';

export function FeaturedProfessionals(): JSX.Element | null {
  const { data, isLoading } = useFeaturedProfessionals(3);
  const favoriteIds = useFavoriteIds();

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-h2 font-bold text-ink">Profissionais em destaque</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Profissionais em destaque</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
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
    </section>
  );
}
