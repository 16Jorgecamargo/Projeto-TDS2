import type { JSX } from 'react';
import { DashboardMetrics } from '../components/DashboardMetrics';

export function AdminDashboardPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
      <DashboardMetrics />
    </div>
  );
}

export default AdminDashboardPage;
