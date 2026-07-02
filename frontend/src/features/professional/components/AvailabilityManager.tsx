import { useState } from 'react';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function AvailabilityManager({ professionalId }: { professionalId: string | undefined }) {
  const { data, isPending } = useSlots(professionalId);
  const addSlot = useAddSlot(professionalId);
  const removeSlot = useRemoveSlot(professionalId);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Disponibilidade</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        >
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        />
        <Button type="button" disabled={addSlot.isPending} onClick={() => addSlot.mutate({ weekday, startTime, endTime })}>
          Adicionar
        </Button>
      </div>
      {isPending ? null : !data || data.length === 0 ? (
        <EmptyState title="Nenhum horário cadastrado" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between rounded-sm bg-surface px-3 py-2">
              <span className="text-sm text-ink">
                {WEEKDAYS[slot.weekday]} {slot.startTime}-{slot.endTime}
              </span>
              <button
                type="button"
                onClick={() => removeSlot.mutate(slot.id)}
                className="text-sm font-semibold text-accent underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
