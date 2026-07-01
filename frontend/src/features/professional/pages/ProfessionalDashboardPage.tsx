import { ProfileForm } from '../components/ProfileForm';
import { PortfolioManager } from '../components/PortfolioManager';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { ServiceAreaManager } from '../components/ServiceAreaManager';
import { useMyProfile } from '../queries';

export default function ProfessionalDashboardPage() {
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Area do profissional</h1>
      <ProfileForm />
      <PortfolioManager professionalId={profile?.id} />
      <AvailabilityManager professionalId={profile?.id} />
      <ServiceAreaManager />
    </div>
  );
}
