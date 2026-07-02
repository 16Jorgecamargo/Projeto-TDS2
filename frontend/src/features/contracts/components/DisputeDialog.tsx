import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { disputeFormSchema, type DisputeFormValues } from '../schemas';
import { useOpenDispute } from '../queries';

interface Props {
  contractId: string;
  onClose: () => void;
}

export function DisputeDialog({ contractId, onClose }: Props) {
  const dispute = useOpenDispute(contractId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: { reason: '' },
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit((values) => dispute.mutate(values.reason, { onSuccess: onClose }))}
        className="flex w-96 flex-col gap-3 rounded-xl bg-white p-5"
      >
        <h3 className="text-lg font-semibold">Abrir disputa</h3>
        <textarea {...register('reason')} rows={4} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.reason && <span className="text-xs text-red-600">{errors.reason.message}</span>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-slate-500">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={dispute.isPending}
            className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50"
          >
            Abrir disputa
          </button>
        </div>
      </form>
    </div>
  );
}
