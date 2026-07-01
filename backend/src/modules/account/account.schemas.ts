import { z } from 'zod';
import 'zod-openapi/extend';

export const preferencesSchema = z.object({
  language: z.string().describe('Idioma').openapi({ example: 'pt-BR' }),
  timezone: z.string().describe('Fuso horario').openapi({ example: 'America/Sao_Paulo' }),
  emailNotifications: z.boolean().describe('Notificacoes por e-mail').openapi({ example: true }),
  pushNotifications: z.boolean().describe('Notificacoes push').openapi({ example: true }),
  smsNotifications: z.boolean().describe('Notificacoes por SMS').openapi({ example: false }),
});

export const updatePreferencesSchema = preferencesSchema.partial();

export const consentTypeSchema = z
  .enum(['terms', 'privacy', 'marketing', 'data_processing'])
  .describe('Tipo de consentimento LGPD')
  .openapi({ example: 'privacy' });

export const recordConsentSchema = z.object({
  type: consentTypeSchema,
  granted: z.boolean().describe('Consentimento concedido?').openapi({ example: true }),
  version: z.string().describe('Versao do documento aceito').openapi({ example: '2026-07-01' }),
});

export const consentSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '33333333-3333-3333-3333-333333333333' }),
  type: consentTypeSchema,
  granted: z.boolean().describe('Concedido').openapi({ example: true }),
  version: z.string().describe('Versao').openapi({ example: '2026-07-01' }),
  grantedAt: z.string().datetime().describe('Data do aceite').openapi({ example: '2026-07-01T12:00:00.000Z' }),
  createdAt: z.string().datetime().describe('Data do registro').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export type PreferencesDto = z.infer<typeof preferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
export type ConsentDto = z.infer<typeof consentSchema>;
