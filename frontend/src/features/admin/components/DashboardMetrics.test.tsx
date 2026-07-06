import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardMetrics } from './DashboardMetrics';
import { useDashboard } from '../queries';

vi.mock('../queries', () => ({ useDashboard: vi.fn() }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function dashboardFixture() {
  return {
    data: {
      counters: { totalUsers: 120, activeContracts: 34, openDemands: 12, gmvLast30Days: '15320.50' },
      pending: { reports: 3, disputes: 1, withdrawals: 2 },
      activity: {
        newUsersByDay: [{ date: '2026-07-01', count: 5 }],
        completedContractsByDay: [{ date: '2026-07-01', count: 2 }],
      },
      finance: {
        totalCaptured30d: '18000.00',
        totalRefunded30d: '2679.50',
        walletBalanceSum: '9450.00',
        pendingWithdrawalsAmount: '1200.00',
      },
    },
    isLoading: false,
  };
}

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <DashboardMetrics />
    </MemoryRouter>,
  );
}

describe('DashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra os contadores gerais', () => {
    vi.mocked(useDashboard).mockReturnValue(dashboardFixture() as never);

    renderWithRouter();

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('15320.50')).toBeInTheDocument();
  });

  it('mostra a fila de pendencias e navega ao clicar', async () => {
    vi.mocked(useDashboard).mockReturnValue(dashboardFixture() as never);
    const user = userEvent.setup();

    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /Denúncias pendentes/i }));

    expect(navigateMock).toHaveBeenCalledWith('/admin/reports');
  });

  it('mostra o financeiro resumido', () => {
    vi.mocked(useDashboard).mockReturnValue(dashboardFixture() as never);

    renderWithRouter();

    expect(screen.getByText('18000.00')).toBeInTheDocument();
    expect(screen.getByText('2679.50')).toBeInTheDocument();
    expect(screen.getByText('9450.00')).toBeInTheDocument();
    expect(screen.getByText('1200.00')).toBeInTheDocument();
  });

  it('renderiza os graficos de atividade', () => {
    vi.mocked(useDashboard).mockReturnValue(dashboardFixture() as never);

    renderWithRouter();

    expect(screen.getAllByTestId('line-chart')).toHaveLength(2);
  });

  it('mostra estado de carregamento', () => {
    vi.mocked(useDashboard).mockReturnValue({ data: undefined, isLoading: true } as never);

    renderWithRouter();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
