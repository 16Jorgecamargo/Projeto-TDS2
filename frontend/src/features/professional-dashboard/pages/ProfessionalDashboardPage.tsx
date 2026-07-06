import type { JSX } from 'react';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardRevenueWidget } from '../components/DashboardRevenueWidget';
import { DashboardContractsWidget } from '../../dashboard/components/DashboardContractsWidget';
import { DashboardReviewsWidget } from '../components/DashboardReviewsWidget';
import { DashboardPendingQuotesWidget } from '../components/DashboardPendingQuotesWidget';
import { FloatingChatWidget } from '../../chat/components/FloatingChatWidget';

export function ProfessionalDashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <DashboardRevenueWidget />
          <DashboardReviewsWidget />
        </div>
        <DashboardContractsWidget />
        <DashboardPendingQuotesWidget />
      </div>
      <FloatingChatWidget />
    </div>
  );
}

export default ProfessionalDashboardPage;
