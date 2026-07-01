import { describe, it, expect } from 'vitest';

describe('backend test setup', () => {
  it('runs under NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('has reflect-metadata available', () => {
    expect(typeof Reflect.getMetadata).toBe('function');
  });
});
