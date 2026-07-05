import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardDemandsWidget } from './DashboardDemandsWidget';
import { useDemands } from '../../demands/queries';

vi.mock('../../demands/queries', () => ({ useDemands: vi.fn() }));

describe('DashboardDemandsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista demandas abertas ou em andamento', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: {
        items: [
          { id: 'd1', title: 'Pintar sala', status: 'open' },
          { id: 'd2', title: 'Trocar torneira', status: 'in_progress' },
          { id: 'd3', title: 'Concluída', status: 'closed' },
        ],
        page: 1,
        limit: 20,
        total: 3,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardDemandsWidget />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Trocar torneira')).toBeInTheDocument();
    expect(screen.queryByText('Concluída')).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha demandas abertas', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardDemandsWidget />);

    expect(screen.getByText('Nenhuma demanda aberta')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Publicar demanda' })).not.toBeInTheDocument();
  });
});
