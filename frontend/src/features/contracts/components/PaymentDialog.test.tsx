import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PaymentDialog } from './PaymentDialog';
import { usePayContract } from '../queries';

vi.mock('../queries', () => ({ usePayContract: vi.fn() }));

describe('PaymentDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra somente a opcao pix e confirma o pagamento com ela', async () => {
    const mutate = vi.fn((_method, opts) => opts?.onSuccess?.());
    vi.mocked(usePayContract).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={onClose} />);

    expect(screen.getByLabelText('Pix')).toBeChecked();
    expect(screen.queryByLabelText('Cartão de crédito')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Boleto')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Carteira')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));

    expect(mutate).toHaveBeenCalledWith('pix', expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(onClose).toHaveBeenCalled();
  });
});
