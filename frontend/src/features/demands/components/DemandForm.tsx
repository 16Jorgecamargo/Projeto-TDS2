import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';

interface DemandFormProps {
  onSubmit: (values: DemandFormValues) => void;
  submitting?: boolean;
}

export function DemandForm({ onSubmit, submitting }: DemandFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: { title: '', description: '', budgetMin: 0, budgetMax: 0, categoryId: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <input {...register('categoryId')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.categoryId && <span className="text-xs text-red-600">{errors.categoryId.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Título</span>
        <input {...register('title')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Descrição</span>
        <textarea {...register('description')} rows={5} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento mínimo</span>
          <input
            type="number"
            step="0.01"
            {...register('budgetMin')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento máximo</span>
          <input
            type="number"
            step="0.01"
            {...register('budgetMax')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.budgetMax && <span className="text-xs text-red-600">{errors.budgetMax.message}</span>}
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        Publicar demanda
      </button>
    </form>
  );
}
