import type { FormEventHandler } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ProfileForm as FormValues } from '../schemas';
import { Card } from '../../../components/ui/Card';

export const PROFILE_FORM_ID = 'profile-form';

const setValueAsNumber = (value: string) => (value === '' ? null : Number(value));

export interface ProfileFormProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function ProfileForm({ register, errors, onSubmit }: ProfileFormProps) {
  return (
    <Card>
      <form id={PROFILE_FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
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
      </form>
    </Card>
  );
}
