import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { progressFormSchema, type ProgressFormValues } from '../schemas';
import { Button } from '../../../components/ui/Button';

interface ProgressUpdateFormProps {
  onSubmit: (values: ProgressFormValues) => void;
  submitting?: boolean;
}

export function ProgressUpdateForm({ onSubmit, submitting }: ProgressUpdateFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProgressFormValues>({
    resolver: zodResolver(progressFormSchema),
    defaultValues: { description: '', percentage: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onSubmit(values);
        reset();
      })}
      className="flex flex-col gap-2 rounded-lg bg-surface p-3"
    >
      <label htmlFor="progress-description" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Descrição do progresso</span>
        <textarea
          id="progress-description"
          {...register('description')}
          rows={3}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.description && <span className="text-xs text-accent">{errors.description.message}</span>}
      <label htmlFor="progress-percentage" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Percentual concluído</span>
        <input
          id="progress-percentage"
          type="number"
          {...register('percentage')}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.percentage && <span className="text-xs text-accent">{errors.percentage.message}</span>}
      <Button type="submit" disabled={submitting}>
        Registrar progresso
      </Button>
    </form>
  );
}
