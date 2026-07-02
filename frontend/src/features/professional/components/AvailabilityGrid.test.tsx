import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AvailabilityGrid } from './AvailabilityGrid';
import { useSlots } from '../queries';

vi.mock('../queries', () => ({ useSlots: vi.fn() }));

describe('AvailabilityGrid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza os slots com o dia da semana por extenso', () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 's1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);

    renderWithProviders(<AvailabilityGrid professionalId="p1" />);

    expect(screen.getByText('Segunda: 08:00 - 18:00')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha slots', () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<AvailabilityGrid professionalId="p1" />);

    expect(screen.getByText('Disponibilidade não informada')).toBeInTheDocument();
  });
});
