import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { progressFormSchema, type ProgressFormValues } from '../schemas';

interface Props {
  onSubmit: (values: ProgressFormValues) => void;
  submitting?: boolean;
}

export function ProgressUpdateForm({ onSubmit, submitting }: Props) {
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
      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
    >
      <textarea
        {...register('description')}
        rows={3}
        placeholder="Descreva o progresso"
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      <input type="number" {...register('percentage')} className="rounded-lg border border-slate-300 px-3 py-2" />
      {errors.percentage && <span className="text-xs text-red-600">{errors.percentage.message}</span>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
      >
        Registrar progresso
      </button>
    </form>
  );
}
