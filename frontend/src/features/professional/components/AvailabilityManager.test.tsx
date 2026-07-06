import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AvailabilityManager } from './AvailabilityManager';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';

vi.mock('../queries', () => ({ useSlots: vi.fn(), useAddSlot: vi.fn(), useRemoveSlot: vi.fn() }));

describe('AvailabilityManager', () => {
  let addMutate: ReturnType<typeof vi.fn>;
  let removeMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addMutate = vi.fn();
    removeMutate = vi.fn();
    vi.mocked(useAddSlot).mockReturnValue({ mutate: addMutate, isPending: false } as never);
    vi.mocked(useRemoveSlot).mockReturnValue({ mutate: removeMutate, isPending: false } as never);
  });

  it('mostra os 7 dias da semana com checkbox e horarios desabilitados quando nao ha slot', () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByText('Domingo')).toBeInTheDocument();
    expect(screen.getByText('Sábado')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.getByLabelText('Segunda')).not.toBeChecked();
  });

  it('marca o checkbox e mostra horarios do dia com slot cadastrado', () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByLabelText('Segunda')).toBeChecked();
  });

  it('adiciona slot ao marcar o checkbox de um dia', async () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);
    await user.click(screen.getByLabelText('Segunda'));

    expect(addMutate).toHaveBeenCalledWith({ weekday: 1, startTime: '08:00', endTime: '18:00' });
  });

  it('remove slot ao desmarcar o checkbox de um dia', async () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);
    const user = userEvent.setup();

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);
    await user.click(screen.getByLabelText('Segunda'));

    expect(removeMutate).toHaveBeenCalledWith('slot1');
  });
});
