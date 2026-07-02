import type { JSX } from 'react';
import { useSlots } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export interface AvailabilityGridProps {
  professionalId: string;
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function AvailabilityGrid({ professionalId }: AvailabilityGridProps): JSX.Element {
  const { data, isPending } = useSlots(professionalId);

  if (isPending) {
    return <Skeleton className="h-24 w-full" aria-label="Carregando disponibilidade" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Disponibilidade não informada" />;
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {data.map((slot) => (
        <li key={slot.id} className="rounded-md bg-surface px-3 py-2 text-sm text-ink">
          {WEEKDAY_LABELS[slot.weekday]}: {slot.startTime} - {slot.endTime}
        </li>
      ))}
    </ul>
  );
}
