import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AvailabilityManager } from './AvailabilityManager';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';

vi.mock('../queries', () => ({ useSlots: vi.fn(), useAddSlot: vi.fn(), useRemoveSlot: vi.fn() }));

describe('AvailabilityManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddSlot).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemoveSlot).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('mostra estado vazio quando nao ha slots cadastrados', () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByText('Nenhum horário cadastrado')).toBeInTheDocument();
  });

  it('lista slots cadastrados', () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByText('Segunda 08:00-18:00')).toBeInTheDocument();
  });
});
