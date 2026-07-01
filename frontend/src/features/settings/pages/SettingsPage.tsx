import { ConsentsPanel } from '../components/ConsentsPanel';
import { DeleteAccountPanel } from '../components/DeleteAccountPanel';
import { PreferencesForm } from '../components/PreferencesForm';

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Configuracoes</h1>
      <PreferencesForm />
      <ConsentsPanel />
      <DeleteAccountPanel />
    </div>
  );
}
