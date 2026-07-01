import { ProfileForm } from '../components/ProfileForm';

export default function ProfessionalDashboardPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Area do profissional</h1>
      <ProfileForm />
    </div>
  );
}
