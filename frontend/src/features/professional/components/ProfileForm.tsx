import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileForm as FormValues } from '../schemas';
import { useMyProfile, useUpsertProfile } from '../queries';

const setValueAsNumber = (value: string) => (value === '' ? null : Number(value));

export function ProfileForm() {
  const { data } = useMyProfile();
  const upsert = useUpsertProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (data) {
      reset({
        headline: data.headline,
        bio: data.bio,
        yearsExperience: data.yearsExperience,
        hourlyRate: data.hourlyRate,
        serviceRadiusKm: data.serviceRadiusKm,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => upsert.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Perfil profissional</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span>Titulo</span>
        <input className="rounded border px-3 py-2" {...register('headline')} />
        {errors.headline ? <span className="text-xs text-red-600">{errors.headline.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Biografia</span>
        <textarea className="rounded border px-3 py-2" {...register('bio')} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Anos de experiencia</span>
        <input
          type="number"
          className="rounded border px-3 py-2"
          {...register('yearsExperience', { setValueAs: setValueAsNumber })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Valor por hora (R$)</span>
        <input
          type="number"
          className="rounded border px-3 py-2"
          {...register('hourlyRate', { setValueAs: setValueAsNumber })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Raio de atendimento (km)</span>
        <input
          type="number"
          className="rounded border px-3 py-2"
          {...register('serviceRadiusKm', { setValueAs: setValueAsNumber })}
        />
      </label>
      {upsert.isError ? <p className="text-sm text-red-600">Nao foi possivel salvar o perfil</p> : null}
      <button type="submit" disabled={upsert.isPending} className="rounded bg-slate-900 py-2 text-white disabled:opacity-50">
        {upsert.isPending ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </form>
  );
}
