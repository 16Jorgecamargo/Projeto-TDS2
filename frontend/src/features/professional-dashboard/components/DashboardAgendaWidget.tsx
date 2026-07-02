import type { JSX } from 'react';
import { useContracts } from '../../contracts/queries';
import { useMyProfile, useSlots } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';

export function DashboardAgendaWidget(): JSX.Element {
  const { data: profile } = useMyProfile();
  const { data: contracts, isPending: isContractsPending } = useContracts();
  const { data: slots, isPending: isSlotsPending } = useSlots(profile?.id);

  const isPending = isContractsPending || isSlotsPending;

  const upcoming = (contracts ?? [])
    .filter(
      (contract) =>
        contract.schedule !== null &&
        !['completed', 'cancelled'].includes(contract.schedule.status) &&
        new Date(contract.schedule.scheduledDate).getTime() > Date.now(),
    )
    .sort(
      (a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime(),
    );
  const next = upcoming[0];
  const slotCount = slots?.length ?? 0;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Agenda</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando agenda" />
      ) : !next && slotCount === 0 ? (
        <EmptyState title="Nenhum compromisso ou disponibilidade cadastrada" />
      ) : (
        <div className="flex flex-col gap-3">
          {next && next.schedule && (
            <div>
              <p className="text-sm font-medium text-ink">{formatDate(next.schedule.scheduledDate)}</p>
              {next.schedule.notes && <p className="text-sm text-muted">{next.schedule.notes}</p>}
            </div>
          )}
          <p className="text-sm text-muted">
            {slotCount} {slotCount === 1 ? 'dia com disponibilidade cadastrada' : 'dias com disponibilidade cadastrada'}
          </p>
        </div>
      )}
    </Card>
  );
}
