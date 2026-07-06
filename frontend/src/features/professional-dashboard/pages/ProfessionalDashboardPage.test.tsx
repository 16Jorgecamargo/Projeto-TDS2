import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalDashboardPage } from './ProfessionalDashboardPage';

vi.mock('../components/DashboardQuickActions', () => ({ DashboardQuickActions: () => <div>quick-actions</div> }));
vi.mock('../components/DashboardRevenueWidget', () => ({ DashboardRevenueWidget: () => <div>revenue-widget</div> }));
vi.mock('../../dashboard/components/DashboardContractsWidget', () => ({
  DashboardContractsWidget: () => <div>contracts-widget</div>,
}));
vi.mock('../components/DashboardReviewsWidget', () => ({ DashboardReviewsWidget: () => <div>reviews-widget</div> }));
vi.mock('../components/DashboardPendingQuotesWidget', () => ({
  DashboardPendingQuotesWidget: () => <div>pending-quotes-widget</div>,
}));
vi.mock('../../chat/components/FloatingChatWidget', () => ({ FloatingChatWidget: () => <div>chat-widget</div> }));

describe('ProfessionalDashboardPage', () => {
  it('renderiza o titulo e todos os widgets', () => {
    renderWithProviders(<ProfessionalDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('quick-actions')).toBeInTheDocument();
    expect(screen.getByText('revenue-widget')).toBeInTheDocument();
    expect(screen.getByText('contracts-widget')).toBeInTheDocument();
    expect(screen.getByText('reviews-widget')).toBeInTheDocument();
    expect(screen.getByText('pending-quotes-widget')).toBeInTheDocument();
    expect(screen.getByText('chat-widget')).toBeInTheDocument();
  });
});
