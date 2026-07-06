import { useState, type JSX } from 'react';
import { usePayments, useRefundPayment, useWithdrawals, useProcessWithdrawal } from '../queries';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const inputClass = 'rounded-sm border border-surface px-3 py-2 text-ink';

export function FinanceManager(): JSX.Element {
  const payments = usePayments({ status: 'captured' });
  const refund = useRefundPayment();
  const withdrawals = useWithdrawals({ status: 'pending' });
  const process = useProcessWithdrawal();

  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  function openRefund(id: string) {
    setReason('');
    setRefundTargetId(id);
  }

  function closeRefund() {
    setRefundTargetId(null);
  }

  function confirmRefund() {
    if (!refundTargetId) return;
    const trimmed = reason.trim();
    const finalReason = trimmed.length >= 3 ? trimmed : null;
    refund.mutate({ id: refundTargetId, reason: finalReason });
    setRefundTargetId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Pagamentos</h3>
        {payments.isLoading || !payments.data ? (
          <p className="text-sm text-muted">Carregando pagamentos...</p>
        ) : payments.data.items.length === 0 ? (
          <p className="text-sm text-muted">Nenhum pagamento capturado encontrado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Valor</th>
                <th className="py-2">Método</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {payments.data.items.map((payment) => (
                <tr key={payment.id} className="border-t border-surface">
                  <td className="py-2 text-ink">{payment.amount}</td>
                  <td className="py-2 text-ink">{payment.method}</td>
                  <td className="py-2">
                    <Badge tone="neutral">{payment.status}</Badge>
                  </td>
                  <td className="py-2">
                    <Button type="button" variant="accent" size="sm" onClick={() => openRefund(payment.id)}>
                      Estornar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Saques pendentes</h3>
        {withdrawals.isLoading || !withdrawals.data ? (
          <p className="text-sm text-muted">Carregando saques...</p>
        ) : withdrawals.data.items.length === 0 ? (
          <p className="text-sm text-muted">Nenhum saque pendente.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Valor</th>
                <th className="py-2">Destino</th>
                <th className="py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.data.items.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-t border-surface">
                  <td className="py-2 text-ink">{withdrawal.amount}</td>
                  <td className="py-2 text-ink">{withdrawal.destination}</td>
                  <td className="py-2">
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      disabled={process.isPending}
                      onClick={() => process.mutate(withdrawal.id)}
                    >
                      Aprovar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {refundTargetId && (
        <Modal open onClose={closeRefund} title="Estornar pagamento">
          <div className="flex flex-col gap-3">
            <label htmlFor="refund-reason" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Motivo (opcional)</span>
              <textarea
                id="refund-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeRefund}>
                Cancelar
              </Button>
              <Button type="button" variant="accent" disabled={refund.isPending} onClick={confirmRefund}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
