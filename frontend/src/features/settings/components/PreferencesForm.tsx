import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesFormSchema, type PreferencesForm as FormValues } from '../schemas';
import { usePreferences, useUpdatePreferences } from '../queries';
import { Button } from '../../../components/ui/Button';

export function PreferencesForm(): JSX.Element {
  const { data } = usePreferences();
  const update = useUpdatePreferences();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(preferencesFormSchema),
  });

  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => update.mutate(values));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Preferências</h2>
      <label className="flex items-center justify-between gap-2 text-ink">
        Idioma
        <input type="text" {...register('language')} className="rounded-sm border border-surface px-2 py-1 text-ink" />
      </label>
      <label className="flex items-center justify-between gap-2 text-ink">
        Fuso horário
        <input type="text" {...register('timezone')} className="rounded-sm border border-surface px-2 py-1 text-ink" />
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('emailNotifications')} /> Notificações por e-mail
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('pushNotifications')} /> Notificações push
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('smsNotifications')} /> Notificações por SMS
      </label>
      <Button type="submit" disabled={update.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default PreferencesForm;
