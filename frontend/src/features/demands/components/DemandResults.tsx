import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DemandCard } from './DemandCard';
import { Pagination } from '../../landing/components/Pagination';
import { useDemandSearch } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { fadeVariants, duration } from '../../../lib/motion';
import type { DemandListParams } from '../api';

export interface DemandResultsProps {
  params: DemandListParams;
  onPageChange: (page: number) => void;
}

const DEFAULT_LIMIT = 12;

export function DemandResults({ params, onPageChange }: DemandResultsProps): JSX.Element {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useDemandSearch(params);
  const skeletonCount = params.limit ?? DEFAULT_LIMIT;

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" aria-label="Carregando demandas" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        variant="error"
        title="Não foi possível carregar as demandas"
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return <EmptyState title="Nenhuma demanda encontrada" description="Tente ampliar os filtros de busca." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={params.page ?? 1}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeVariants}
          transition={{ duration: duration.fast }}
          className="flex flex-col gap-3"
        >
          {items.map((demand) => (
            <DemandCard key={demand.id} demand={demand} onOpen={(id) => navigate(`/demands/${id}`)} />
          ))}
        </motion.div>
      </AnimatePresence>
      {data ? (
        <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
