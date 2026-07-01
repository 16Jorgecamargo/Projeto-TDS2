import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

const validEnv = {
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'app',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'marketplace',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
} as NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('applies defaults and coerces numeric variables', () => {
    const config = loadConfig(validEnv);
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.REDIS_PORT).toBe(6379);
    expect(config.HOST).toBe('0.0.0.0');
  });

  it('throws when a required variable is missing', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    const shortSecret = { ...validEnv, JWT_ACCESS_SECRET: 'short' } as NodeJS.ProcessEnv;
    expect(() => loadConfig(shortSecret)).toThrow('Invalid environment configuration');
  });
});
