import type { JSX } from 'react';
import { AuditTable } from '../components/AuditTable';
import { Card } from '../../../components/ui/Card';

export function AuditPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Auditoria</h1>
      <Card>
        <AuditTable />
      </Card>
    </div>
  );
}

export default AuditPage;
