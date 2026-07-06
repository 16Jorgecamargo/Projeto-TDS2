import type { JSX } from 'react';
import { ReportsTable } from '../components/ReportsTable';
import { Card } from '../../../components/ui/Card';

export function ReportsPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Denúncias</h1>
      <Card>
        <ReportsTable />
      </Card>
    </div>
  );
}

export default ReportsPage;
