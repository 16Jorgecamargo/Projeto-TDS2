import { useState, type JSX } from 'react';
import { useWallet } from '../../wallet/queries';
import { usePayContract } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import type { PaymentMethod } from '../api';

interface PaymentDialogProps {
  contractId: string;
  total: number;
  onClose: () => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  wallet: 'Carteira',
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
};

const METHODS: PaymentMethod[] = ['wallet', 'credit_card', 'pix', 'boleto'];

export function PaymentDialog({ contractId, total, onClose }: PaymentDialogProps): JSX.Element {
  const [method, setMethod] = useState<PaymentMethod>('wallet');
  const { data: wallet } = useWallet();
  const payContract = usePayContract(contractId);

  const insufficientBalance = method === 'wallet' && wallet !== undefined && wallet.balance < total;

  return (
    <Modal open onClose={onClose} title="Pagar contrato">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Valor a pagar: <span className="font-semibold text-ink">{formatCurrency(total)}</span>
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted">Método de pagamento</legend>
          {METHODS.map((option) => (
            <label
              key={option}
              htmlFor={`payment-method-${option}`}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input
                id={`payment-method-${option}`}
                type="radio"
                name="payment-method"
                value={option}
                checked={method === option}
                onChange={() => setMethod(option)}
              />
              {METHOD_LABELS[option]}
            </label>
          ))}
        </fieldset>
        {insufficientBalance && (
          <p className="text-xs text-accent">Saldo da carteira insuficiente para pagar com este método.</p>
        )}
        {payContract.isError && <p className="text-xs text-accent">Não foi possível processar o pagamento.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={payContract.isPending || insufficientBalance}
            onClick={() => payContract.mutate(method, { onSuccess: onClose })}
          >
            Confirmar pagamento
          </Button>
        </div>
      </div>
    </Modal>
  );
}
