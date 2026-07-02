import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalletPage from './pages/WalletPage';

vi.mock('./queries', () => ({
  useWallet: () => ({ data: { balance: 270, pendingBalance: 0, currency: 'BRL' }, isLoading: false }),
  useTransactions: () => ({
    data: {
      items: [
        { id: 't1', type: 'credit', amount: 270, balanceAfter: 270, referenceType: 'payment', description: 'Recebimento de contrato', createdAt: '2026-07-01T12:00:00Z' },
      ],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  }),
  useWithdrawals: () => ({ data: [], isLoading: false }),
  useRequestWithdrawal: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <WalletPage />
    </QueryClientProvider>,
  );
}

describe('WalletPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra saldo formatado e transações', () => {
    renderPage();
    expect(screen.getAllByText(/270/).length).toBeGreaterThan(0);
    expect(screen.getByText('Recebimento de contrato')).toBeInTheDocument();
  });
});
