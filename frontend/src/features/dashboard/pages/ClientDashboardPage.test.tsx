import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ClientDashboardPage } from './ClientDashboardPage';

vi.mock('../components/DashboardQuickActions', () => ({ DashboardQuickActions: () => <div>quick-actions</div> }));
vi.mock('../components/DashboardDemandsWidget', () => ({ DashboardDemandsWidget: () => <div>demands-widget</div> }));
vi.mock('../components/DashboardContractsWidget', () => ({ DashboardContractsWidget: () => <div>contracts-widget</div> }));
vi.mock('../components/DashboardScheduleWidget', () => ({ DashboardScheduleWidget: () => <div>schedule-widget</div> }));
vi.mock('../components/DashboardFavoritesWidget', () => ({ DashboardFavoritesWidget: () => <div>favorites-widget</div> }));
vi.mock('../components/DashboardNotificationsWidget', () => ({
  DashboardNotificationsWidget: () => <div>notifications-widget</div>,
}));

describe('ClientDashboardPage', () => {
  it('renderiza o titulo e todos os widgets', () => {
    renderWithProviders(<ClientDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByText('quick-actions')).toBeInTheDocument();
    expect(screen.getByText('demands-widget')).toBeInTheDocument();
    expect(screen.getByText('contracts-widget')).toBeInTheDocument();
    expect(screen.getByText('schedule-widget')).toBeInTheDocument();
    expect(screen.getByText('favorites-widget')).toBeInTheDocument();
    expect(screen.getByText('notifications-widget')).toBeInTheDocument();
  });
});
