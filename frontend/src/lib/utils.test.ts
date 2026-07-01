import { describe, it, expect } from 'vitest';
import { cn, toNumber, formatCurrency, formatDate } from './utils';

describe('frontend utils', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });

  it('coerces decimal strings to numbers', () => {
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber(10)).toBe(10);
  });

  it('formats currency in BRL from a decimal string', () => {
    expect(formatCurrency('1234.5').replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('formats an ISO date to pt-BR', () => {
    expect(formatDate('2026-07-01T00:00:00.000Z')).toBe('01/07/2026');
  });
});
