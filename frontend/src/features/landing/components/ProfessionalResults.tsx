import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Pagination } from './Pagination';
import { fadeVariants, duration } from '../../../lib/motion';
import type { SearchParams } from '../api';

type SortOption = 'rating' | 'price';

export interface ProfessionalResultsProps {
  params: SearchParams;
  onlyAvailable?: boolean;
  sort?: SortOption;
  onPageChange: (page: number) => void;
}

const DEFAULT_LIMIT = 12;

export function ProfessionalResults({
  params,
  onlyAvailable = false,
  sort = 'rating',
  onPageChange,
}: ProfessionalResultsProps): JSX.Element {
  const { data, isPending, isError, refetch } = useSearchProfessionals(params);
  const favoriteIds = useFavoriteIds();
  const skeletonCount = params.limit ?? DEFAULT_LIMIT;

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" aria-label="Carregando profissionais" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        variant="error"
        title="Não foi possível carregar os resultados"
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
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
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${params.page ?? 1}-${sort}-${onlyAvailable}`}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeVariants}
          transition={{ duration: duration.fast }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {items.map((item) => (
            <ProfessionalCard
              key={item.id}
              id={item.id}
              fullName={item.fullName}
              headline={item.headline}
              bio={item.bio}
              hourlyRate={item.hourlyRate}
              ratingAverage={item.ratingAverage}
              ratingCount={item.ratingCount}
              isAvailable={item.isAvailable}
              isFavorite={favoriteIds.has(item.id)}
            />
          ))}
        </motion.div>
      </AnimatePresence>
      {data ? (
        <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
