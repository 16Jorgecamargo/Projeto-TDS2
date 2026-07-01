import { describe, it, expect } from 'vitest';
import { toPaginated } from './types';

describe('shared types', () => {
  it('builds a paginated envelope', () => {
    const result = toPaginated([{ id: 'a' }], 42, 2, 10);
    expect(result).toEqual({ items: [{ id: 'a' }], total: 42, page: 2, limit: 10 });
  });
});
