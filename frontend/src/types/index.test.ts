import { describe, it, expect } from 'vitest';
import { isApiError } from './index';

describe('frontend shared types', () => {
  it('recognizes the API error envelope', () => {
    expect(isApiError({ error: { code: 'NOT_FOUND', message: 'x' } })).toBe(true);
  });

  it('rejects non-envelope values', () => {
    expect(isApiError({ message: 'oops' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError('error')).toBe(false);
  });
});
