import type { JSX } from 'react';
import { useMyProfile } from '../../professional/queries';
import { ReviewList } from '../../reviews/components/ReviewList';
import { Card } from '../../../components/ui/Card';

export function DashboardReviewsWidget(): JSX.Element {
  const { data: profile } = useMyProfile();

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Avaliações recentes</h2>
      {profile && <ReviewList professionalId={profile.id} />}
    </Card>
  );
}
