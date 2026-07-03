import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { disputeFormSchema, type DisputeFormValues } from '../schemas';
import { useOpenDispute } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface DisputeDialogProps {
  contractId: string;
  onClose: () => void;
}

export function DisputeDialog({ contractId, onClose }: DisputeDialogProps): JSX.Element {
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
    <Modal open onClose={onClose} title="Abrir disputa">
      <form
        onSubmit={handleSubmit((values) => dispute.mutate(values.reason, { onSuccess: onClose }))}
        className="flex flex-col gap-3"
      >
        <label htmlFor="dispute-reason" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Motivo</span>
          <textarea
            id="dispute-reason"
            {...register('reason')}
            rows={4}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {errors.reason && <span className="text-xs text-accent">{errors.reason.message}</span>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" disabled={dispute.isPending}>
            Abrir disputa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
