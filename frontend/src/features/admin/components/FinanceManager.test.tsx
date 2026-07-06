import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceManager } from './FinanceManager';
import { usePayments, useRefundPayment, useWithdrawals, useProcessWithdrawal } from '../queries';

vi.mock('../queries', () => ({
  usePayments: vi.fn(),
  useRefundPayment: vi.fn(),
  useWithdrawals: vi.fn(),
  useProcessWithdrawal: vi.fn(),
}));

function paymentsFixture() {
  return {
    data: {
      items: [
        {
          id: 'p1',
          contract_id: 'c1',
          payer_id: 'u1',
          amount: '150.00',
          status: 'captured' as const,
          method: 'pix' as const,
          paid_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  };
}

function withdrawalsFixture() {
  return {
    data: {
      items: [
        {
          id: 'w1',
          wallet_id: 'wal1',
          amount: '200.00',
          payment_method: 'pix' as const,
          status: 'pending' as const,
          destination: 'chave-pix',
          processed_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  };
}

describe('FinanceManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista pagamentos e saques', () => {
    vi.mocked(usePayments).mockReturnValue(paymentsFixture() as never);
    vi.mocked(useWithdrawals).mockReturnValue(withdrawalsFixture() as never);
    vi.mocked(useRefundPayment).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useProcessWithdrawal).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<FinanceManager />);

    expect(screen.getByText('150.00')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();
  });

  it('estorna pagamento com motivo opcional', async () => {
    const mutate = vi.fn();
    vi.mocked(usePayments).mockReturnValue(paymentsFixture() as never);
    vi.mocked(useWithdrawals).mockReturnValue(withdrawalsFixture() as never);
    vi.mocked(useRefundPayment).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useProcessWithdrawal).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<FinanceManager />);
    await user.click(screen.getByRole('button', { name: 'Estornar' }));
    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Servico cancelado');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'p1', reason: 'Servico cancelado' });
  });

  it('aprova saque com um clique, sem modal', async () => {
    const mutate = vi.fn();
    vi.mocked(usePayments).mockReturnValue(paymentsFixture() as never);
    vi.mocked(useWithdrawals).mockReturnValue(withdrawalsFixture() as never);
    vi.mocked(useRefundPayment).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useProcessWithdrawal).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<FinanceManager />);
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));

    expect(mutate).toHaveBeenCalledWith('w1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
