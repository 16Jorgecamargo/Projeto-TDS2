import type { JSX } from 'react';
import { usePayContract } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';

interface PaymentDialogProps {
  contractId: string;
  total: number;
  onClose: () => void;
}

export function PaymentDialog({ contractId, total, onClose }: PaymentDialogProps): JSX.Element {
  const payContract = usePayContract(contractId);

  return (
    <Modal open onClose={onClose} title="Pagar contrato">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Valor a pagar: <span className="font-semibold text-ink">{formatCurrency(total)}</span>
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted">Método de pagamento</legend>
          <label htmlFor="payment-method-pix" className="flex items-center gap-2 text-sm text-ink">
            <input id="payment-method-pix" type="radio" name="payment-method" value="pix" checked readOnly />
            Pix
          </label>
        </fieldset>
        {payContract.isError && <p className="text-xs text-accent">Não foi possível processar o pagamento.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={payContract.isPending}
            onClick={() => payContract.mutate('pix', { onSuccess: onClose })}
          >
            Confirmar pagamento
          </Button>
        </div>
      </div>
    </Modal>
  );
}
