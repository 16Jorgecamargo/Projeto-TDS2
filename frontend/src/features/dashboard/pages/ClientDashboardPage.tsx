import type { JSX } from 'react';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardDemandsWidget } from '../components/DashboardDemandsWidget';
import { DashboardContractsWidget } from '../components/DashboardContractsWidget';
import { DashboardScheduleWidget } from '../components/DashboardScheduleWidget';
import { DashboardFavoritesWidget } from '../components/DashboardFavoritesWidget';
import { FloatingChatWidget } from '../../chat/components/FloatingChatWidget';

export function ClientDashboardPage(): JSX.Element {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardDemandsWidget />
        <DashboardContractsWidget />
        <div className="flex min-h-0 flex-col gap-4">
          <DashboardScheduleWidget />
          <div className="min-h-0 flex-1">
            <DashboardFavoritesWidget />
          </div>
        </div>
      </div>
      <FloatingChatWidget />
    </div>
  );
}

export default ClientDashboardPage;
