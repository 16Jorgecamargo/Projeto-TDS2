import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { useDeletionStatus, useRequestDeletion, useCancelDeletion } from '../queries';

vi.mock('../queries', () => ({
  useDeletionStatus: vi.fn(),
  useRequestDeletion: vi.fn(),
  useCancelDeletion: vi.fn(),
}));

describe('DeleteAccountPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('abre modal de confirmacao antes de solicitar exclusao e cancela sem disparar', async () => {
    const request = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({ data: undefined } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: request, isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Solicitar exclusão' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma exclusao no modal e dispara a mutation', async () => {
    const request = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({ data: undefined } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: request, isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Solicitar exclusão' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    expect(request).toHaveBeenCalled();
  });

  it('cancela exclusao ja agendada sem modal de confirmacao', async () => {
    const cancel = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({
      data: { id: 'del1', status: 'pending', requestedAt: '2026-07-01T00:00:00Z', scheduledFor: '2026-07-15T00:00:00Z' },
    } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: cancel, isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(cancel).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
