import { useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Button } from '../../../components/ui/Button';
import { useCategories } from '../../professional/queries';
import { BRAZIL_STATES } from '../../../lib/brazilStates';
import { PhotoGallery } from './PhotoGallery';

interface DemandFormProps {
  onSubmit: (values: DemandFormValues, images: string[]) => void;
  submitting?: boolean;
}

function formatZipCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function DemandForm({ onSubmit, submitting }: DemandFormProps): JSX.Element {
  const [images, setImages] = useState<string[]>([]);
  const { data: categories } = useCategories();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: {
      categoryId: '',
      title: '',
      description: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const categoryOptions =
    categories?.filter((category) => category.isActive).map((category) => ({ value: category.id, label: category.name })) ?? [];

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, images))} className="flex flex-col gap-3">
      <label htmlFor="demand-category" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="demand-category"
              options={categoryOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Buscar categoria"
            />
          )}
        />
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
        <label htmlFor="demand-street" className="flex flex-[3] flex-col gap-1">
          <span className="text-sm text-slate-600">Rua</span>
          <input id="demand-street" {...register('street')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.street && <span className="text-xs text-red-600">{errors.street.message}</span>}
        </label>
        <label htmlFor="demand-number" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Número</span>
          <input id="demand-number" {...register('number')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.number && <span className="text-xs text-red-600">{errors.number.message}</span>}
        </label>
      </div>
      <label htmlFor="demand-complement" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Complemento (opcional)</span>
        <input id="demand-complement" {...register('complement')} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label htmlFor="demand-district" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Bairro</span>
        <input id="demand-district" {...register('district')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.district && <span className="text-xs text-red-600">{errors.district.message}</span>}
      </label>
      <div className="flex gap-3">
        <label htmlFor="demand-city" className="flex flex-[2] flex-col gap-1">
          <span className="text-sm text-slate-600">Cidade</span>
          <input id="demand-city" {...register('city')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.city && <span className="text-xs text-red-600">{errors.city.message}</span>}
        </label>
        <label htmlFor="demand-state" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">UF</span>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="demand-state"
                options={BRAZIL_STATES}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="UF"
              />
            )}
          />
          {errors.state && <span className="text-xs text-red-600">{errors.state.message}</span>}
        </label>
        <label htmlFor="demand-zip" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">CEP</span>
          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <input
                id="demand-zip"
                value={field.value}
                onChange={(event) => field.onChange(formatZipCode(event.target.value))}
                onBlur={field.onBlur}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            )}
          />
          {errors.zipCode && <span className="text-xs text-red-600">{errors.zipCode.message}</span>}
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-600">Fotos (opcional)</span>
        <ImageUpload label="Adicionar foto" onUploaded={(result) => setImages((prev) => [...prev, result.url])} />
        <PhotoGallery images={images} onRemove={(url) => setImages((prev) => prev.filter((item) => item !== url))} />
      </div>
      <Button type="submit" disabled={submitting}>
        Publicar demanda
      </Button>
    </form>
  );
}
