import { z } from 'zod';
import 'zod-openapi/extend';

export const preferencesSchema = z.object({
  language: z.string().describe('Idioma').openapi({ example: 'pt-BR' }),
  timezone: z.string().describe('Fuso horario').openapi({ example: 'America/Sao_Paulo' }),
  emailNotifications: z.boolean().describe('Notificacoes por e-mail').openapi({ example: true }),
  pushNotifications: z.boolean().describe('Notificacoes push').openapi({ example: true }),
  smsNotifications: z.boolean().describe('Notificacoes por SMS').openapi({ example: false }),
  city: z.string().nullable().describe('Cidade onde o usuario mora').openapi({ example: 'Porto Alegre' }),
  state: z.string().nullable().describe('UF onde o usuario mora').openapi({ example: 'RS' }),
});

export const updatePreferencesSchema = preferencesSchema.partial();

export const CONSENT_VERSION = '2026-07-01';

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

export const deletionStatusSchema = z
  .enum(['pending', 'cancelled', 'completed'])
  .describe('Status da solicitacao de exclusao')
  .openapi({ example: 'pending' });

export const deletionRequestSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '44444444-4444-4444-4444-444444444444' }),
  status: deletionStatusSchema,
  requestedAt: z.string().datetime().describe('Data da solicitacao').openapi({ example: '2026-07-01T12:00:00.000Z' }),
  scheduledFor: z.string().datetime().describe('Data efetiva da exclusao').openapi({ example: '2026-07-31T12:00:00.000Z' }),
});

export type PreferencesDto = z.infer<typeof preferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
export type ConsentDto = z.infer<typeof consentSchema>;
export type DeletionRequestDto = z.infer<typeof deletionRequestSchema>;
