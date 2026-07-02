import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawFormSchema, type WithdrawFormInput } from '../schemas';
import { useRequestWithdrawal } from '../queries';

interface WithdrawDialogProps {
  onClose: () => void;
}

export function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const { register, handleSubmit, formState } = useForm<WithdrawFormInput>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: { amount: 0, paymentMethod: 'pix', destination: '' },
  });
  const mutation = useRequestWithdrawal();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: onClose });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">Solicitar saque</h2>
      <div>
        <label className="block text-sm text-gray-600">Valor</label>
        <input type="number" step="0.01" {...register('amount')} className="w-full rounded border p-2" />
        {formState.errors.amount && <p className="text-xs text-red-600">{formState.errors.amount.message}</p>}
      </div>
      <div>
        <label className="block text-sm text-gray-600">Método</label>
        <select {...register('paymentMethod')} className="w-full rounded border p-2">
          <option value="pix">PIX</option>
          <option value="bank_transfer">Transferência bancária</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600">Destino</label>
        <input {...register('destination')} className="w-full rounded border p-2" />
        {formState.errors.destination && <p className="text-xs text-red-600">{formState.errors.destination.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className="rounded bg-blue-600 px-4 py-2 text-white">
          Confirmar
        </button>
      </div>
    </form>
  );
}
