import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DisputeDialog } from './DisputeDialog';
import { useOpenDispute } from '../queries';

vi.mock('../queries', () => ({ useOpenDispute: vi.fn() }));

describe('DisputeDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('abre disputa com o motivo informado', async () => {
    const mutate = vi.fn((_reason, opts) => opts?.onSuccess?.());
    vi.mocked(useOpenDispute).mockReturnValue({ mutate, isPending: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<DisputeDialog contractId="c1" onClose={onClose} />);

    await user.type(screen.getByLabelText('Motivo'), 'Servico nao foi concluido conforme combinado');
    await user.click(screen.getByRole('button', { name: 'Abrir disputa' }));

    expect(mutate).toHaveBeenCalledWith(
      'Servico nao foi concluido conforme combinado',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha ao clicar em cancelar', async () => {
    vi.mocked(useOpenDispute).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<DisputeDialog contractId="c1" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
