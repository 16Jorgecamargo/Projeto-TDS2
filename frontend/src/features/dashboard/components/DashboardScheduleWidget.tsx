import type { JSX } from 'react';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/utils';

export function DashboardScheduleWidget(): JSX.Element | null {
  const { data, isPending } = useContracts();

  if (isPending) {
    return (
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Próximo agendamento</h2>
        <Skeleton className="h-16 w-full" aria-label="Carregando agendamento" />
      </Card>
    );
  }

  const scheduled = (data ?? [])
    .filter((contract) => contract.schedule !== null)
    .sort(
      (a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime(),
    );

  const next = scheduled[0];
  if (!next || !next.schedule) return null;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Próximo agendamento</h2>
      <p className="text-sm font-medium text-ink">{formatDate(next.schedule.scheduledDate)}</p>
      {next.schedule.notes && <p className="text-sm text-muted">{next.schedule.notes}</p>}
    </Card>
  );
}
