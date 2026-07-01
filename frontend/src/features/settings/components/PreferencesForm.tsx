import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesFormSchema, type PreferencesForm as FormValues } from '../schemas';
import { usePreferences, useUpdatePreferences } from '../queries';

export function PreferencesForm() {
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
      <h2 className="text-lg font-semibold">Preferencias</h2>
      <label className="flex items-center justify-between gap-2">
        Idioma
        <input type="text" {...register('language')} className="rounded border px-2 py-1" />
      </label>
      <label className="flex items-center justify-between gap-2">
        Fuso horario
        <input type="text" {...register('timezone')} className="rounded border px-2 py-1" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('emailNotifications')} /> Notificacoes por e-mail
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('pushNotifications')} /> Notificacoes push
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('smsNotifications')} /> Notificacoes por SMS
      </label>
      <button
        type="submit"
        disabled={update.isPending}
        className="rounded bg-slate-900 py-2 text-white disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}
