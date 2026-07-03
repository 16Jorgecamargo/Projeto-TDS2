import type { JSX } from 'react';
import { useMyProfile } from '../../professional/queries';
import { ReviewList } from '../../reviews/components/ReviewList';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';

export function DashboardReviewsWidget(): JSX.Element {
  const { data: profile, isPending } = useMyProfile();

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Avaliações recentes</h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
      ) : (
        profile && <ReviewList professionalId={profile.id} />
      )}
    </Card>
  );
}
