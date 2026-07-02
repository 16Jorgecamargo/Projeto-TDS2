import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureException = vi.fn();
const init = vi.fn();
vi.mock('@sentry/node', () => ({ init: (...a: unknown[]) => init(...a), captureException: (...a: unknown[]) => captureException(...a) }));

import { captureError } from './sentry.js';
import { NotFoundError } from '../shared/errors.js';

describe('captureError', () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it('não captura AppError operacional (4xx)', () => {
    captureError(new NotFoundError('x'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('captura erro inesperado', () => {
    captureError(new Error('boom'));
    expect(captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
