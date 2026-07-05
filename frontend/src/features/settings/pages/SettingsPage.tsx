import type { JSX } from 'react';
import { DeleteAccountPanel } from '../components/DeleteAccountPanel';
import { PreferencesForm } from '../components/PreferencesForm';
import { BackLink } from '../../../components/ui/BackLink';

export default function SettingsPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <BackLink />
      <h1 className="text-2xl font-semibold text-ink">Configurações</h1>
      <PreferencesForm />
      <DeleteAccountPanel />
    </div>
  );
}
