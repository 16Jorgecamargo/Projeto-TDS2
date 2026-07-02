import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardAgendaWidget } from './DashboardAgendaWidget';
import { useContracts } from '../../contracts/queries';
import { useMyProfile, useSlots } from '../../professional/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));
vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn(), useSlots: vi.fn() }));

describe('DashboardAgendaWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o proximo compromisso agendado e o total de slots de disponibilidade', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', schedule: { id: 's1', scheduledDate: '2030-01-10T10:00:00Z', durationMinutes: 60, notes: 'Levar ferramentas', status: 'scheduled' } },
        { id: 'c2', status: 'active', schedule: { id: 's2', scheduledDate: '2030-01-05T10:00:00Z', durationMinutes: 60, notes: null, status: 'scheduled' } },
      ],
      isPending: false,
    } as never);
    vi.mocked(useSlots).mockReturnValue({
      data: [
        { id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' },
        { id: 'slot2', weekday: 2, startTime: '08:00', endTime: '18:00' },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardAgendaWidget />);

    expect(screen.getByText('05/01/2030')).toBeInTheDocument();
    expect(screen.getByText('2 dias com disponibilidade cadastrada')).toBeInTheDocument();
  });

  it('ignora compromissos cancelados e passados ao escolher o proximo', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', schedule: { id: 's1', scheduledDate: '2020-01-05T10:00:00Z', durationMinutes: 60, notes: null, status: 'cancelled' } },
        { id: 'c2', status: 'active', schedule: { id: 's2', scheduledDate: '2030-01-10T10:00:00Z', durationMinutes: 60, notes: 'Levar ferramentas', status: 'confirmed' } },
      ],
      isPending: false,
    } as never);
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardAgendaWidget />);

    expect(screen.getByText('10/01/2030')).toBeInTheDocument();
    expect(screen.getByText('Levar ferramentas')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha compromissos nem disponibilidade', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardAgendaWidget />);

    expect(screen.getByText('Nenhum compromisso ou disponibilidade cadastrada')).toBeInTheDocument();
  });
});
