import type { JSX } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { useProfessionalReviews } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';

export interface ReviewListProps {
  professionalId: string;
}

export function ReviewList({ professionalId }: ReviewListProps): JSX.Element {
  const { data, isPending } = useProfessionalReviews(professionalId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState title="Nenhuma avaliação ainda" description="Este profissional ainda não recebeu avaliações." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.items.map((review) => (
        <li key={review.id} className="rounded-lg bg-surface p-4">
          <div className="mb-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon
                key={index}
                className={index < review.rating ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-surface'}
              />
            ))}
          </div>
          {review.comment && <p className="text-sm text-ink">{review.comment}</p>}
          <p className="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
