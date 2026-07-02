import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';
import { UserPreference } from '../../infra/database/entities/user-preference.entity.js';
import { UserConsent } from '../../infra/database/entities/user-consent.entity.js';
import { AccountDeletionRequest } from '../../infra/database/entities/account-deletion-request.entity.js';
import {
  preferencesSchema,
  updatePreferencesSchema,
  consentSchema,
  recordConsentSchema,
  deletionRequestSchema,
} from './account.schemas.js';
import { emptyBodySchema } from '../../shared/schemas.js';

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  const service = new AccountService({
    preferences: app.dataSource.getRepository(UserPreference),
    consents: app.dataSource.getRepository(UserConsent),
    deletionRequests: app.dataSource.getRepository(AccountDeletionRequest),
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
  app.post('/account/deletion', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['account'],
      summary: 'Solicita exclusao de conta',
      body: emptyBodySchema,
      response: { 201: deletionRequestSchema },
    },
    handler: controller.requestDeletion,
  });
  app.delete('/account/deletion', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Cancela exclusao de conta', response: { 204: z.void() } },
    handler: controller.cancelDeletion,
  });
  app.get('/account/deletion', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Status da exclusao', response: { 200: deletionRequestSchema.nullable() } },
    handler: controller.deletionStatus,
  });
}
