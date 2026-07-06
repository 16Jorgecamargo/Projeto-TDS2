import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('../components/DashboardMetrics', () => ({ DashboardMetrics: () => <div>dashboard-metrics</div> }));

describe('AdminDashboardPage', () => {
  it('mostra titulo e o componente de metricas', () => {
    render(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('dashboard-metrics')).toBeInTheDocument();
  });
});
