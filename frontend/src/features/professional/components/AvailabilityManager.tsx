import { useState } from 'react';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export function AvailabilityManager({ professionalId }: { professionalId: string | undefined }) {
  const { data } = useSlots(professionalId);
  const addSlot = useAddSlot(professionalId);
  const removeSlot = useRemoveSlot(professionalId);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Disponibilidade</h2>
      <div className="flex gap-2">
        <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="rounded border px-2 py-1">
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded border px-2 py-1" />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded border px-2 py-1" />
        <button
          type="button"
          disabled={addSlot.isPending}
          onClick={() => addSlot.mutate({ weekday, startTime, endTime })}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>
              {WEEKDAYS[slot.weekday]} {slot.startTime}-{slot.endTime}
            </span>
            <button type="button" onClick={() => removeSlot.mutate(slot.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
