import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
  });
}

export function captureError(err: unknown): void {
  if (err instanceof AppError && err.statusCode < 500) {
    return;
  }
  Sentry.captureException(err);
}
