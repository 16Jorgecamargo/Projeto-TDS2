import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawFormSchema, type WithdrawFormInput } from '../schemas';
import { useRequestWithdrawal } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface WithdrawDialogProps {
  onClose: () => void;
}

export function WithdrawDialog({ onClose }: WithdrawDialogProps): JSX.Element {
  const { register, handleSubmit, formState } = useForm<WithdrawFormInput>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: { amount: 0, paymentMethod: 'pix', destination: '' },
  });
  const mutation = useRequestWithdrawal();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: onClose });
  });

  return (
    <Modal open onClose={onClose} title="Solicitar saque">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="withdraw-amount" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Valor</span>
          <input
            id="withdraw-amount"
            type="number"
            step="0.01"
            {...register('amount')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {formState.errors.amount && (
          <span className="text-xs text-accent">{formState.errors.amount.message}</span>
        )}
        <label htmlFor="withdraw-method" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Método</span>
          <select
            id="withdraw-method"
            {...register('paymentMethod')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          >
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferência bancária</option>
          </select>
        </label>
        <label htmlFor="withdraw-destination" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Destino</span>
          <input
            id="withdraw-destination"
            {...register('destination')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {formState.errors.destination && (
          <span className="text-xs text-accent">{formState.errors.destination.message}</span>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
