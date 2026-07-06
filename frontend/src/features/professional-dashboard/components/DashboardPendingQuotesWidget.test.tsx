import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardPendingQuotesWidget } from './DashboardPendingQuotesWidget';
import { useMyPendingQuotes } from '../../demands/queries';

vi.mock('../../demands/queries', () => ({ useMyPendingQuotes: vi.fn() }));

describe('DashboardPendingQuotesWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista orcamentos pendentes com titulo da demanda e valor', () => {
    vi.mocked(useMyPendingQuotes).mockReturnValue({
      data: [
        {
          id: 'q1',
          demandId: 'd1',
          professionalId: 'p1',
          message: null,
          total: 350,
          status: 'pending',
          validUntil: null,
          createdAt: '2026-01-01T00:00:00Z',
          demandTitle: 'Instalação elétrica',
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardPendingQuotesWidget />);

    expect(screen.getByText('Instalação elétrica')).toBeInTheDocument();
    expect(screen.getByText('R$ 350,00')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha orcamentos pendentes', () => {
    vi.mocked(useMyPendingQuotes).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardPendingQuotesWidget />);

    expect(screen.getByText('Nenhum orçamento pendente')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useMyPendingQuotes).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardPendingQuotesWidget />);

    expect(screen.getByRole('status', { name: 'Carregando orçamentos' })).toBeInTheDocument();
  });
});
