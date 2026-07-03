import type { JSX } from 'react';
import { ConsentsPanel } from '../components/ConsentsPanel';
import { DeleteAccountPanel } from '../components/DeleteAccountPanel';
import { PreferencesForm } from '../components/PreferencesForm';

export default function SettingsPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Configurações</h1>
      <PreferencesForm />
      <ConsentsPanel />
      <DeleteAccountPanel />
    </div>
  );
}
