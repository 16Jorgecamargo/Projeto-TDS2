import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import DemandListPage from './DemandListPage';
import { useDemands } from '../queries';

vi.mock('../queries', () => ({ useDemands: vi.fn(), useDeleteDemand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) }));
vi.mock('../../professional/queries', () => ({ useCategories: vi.fn(() => ({ data: [] })) }));

describe('DemandListPage', () => {
  it('mostra estado vazio com CTA quando nao ha demandas', () => {
    vi.mocked(useDemands).mockReturnValue({ data: { items: [], page: 1, limit: 20, total: 0 }, isPending: false } as never);

    renderWithProviders(<DemandListPage />);

    expect(screen.getByText('Nenhuma demanda ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar demanda' })).toBeInTheDocument();
  });

  it('lista as demandas retornadas', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: {
        items: [{ id: 'd1', title: 'Pintar sala', budgetMin: 100, budgetMax: 200, status: 'open', clientId: '', categoryId: '', description: '', images: [], tagIds: [], quotesCount: 0, createdAt: new Date().toISOString() }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DemandListPage />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
  });

  it('some da lista quando a demanda vira contrato (em andamento) ou e concluida', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: {
        items: [
          { id: 'd1', title: 'Virou contrato', budgetMin: 100, budgetMax: 200, status: 'in_progress', clientId: '', categoryId: '', description: '', images: [], tagIds: [], quotesCount: 1, createdAt: new Date().toISOString() },
          { id: 'd2', title: 'Concluida', budgetMin: 100, budgetMax: 200, status: 'closed', clientId: '', categoryId: '', description: '', images: [], tagIds: [], quotesCount: 1, createdAt: new Date().toISOString() },
        ],
        page: 1,
        limit: 20,
        total: 2,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DemandListPage />);

    expect(screen.getByText('Nenhuma demanda ainda')).toBeInTheDocument();
    expect(screen.queryByText('Virou contrato')).not.toBeInTheDocument();
    expect(screen.queryByText('Concluida')).not.toBeInTheDocument();
  });
});
