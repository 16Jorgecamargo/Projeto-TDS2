import { useState } from 'react';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';
import { Card } from '../../../components/ui/Card';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function AvailabilityManager({ professionalId }: { professionalId: string | undefined }) {
  const { data } = useSlots(professionalId);
  const addSlot = useAddSlot(professionalId);
  const removeSlot = useRemoveSlot(professionalId);
  const [times, setTimes] = useState<Record<number, { startTime: string; endTime: string }>>({});

  function timeFor(weekday: number, slot: { startTime: string; endTime: string } | undefined) {
    return times[weekday] ?? { startTime: slot?.startTime ?? '08:00', endTime: slot?.endTime ?? '18:00' };
  }

  function handleToggle(weekday: number, slot: { id: string } | undefined, checked: boolean) {
    if (checked) {
      const { startTime, endTime } = timeFor(weekday, undefined);
      addSlot.mutate({ weekday, startTime, endTime });
      return;
    }
    if (slot) {
      removeSlot.mutate(slot.id);
    }
  }

  function handleTimeChange(
    weekday: number,
    slot: { id: string } | undefined,
    field: 'startTime' | 'endTime',
    value: string,
  ) {
    const current = timeFor(weekday, undefined);
    const next = { ...current, [field]: value };
    setTimes((prev) => ({ ...prev, [weekday]: next }));
    if (slot) {
      removeSlot.mutate(slot.id, { onSuccess: () => addSlot.mutate({ weekday, ...next }) });
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Disponibilidade</h2>
      <ul className="flex flex-col gap-2">
        {WEEKDAYS.map((label, weekday) => {
          const slot = data?.find((s) => s.weekday === weekday);
          const { startTime, endTime } = timeFor(weekday, slot);
          return (
            <li key={weekday} className="flex items-center gap-3 rounded-sm bg-surface px-3 py-2">
              <input
                type="checkbox"
                checked={Boolean(slot)}
                onChange={(e) => handleToggle(weekday, slot, e.target.checked)}
                aria-label={label}
              />
              <span className="w-24 shrink-0 text-sm text-ink">{label}</span>
              <input
                type="time"
                value={startTime}
                disabled={!slot}
                onChange={(e) => handleTimeChange(weekday, slot, 'startTime', e.target.value)}
                className="rounded-sm border border-surface px-2 py-1 text-ink disabled:opacity-50"
              />
              <span className="text-sm text-muted">até</span>
              <input
                type="time"
                value={endTime}
                disabled={!slot}
                onChange={(e) => handleTimeChange(weekday, slot, 'endTime', e.target.value)}
                className="rounded-sm border border-surface px-2 py-1 text-ink disabled:opacity-50"
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
