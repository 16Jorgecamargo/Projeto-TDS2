import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputesTable } from './DisputesTable';
import { useDisputes, useResolveDispute } from '../queries';

vi.mock('../queries', () => ({ useDisputes: vi.fn(), useResolveDispute: vi.fn() }));

function disputesFixture() {
  return {
    data: {
      items: [{ id: 'd1', status: 'open' as const, outcome: null }],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  };
}

describe('DisputesTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra badge urgente para disputa aberta', () => {
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<DisputesTable />);

    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('abre modal com nota obrigatoria e nao confirma sem preencher', async () => {
    const mutate = vi.fn();
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<DisputesTable />);
    await user.click(screen.getByRole('button', { name: 'Reembolsar cliente' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('confirma resolucao apos preencher a nota', async () => {
    const mutate = vi.fn();
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<DisputesTable />);
    await user.click(screen.getByRole('button', { name: 'Liberar profissional' }));
    await user.type(screen.getByLabelText('Nota'), 'Evidencias confirmam entrega');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({
      id: 'd1',
      outcome: 'release_professional',
      note: 'Evidencias confirmam entrega',
    });
  });
});
