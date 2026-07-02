import type { JSX } from 'react';
import { useMyProfile } from '../queries';
import { ProfileForm } from '../components/ProfileForm';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { PortfolioManager } from '../components/PortfolioManager';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { ServiceAreaManager } from '../components/ServiceAreaManager';

export function ProfessionalProfileEditPage(): JSX.Element {
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-3xl font-bold text-ink">Editar perfil</h1>
      <ProfileForm />
      {profile && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Como aparece no seu perfil público</h2>
          <PortfolioGallery professionalId={profile.id} />
        </div>
      )}
      <PortfolioManager professionalId={profile?.id} />
      {profile && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Disponibilidade atual</h2>
          <AvailabilityGrid professionalId={profile.id} />
        </div>
      )}
      <AvailabilityManager professionalId={profile?.id} />
      <ServiceAreaManager />
    </div>
  );
}

export default ProfessionalProfileEditPage;
