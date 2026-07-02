import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteFormSchema, type QuoteFormValues } from '../schemas';

interface QuoteFormProps {
  onSubmit: (values: QuoteFormValues) => void;
  submitting?: boolean;
}

export function QuoteForm({ onSubmit, submitting }: QuoteFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      message: '',
      validUntil: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

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
      <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-600">Itens</span>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <input
                {...register(`items.${index}.description`)}
                placeholder="Descrição"
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              {errors.items?.[index]?.description && (
                <span className="text-xs text-red-600">{errors.items[index]?.description?.message}</span>
              )}
            </div>
            <div className="flex w-20 flex-col gap-1">
              <input
                type="number"
                step="1"
                {...register(`items.${index}.quantity`)}
                placeholder="Qtd"
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              {errors.items?.[index]?.quantity && (
                <span className="text-xs text-red-600">{errors.items[index]?.quantity?.message}</span>
              )}
            </div>
            <div className="flex w-28 flex-col gap-1">
              <input
                type="number"
                step="0.01"
                {...register(`items.${index}.unitPrice`)}
                placeholder="Preço unit."
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              {errors.items?.[index]?.unitPrice && (
                <span className="text-xs text-red-600">{errors.items[index]?.unitPrice?.message}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length <= 1}
              className="rounded-lg border border-slate-300 px-2 py-2 text-slate-500 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        ))}
        {errors.items?.root && <span className="text-xs text-red-600">{errors.items.root.message}</span>}
        {errors.items?.message && <span className="text-xs text-red-600">{errors.items.message}</span>}
        <button
          type="button"
          onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
          className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          Adicionar item
        </button>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        Enviar orçamento
      </button>
    </form>
  );
}
