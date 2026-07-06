import type { JSX } from 'react';
import { ReportsTable } from '../components/ReportsTable';
import { DisputesTable } from '../components/DisputesTable';
import { UsersTable } from '../components/UsersTable';
import { AuditTable } from '../components/AuditTable';
import { CatalogManager } from '../components/CatalogManager';
import { FinanceManager } from '../components/FinanceManager';
import { Card } from '../../../components/ui/Card';

export function AdminDashboardPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold text-ink">Moderação</h1>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Denúncias</h2>
        <ReportsTable />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Disputas</h2>
        <DisputesTable />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Usuários</h2>
        <UsersTable />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Auditoria</h2>
        <AuditTable />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Catálogo</h2>
        <CatalogManager />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Financeiro</h2>
        <FinanceManager />
      </Card>
    </div>
  );
}

export default AdminDashboardPage;
