import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileForm as FormValues } from '../schemas';
import { useMyProfile, useUpsertProfile } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

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
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Perfil profissional</h2>
        <label htmlFor="profile-headline" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Título</span>
          <input
            id="profile-headline"
            {...register('headline')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
          {errors.headline && <span className="text-xs text-accent">{errors.headline.message}</span>}
        </label>
        <label htmlFor="profile-bio" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Biografia</span>
          <textarea
            id="profile-bio"
            {...register('bio')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-years-experience" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Anos de experiência</span>
          <input
            id="profile-years-experience"
            type="number"
            {...register('yearsExperience', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-hourly-rate" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Valor por hora (R$)</span>
          <input
            id="profile-hourly-rate"
            type="number"
            {...register('hourlyRate', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-service-radius" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Raio de atendimento (km)</span>
          <input
            id="profile-service-radius"
            type="number"
            {...register('serviceRadiusKm', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {upsert.isError && <p className="text-sm text-accent">Não foi possível salvar o perfil</p>}
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </form>
    </Card>
  );
}
