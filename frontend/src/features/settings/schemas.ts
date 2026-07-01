import { z } from 'zod';

export const preferencesFormSchema = z.object({
  language: z.string().min(1, 'Informe o idioma'),
  timezone: z.string().min(1, 'Informe o fuso horario'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

export type PreferencesForm = z.infer<typeof preferencesFormSchema>;
