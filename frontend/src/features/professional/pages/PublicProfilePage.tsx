import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicProfile } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { ProfessionalProfileHeader } from '../components/ProfessionalProfileHeader';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { ReviewList } from '../../reviews/components/ReviewList';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function PublicProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isPending, isError } = usePublicProfile(id);
  const favoriteIds = useFavoriteIds();

  if (isPending) {
    return <Skeleton className="m-6 h-40 w-full" aria-label="Carregando perfil" />;
  }

  if (isError || !profile) {
    return <EmptyState className="m-6" title="Perfil não encontrado" />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <ProfessionalProfileHeader profile={profile} isFavorite={favoriteIds.has(profile.id)} />
      {profile.bio && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Sobre</h2>
          <p className="text-sm text-ink">{profile.bio}</p>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Áreas de atendimento</h2>
        {profile.serviceAreas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma área informada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.serviceAreas.map((area) => (
              <li key={area.id} className="rounded-full bg-surface px-3 py-1 text-sm text-ink">
                {area.city} - {area.state}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Portfólio</h2>
        <PortfolioGallery professionalId={profile.id} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Disponibilidade</h2>
        <AvailabilityGrid professionalId={profile.id} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Avaliações</h2>
        <ReviewList professionalId={profile.id} />
      </section>
    </div>
  );
}
