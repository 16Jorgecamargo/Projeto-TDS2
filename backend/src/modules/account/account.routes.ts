import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';
import { UserPreference } from '../../infra/database/entities/user-preference.entity.js';
import { UserConsent } from '../../infra/database/entities/user-consent.entity.js';
import {
  preferencesSchema,
  updatePreferencesSchema,
  consentSchema,
  recordConsentSchema,
} from './account.schemas.js';

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  const service = new AccountService({
    preferences: app.dataSource.getRepository(UserPreference),
    consents: app.dataSource.getRepository(UserConsent),
  });
  const controller = new AccountController(service);

  app.get('/account/preferences', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Preferencias', response: { 200: preferencesSchema } },
    handler: controller.getPreferences,
  });
  app.patch('/account/preferences', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['account'],
      summary: 'Atualiza preferencias',
      body: updatePreferencesSchema,
      response: { 200: preferencesSchema },
    },
    handler: controller.updatePreferences,
  });
  app.get('/account/consents', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['account'],
      summary: 'Historico de consentimentos',
      response: { 200: z.array(consentSchema) },
    },
    handler: controller.listConsents,
  });
  app.post('/account/consents', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['account'],
      summary: 'Registra consentimento LGPD',
      body: recordConsentSchema,
      response: { 201: consentSchema },
    },
    handler: controller.recordConsent,
  });
}
