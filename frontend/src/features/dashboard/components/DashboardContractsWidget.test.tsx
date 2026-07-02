import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardContractsWidget } from './DashboardContractsWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardContractsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra contagem de contratos ativos e concluidos', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', schedule: null },
        { id: 'c2', status: 'active', schedule: null },
        { id: 'c3', status: 'completed', schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardContractsWidget />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha contratos', () => {
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardContractsWidget />);

    expect(screen.getByText('Nenhum contrato ainda')).toBeInTheDocument();
  });
});
