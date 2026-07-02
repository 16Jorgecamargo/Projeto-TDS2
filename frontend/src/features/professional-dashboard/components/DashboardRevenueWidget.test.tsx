import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardRevenueWidget } from './DashboardRevenueWidget';
import { useWallet, useTransactions } from '../../wallet/queries';

vi.mock('../../wallet/queries', () => ({ useWallet: vi.fn(), useTransactions: vi.fn() }));

describe('DashboardRevenueWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra saldo disponivel, pendente e receita do mes somando creditos', () => {
    vi.mocked(useWallet).mockReturnValue({
      data: { id: 'w1', userId: 'u1', balance: 500, pendingBalance: 100, currency: 'BRL', createdAt: '', updatedAt: '' },
      isPending: false,
    } as never);
    vi.mocked(useTransactions).mockReturnValue({
      data: {
        items: [
          { id: 't1', walletId: 'w1', type: 'credit', amount: 200, balanceAfter: 500, referenceType: 'payment', referenceId: null, description: null, createdAt: new Date().toISOString() },
          { id: 't2', walletId: 'w1', type: 'debit', amount: 50, balanceAfter: 300, referenceType: 'withdrawal', referenceId: null, description: null, createdAt: new Date().toISOString() },
          { id: 't3', walletId: 'w1', type: 'credit', amount: 100, balanceAfter: 400, referenceType: 'payment', referenceId: null, description: null, createdAt: '2020-01-01T00:00:00Z' },
        ],
        page: 1,
        limit: 20,
        total: 3,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useWallet).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(useTransactions).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByRole('status', { name: 'Carregando receita' })).toBeInTheDocument();
  });
});
