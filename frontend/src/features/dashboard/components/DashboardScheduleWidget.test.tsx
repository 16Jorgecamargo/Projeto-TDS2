import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardScheduleWidget } from './DashboardScheduleWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardScheduleWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o agendamento mais proximo entre os contratos', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        {
          id: 'c1',
          status: 'active',
          schedule: { id: 's1', scheduledDate: '2026-08-01T09:00:00.000Z', durationMinutes: 60, notes: 'Levar ferramentas', status: 'scheduled' },
        },
        {
          id: 'c2',
          status: 'active',
          schedule: { id: 's2', scheduledDate: '2026-07-10T09:00:00.000Z', durationMinutes: 30, notes: null, status: 'scheduled' },
        },
        { id: 'c3', status: 'active', schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardScheduleWidget />);

    expect(screen.getByText('Próximo agendamento')).toBeInTheDocument();
  });

  it('ignora compromissos cancelados e passados ao escolher o proximo', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        {
          id: 'c1',
          status: 'active',
          schedule: { id: 's1', scheduledDate: '2020-01-05T09:00:00.000Z', durationMinutes: 60, notes: null, status: 'cancelled' },
        },
        {
          id: 'c2',
          status: 'active',
          schedule: { id: 's2', scheduledDate: '2030-07-10T09:00:00.000Z', durationMinutes: 30, notes: 'Confirmar endereco', status: 'confirmed' },
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardScheduleWidget />);

    expect(screen.getByText('Confirmar endereco')).toBeInTheDocument();
  });

  it('nao renderiza nada quando nenhum contrato tem agendamento', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [{ id: 'c1', status: 'active', schedule: null }],
      isPending: false,
    } as never);

    const { container } = renderWithProviders(<DashboardScheduleWidget />);

    expect(container).toBeEmptyDOMElement();
  });
});
