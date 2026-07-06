import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

vi.mock('./queries', () => ({
  useDashboard: () => ({
    data: {
      counters: { totalUsers: 10, activeContracts: 2, openDemands: 1, gmvLast30Days: '500.00' },
      pending: { reports: 1, disputes: 0, withdrawals: 0 },
      activity: { newUsersByDay: [], completedContractsByDay: [] },
      finance: {
        totalCaptured30d: '500.00',
        totalRefunded30d: '0.00',
        walletBalanceSum: '100.00',
        pendingWithdrawalsAmount: '0.00',
      },
    },
    isLoading: false,
  }),
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderWithProviders() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage (integracao)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra contadores e pendencias vindos do hook de dashboard', () => {
    renderWithProviders();

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByText('500.00').length).not.toBe(0);
  });
});
