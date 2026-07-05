import type { JSX } from 'react';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardDemandsWidget } from '../components/DashboardDemandsWidget';
import { DashboardContractsWidget } from '../components/DashboardContractsWidget';
import { DashboardScheduleWidget } from '../components/DashboardScheduleWidget';
import { DashboardFavoritesWidget } from '../components/DashboardFavoritesWidget';
import { FloatingChatWidget } from '../../chat/components/FloatingChatWidget';

export function ClientDashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardDemandsWidget />
        <DashboardContractsWidget />
        <DashboardScheduleWidget />
        <DashboardFavoritesWidget />
      </div>
      <FloatingChatWidget />
    </div>
  );
}

export default ClientDashboardPage;
