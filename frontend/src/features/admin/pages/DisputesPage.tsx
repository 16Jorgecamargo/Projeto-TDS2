import type { JSX } from 'react';
import { DisputesTable } from '../components/DisputesTable';
import { Card } from '../../../components/ui/Card';

export function DisputesPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Disputas</h1>
      <Card>
        <DisputesTable />
      </Card>
    </div>
  );
}

export default DisputesPage;
