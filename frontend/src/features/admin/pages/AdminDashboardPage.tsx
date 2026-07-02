import { ReportsTable } from '../components/ReportsTable';
import { DisputesTable } from '../components/DisputesTable';

export function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Moderação</h1>
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-medium">Denúncias</h2>
        <ReportsTable />
      </section>
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-medium">Disputas</h2>
        <DisputesTable />
      </section>
    </div>
  );
}

export default AdminDashboardPage;
