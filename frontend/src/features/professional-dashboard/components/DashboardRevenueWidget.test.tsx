import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardRevenueWidget } from './DashboardRevenueWidget';
import { useWallet, useTransactions, useWithdrawals } from '../../wallet/queries';

vi.mock('../../wallet/queries', () => ({
  useWallet: vi.fn(),
  useTransactions: vi.fn(),
  useWithdrawals: vi.fn(),
  useRequestWithdrawal: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

describe('DashboardRevenueWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra saldo disponivel, pendente, receita do mes e receita sacada', () => {
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
    vi.mocked(useWithdrawals).mockReturnValue({
      data: [
        { id: 'wd1', walletId: 'w1', amount: 150, paymentMethod: 'pix', status: 'completed', destination: 'chave@pix.com', processedAt: null, createdAt: '' },
        { id: 'wd2', walletId: 'w1', amount: 30, paymentMethod: 'pix', status: 'failed', destination: 'chave@pix.com', processedAt: null, createdAt: '' },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('Receita sacada')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useWallet).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(useTransactions).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(useWithdrawals).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByRole('status', { name: 'Carregando receita' })).toBeInTheDocument();
  });

  it('abre o dialog de saque ao clicar em Sacar', async () => {
    vi.mocked(useWallet).mockReturnValue({
      data: { id: 'w1', userId: 'u1', balance: 500, pendingBalance: 0, currency: 'BRL', createdAt: '', updatedAt: '' },
      isPending: false,
    } as never);
    vi.mocked(useTransactions).mockReturnValue({ data: { items: [], page: 1, limit: 20, total: 0 }, isPending: false } as never);
    vi.mocked(useWithdrawals).mockReturnValue({ data: [], isPending: false } as never);

    const user = userEvent.setup();
    renderWithProviders(<DashboardRevenueWidget />);

    await user.click(screen.getByRole('button', { name: 'Sacar' }));

    expect(screen.getByRole('heading', { name: 'Solicitar saque' })).toBeInTheDocument();
  });
});
