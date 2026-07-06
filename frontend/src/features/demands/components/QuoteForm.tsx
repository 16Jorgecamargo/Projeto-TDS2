import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteFormSchema, type QuoteFormValues } from '../schemas';
import { Button } from '../../../components/ui/Button';

interface QuoteFormProps {
  onSubmit: (values: QuoteFormValues) => void;
  submitting?: boolean;
}

export function QuoteForm({ onSubmit, submitting }: QuoteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { message: '', validUntil: '', total: 0 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-semibold">Enviar orçamento</h3>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Mensagem ao cliente</span>
        <textarea {...register('message')} rows={3} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.message && <span className="text-xs text-red-600">{errors.message.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Válido até (opcional)</span>
        <input type="date" {...register('validUntil')} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Valor total do orçamento</span>
        <input
          type="number"
          step="0.01"
          {...register('total')}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {errors.total && <span className="text-xs text-red-600">{errors.total.message}</span>}
      </label>
      <Button type="submit" disabled={submitting} className="self-start">
        Enviar orçamento
      </Button>
    </form>
  );
}
