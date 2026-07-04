import { useState, type JSX } from 'react';
import { useReports, useResolveReport } from '../queries';
import type { ReportResolution, ReportStatus } from '../schemas';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendente',
  reviewed: 'Revisada',
  dismissed: 'Descartada',
  actioned: 'Ação aplicada',
};

const PENDING_STATUSES: ReportStatus[] = ['pending'];

interface PendingAction {
  id: string;
  resolution: ReportResolution;
  label: string;
}

export function ReportsTable(): JSX.Element {
  const reports = useReports();
  const resolve = useResolveReport();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  if (reports.isLoading || !reports.data) {
    return <p className="text-sm text-muted">Carregando denúncias...</p>;
  }

  if (reports.data.items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma denúncia pendente.</p>;
  }

  function openAction(id: string, resolution: ReportResolution, label: string) {
    setNote('');
    setPendingAction({ id, resolution, label });
  }

  function closeAction() {
    setPendingAction(null);
  }

  function confirmAction() {
    if (!pendingAction) return;
    resolve.mutate({ id: pendingAction.id, resolution: pendingAction.resolution, note: note || undefined });
    setPendingAction(null);
  }

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-2">Denúncia</th>
            <th className="py-2">Status</th>
            <th className="py-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {reports.data.items.map((report) => (
            <tr key={report.id} className="border-t border-surface">
              <td className="py-2 text-ink">{report.id}</td>
              <td className="py-2">
                <Badge tone={PENDING_STATUSES.includes(report.status) ? 'accent' : 'neutral'}>
                  {STATUS_LABELS[report.status]}
                </Badge>
              </td>
              <td className="space-x-3 py-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(report.id, 'actioned', 'Aplicar ação')}
                >
                  Aplicar ação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(report.id, 'dismissed', 'Descartar')}
                >
                  Descartar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAction && (
        <Modal open onClose={closeAction} title={pendingAction.label}>
          <div className="flex flex-col gap-3">
            <label htmlFor="report-note" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Nota (opcional)</span>
              <textarea
                id="report-note"
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
              <Button type="button" variant="accent" disabled={resolve.isPending} onClick={confirmAction}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
