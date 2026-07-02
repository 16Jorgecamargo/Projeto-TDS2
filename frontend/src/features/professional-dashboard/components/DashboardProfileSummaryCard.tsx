import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useMyProfile } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';

export function DashboardProfileSummaryCard(): JSX.Element {
  const { data: profile, isPending } = useMyProfile();

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Meu perfil</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando perfil" />
      ) : profile ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">{profile.headline}</p>
          <p className="text-sm text-muted">
            {profile.ratingAverage.toFixed(1)} ({profile.ratingCount})
          </p>
        </div>
      ) : null}
      <Link to="/professional/profile" className="mt-3 inline-block text-sm font-semibold text-primary">
        Editar perfil
      </Link>
    </Card>
  );
}
