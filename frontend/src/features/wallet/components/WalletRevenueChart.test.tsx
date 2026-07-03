import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletRevenueChart } from './WalletRevenueChart';
import { useTransactions } from '../queries';

vi.mock('../queries', () => ({ useTransactions: vi.fn() }));

describe('WalletRevenueChart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca transacoes com limite de 100 para montar o grafico', () => {
    vi.mocked(useTransactions).mockReturnValue({
      data: { items: [], page: 1, limit: 100, total: 0 },
      isPending: false,
    } as never);

    render(<WalletRevenueChart />);

    expect(useTransactions).toHaveBeenCalledWith(1, 100);
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useTransactions).mockReturnValue({ data: undefined, isPending: true } as never);

    render(<WalletRevenueChart />);

    expect(screen.getByRole('status', { name: 'Carregando gráfico de receita' })).toBeInTheDocument();
  });

  it('soma creditos do mes corrente na barra, ignorando debitos', () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)).toISOString();
    vi.mocked(useTransactions).mockReturnValue({
      data: {
        items: [
          {
            id: 't1', walletId: 'w1', type: 'credit', amount: 200, balanceAfter: 200,
            referenceType: 'payment', referenceId: null, description: null, createdAt: thisMonth,
          },
          {
            id: 't2', walletId: 'w1', type: 'debit', amount: 50, balanceAfter: 150,
            referenceType: 'withdrawal', referenceId: null, description: null, createdAt: thisMonth,
          },
        ],
        page: 1, limit: 100, total: 2,
      },
      isPending: false,
    } as never);

    render(<WalletRevenueChart />);

    expect(screen.getByTitle('R$ 200,00')).toBeInTheDocument();
  });
});
