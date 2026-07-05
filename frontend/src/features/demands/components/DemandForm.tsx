import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { useCategories } from '../../professional/queries';

interface DemandFormProps {
  onSubmit: (values: DemandFormValues, images: string[]) => void;
  submitting?: boolean;
}

export function DemandForm({ onSubmit, submitting }: DemandFormProps): JSX.Element {
  const [images, setImages] = useState<string[]>([]);
  const { data: categories } = useCategories();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: {
      title: '',
      description: '',
      budgetMin: null,
      budgetMax: null,
      categoryId: '',
      street: '',
      number: '',
      complement: null,
      district: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, images))} className="flex flex-col gap-3">
      <label htmlFor="demand-category" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <select
          id="demand-category"
          {...register('categoryId')}
          defaultValue=""
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categories
            ?.filter((category) => category.isActive)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
        {errors.categoryId && <span className="text-xs text-red-600">{errors.categoryId.message}</span>}
      </label>
      <label htmlFor="demand-title" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Título</span>
        <input id="demand-title" {...register('title')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
      </label>
      <label htmlFor="demand-description" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Descrição</span>
        <textarea
          id="demand-description"
          {...register('description')}
          rows={5}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      </label>
      <div className="flex gap-3">
        <label htmlFor="demand-budget-min" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento mínimo</span>
          <input
            id="demand-budget-min"
            type="number"
            step="0.01"
            {...register('budgetMin')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label htmlFor="demand-budget-max" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento máximo</span>
          <input
            id="demand-budget-max"
            type="number"
            step="0.01"
            {...register('budgetMax')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.budgetMax && <span className="text-xs text-red-600">{errors.budgetMax.message}</span>}
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-600">Fotos (opcional)</span>
        <ImageUpload label="Adicionar foto" onUploaded={(result) => setImages((prev) => [...prev, result.url])} />
        {images.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {images.map((url) => (
              <li key={url}>
                <img src={url} alt="Foto da demanda" className="h-16 w-16 rounded-md object-cover" />
              </li>
            ))}
          </ul>
        )}
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
