import { useRef, type JSX } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { useMyProfile } from '../../professional/queries';
import { useProfessionalReviews } from '../../reviews/queries';
import type { Review } from '../../reviews/api';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useFitCount } from '../../../lib/hooks/useFitCount';
import { formatDate } from '../../../lib/utils';

function ReviewPreview({ review }: { review: Review }): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-bg p-4">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            className={index < review.rating ? 'h-3.5 w-3.5 text-accent' : 'h-3.5 w-3.5 text-muted'}
          />
        ))}
        <span className="ml-auto shrink-0 text-xs text-muted">{formatDate(review.createdAt)}</span>
      </div>
      <span className="truncate text-sm font-semibold text-ink">{review.demandTitle}</span>
      <span className="truncate text-xs text-muted">{review.authorName}</span>
      {review.comment && <p className="truncate text-sm text-ink">{review.comment}</p>}
    </div>
  );
}

export function DashboardReviewsWidget(): JSX.Element {
  const { data: profile, isPending: isProfilePending } = useMyProfile();
  const { data, isPending: isReviewsPending } = useProfessionalReviews(profile?.id);
  const items = data?.items ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const visibleCount = useFitCount(listRef, items.length);

  const isPending = isProfilePending || (Boolean(profile?.id) && isReviewsPending);

  return (
    <Card className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-semibold text-ink">Avaliações recentes</h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação ainda"
          description="Este profissional ainda não recebeu avaliações."
          className="h-full w-full flex-1 justify-center"
        />
      ) : (
        <div className="min-h-0 flex-1 rounded-lg bg-surface p-2">
          <ul ref={listRef} className="flex h-full flex-col gap-2 overflow-y-auto">
            {items.slice(0, visibleCount).map((review) => (
              <li key={review.id}>
                <ReviewPreview review={review} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
