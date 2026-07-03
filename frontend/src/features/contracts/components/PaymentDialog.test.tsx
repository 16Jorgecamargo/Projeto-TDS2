import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PaymentDialog } from './PaymentDialog';
import { useWallet } from '../../wallet/queries';
import { usePayContract } from '../queries';

vi.mock('../../wallet/queries', () => ({ useWallet: vi.fn() }));
vi.mock('../queries', () => ({ usePayContract: vi.fn() }));

function walletFixture(balance: number) {
  return { id: 'w1', userId: 'u1', balance, pendingBalance: 0, currency: 'BRL', createdAt: '', updatedAt: '' };
}

describe('PaymentDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma pagamento com o metodo selecionado', async () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(500) } as never);
    const mutate = vi.fn((_method, opts) => opts?.onSuccess?.());
    vi.mocked(usePayContract).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={onClose} />);

    await user.click(screen.getByLabelText('Pix'));
    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));

    expect(mutate).toHaveBeenCalledWith('pix', expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(onClose).toHaveBeenCalled();
  });

  it('desabilita confirmacao quando o saldo da carteira e insuficiente pro metodo carteira', () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(100) } as never);
    vi.mocked(usePayContract).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={vi.fn()} />);

    expect(screen.getByText('Saldo da carteira insuficiente para pagar com este método.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pagamento' })).toBeDisabled();
  });

  it('nao bloqueia metodo externo mesmo com saldo insuficiente na carteira', async () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(100) } as never);
    vi.mocked(usePayContract).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={vi.fn()} />);

    await user.click(screen.getByLabelText('Boleto'));

    expect(screen.queryByText('Saldo da carteira insuficiente para pagar com este método.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pagamento' })).not.toBeDisabled();
  });
});
