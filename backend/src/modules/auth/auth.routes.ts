import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { RefreshToken } from '../../infra/database/entities/refresh-token.entity.js';
import { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity.js';
import { PhoneVerificationToken } from '../../infra/database/entities/phone-verification-token.entity.js';
import { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity.js';
import { UserOauthAccount } from '../../infra/database/entities/user-oauth-account.entity.js';
import { UserPreference } from '../../infra/database/entities/user-preference.entity.js';
import { UserConsent } from '../../infra/database/entities/user-consent.entity.js';
import { mailQueue } from '../../infra/queues/index.js';
import { emptyBodySchema } from '../../shared/schemas.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  confirmVerificationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  oauthSchema,
  authResultSchema,
} from './auth.schemas.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const ds = app.dataSource;
  const service = new AuthService({
    users: ds.getRepository(User),
    refreshTokens: ds.getRepository(RefreshToken),
    emailTokens: ds.getRepository(EmailVerificationToken),
    phoneTokens: ds.getRepository(PhoneVerificationToken),
    resetTokens: ds.getRepository(PasswordResetToken),
    oauthAccounts: ds.getRepository(UserOauthAccount),
    preferences: ds.getRepository(UserPreference),
    consents: ds.getRepository(UserConsent),
    mailQueue,
  });
  const controller = new AuthController(service);

  app.post('/auth/register', {
    schema: {
      tags: ['auth'],
      summary: 'Registra usuario',
      body: registerSchema,
      response: { 201: authResultSchema },
    },
    handler: controller.register,
  });

  app.post('/auth/login', {
    schema: {
      tags: ['auth'],
      summary: 'Autentica usuario',
      body: loginSchema,
      response: { 200: authResultSchema },
    },
    handler: controller.login,
  });

  app.post('/auth/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Rotaciona refresh token',
      body: refreshSchema,
      response: { 200: authResultSchema },
    },
    handler: controller.refresh,
  });

  app.post('/auth/logout', {
    schema: {
      tags: ['auth'],
      summary: 'Revoga refresh token',
      body: refreshSchema,
      response: { 204: z.void() },
    },
    handler: controller.logout,
  });

  app.post('/auth/verify-email', {
    schema: {
      tags: ['auth'],
      summary: 'Confirma verificacao de e-mail',
      body: confirmVerificationSchema,
      response: { 204: z.void() },
    },
    handler: controller.verifyEmail,
  });

  app.post('/auth/verify-email/skip', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['auth'],
      summary: 'Ignora verificacao de e-mail (uso em desenvolvimento)',
      body: emptyBodySchema,
      response: { 204: z.void() },
    },
    handler: controller.skipEmailVerification,
  });

  app.post('/auth/password/forgot', {
    schema: {
      tags: ['auth'],
      summary: 'Solicita reset de senha',
      body: requestPasswordResetSchema,
      response: { 202: z.void() },
    },
    handler: controller.forgotPassword,
  });

  app.post('/auth/password/reset', {
    schema: {
      tags: ['auth'],
      summary: 'Redefine senha',
      body: resetPasswordSchema,
      response: { 204: z.void() },
    },
    handler: controller.resetPassword,
  });

  app.post('/auth/oauth', {
    schema: {
      tags: ['auth'],
      summary: 'Login/vinculo OAuth',
      body: oauthSchema,
      response: { 200: authResultSchema },
    },
    handler: controller.oauth,
  });
}
