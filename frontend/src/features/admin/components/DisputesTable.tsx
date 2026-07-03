import { useState, type JSX } from 'react';
import { useDisputes, useResolveDispute } from '../queries';
import type { DisputeOutcome, DisputeStatus } from '../schemas';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Aberta',
  under_review: 'Em revisão',
  resolved: 'Resolvida',
  rejected: 'Rejeitada',
};

const PENDING_STATUSES: DisputeStatus[] = ['open', 'under_review'];

interface PendingAction {
  id: string;
  outcome: DisputeOutcome;
  label: string;
}

export function DisputesTable(): JSX.Element {
  const disputes = useDisputes();
  const resolve = useResolveDispute();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  if (disputes.isLoading || !disputes.data) {
    return <p className="text-sm text-muted">Carregando disputas...</p>;
  }

  if (disputes.data.items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma disputa em aberto.</p>;
  }

  function openAction(id: string, outcome: DisputeOutcome, label: string) {
    setNote('');
    setPendingAction({ id, outcome, label });
  }

  function closeAction() {
    setPendingAction(null);
  }

  function confirmAction() {
    if (!pendingAction || !note.trim()) return;
    resolve.mutate({ id: pendingAction.id, outcome: pendingAction.outcome, note });
    setPendingAction(null);
  }

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-2">Disputa</th>
            <th className="py-2">Status</th>
            <th className="py-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {disputes.data.items.map((dispute) => (
            <tr key={dispute.id} className="border-t border-surface">
              <td className="py-2 text-ink">{dispute.id}</td>
              <td className="py-2">
                <Badge tone={PENDING_STATUSES.includes(dispute.status) ? 'urgent' : 'neutral'}>
                  {STATUS_LABELS[dispute.status]}
                </Badge>
              </td>
              <td className="space-x-3 py-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'refund_client', 'Reembolsar cliente')}
                >
                  Reembolsar cliente
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'release_professional', 'Liberar profissional')}
                >
                  Liberar profissional
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'split', 'Dividir')}
                >
                  Dividir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAction && (
        <Modal open onClose={closeAction} title={pendingAction.label}>
          <div className="flex flex-col gap-3">
            <label htmlFor="dispute-note" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Nota</span>
              <textarea
                id="dispute-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="rounded-sm border border-surface px-3 py-2 text-ink"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAction}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={resolve.isPending || !note.trim()}
                onClick={confirmAction}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default DisputesTable;
