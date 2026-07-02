import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardActiveContractsWidget } from './DashboardActiveContractsWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardActiveContractsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista contratos ativos com valor total', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', total: 500, schedule: null },
        { id: 'c2', status: 'completed', total: 300, schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardActiveContractsWidget />);

    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 300,00')).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha contratos ativos', () => {
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardActiveContractsWidget />);

    expect(screen.getByText('Nenhum contrato em andamento')).toBeInTheDocument();
  });
});
