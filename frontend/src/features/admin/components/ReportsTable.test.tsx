import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsTable } from './ReportsTable';
import { useReports, useResolveReport } from '../queries';

vi.mock('../queries', () => ({ useReports: vi.fn(), useResolveReport: vi.fn() }));

function reportsFixture() {
  return {
    data: {
      items: [{ id: 'r1', status: 'pending' as const }],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  };
}

describe('ReportsTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra badge urgente para denuncia pendente', () => {
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<ReportsTable />);

    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('abre modal de confirmacao e cancela sem disparar mutation', async () => {
    const mutate = vi.fn();
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<ReportsTable />);
    await user.click(screen.getByRole('button', { name: 'Aplicar ação' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma resolucao com nota preenchida', async () => {
    const mutate = vi.fn();
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<ReportsTable />);
    await user.click(screen.getByRole('button', { name: 'Aplicar ação' }));
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Conteudo verificado');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'r1', resolution: 'actioned', note: 'Conteudo verificado' });
  });
});
