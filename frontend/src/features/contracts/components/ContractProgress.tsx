import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';
import type { ProgressUpdate } from '../api';

interface ContractProgressProps {
  updates: ProgressUpdate[];
}

export function ContractProgress({ updates }: ContractProgressProps): JSX.Element {
  if (updates.length === 0) {
    return <EmptyState title="Nenhuma atualização de progresso ainda" />;
  }

  return (
    <ol className="flex flex-col gap-2">
      {updates.map((update) => (
        <li key={update.id} className="rounded-lg bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{update.description}</span>
            {update.percentage !== null && <span className="text-sm text-muted">{update.percentage}%</span>}
          </div>
          <span className="text-xs text-muted">{formatDate(update.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
