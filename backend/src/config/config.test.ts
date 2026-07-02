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

  it('applies rate limit defaults', () => {
    const config = loadConfig(validEnv);
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.RATE_LIMIT_WINDOW).toBe('1 minute');
  });

  it('applies upload defaults', () => {
    const config = loadConfig(validEnv);
    expect(config.UPLOAD_DIR).toBe('./uploads');
    expect(config.UPLOAD_MAX_SIZE_MB).toBe(5);
    expect(config.UPLOAD_ALLOWED_MIME).toBe('image/jpeg,image/png,image/webp');
  });

  it('accepts a custom UPLOAD_MAX_SIZE_MB override', () => {
    const config = loadConfig({ ...validEnv, UPLOAD_MAX_SIZE_MB: '10' } as NodeJS.ProcessEnv);
    expect(config.UPLOAD_MAX_SIZE_MB).toBe(10);
  });
});

describe('production secret hardening', () => {
  const strong = 'K7pQ2wZ9xL4mN8vR1tB6yH3cD5fJ0sAz';
  const strongRefresh = 'M2nB4vC6xZ8lK0jH1gF3dS5aP7oI9uYz';

  const productionEnv = {
    ...validEnv,
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: strong,
    JWT_REFRESH_SECRET: strongRefresh,
  } as NodeJS.ProcessEnv;

  it('rejects placeholder secrets in production', () => {
    const weakEnv = {
      ...productionEnv,
      JWT_ACCESS_SECRET: 'change-me-access-secret-32-characters-min',
    } as NodeJS.ProcessEnv;
    expect(() => loadConfig(weakEnv)).toThrow('Invalid environment configuration');
  });

  it('rejects placeholder refresh secrets in production', () => {
    const weakEnv = {
      ...productionEnv,
      JWT_REFRESH_SECRET: 'change-me-refresh-secret-32-characters-min',
    } as NodeJS.ProcessEnv;
    expect(() => loadConfig(weakEnv)).toThrow('Invalid environment configuration');
  });

  it('accepts strong secrets in production', () => {
    expect(() => loadConfig(productionEnv)).not.toThrow();
  });

  it('allows placeholder secrets outside production', () => {
    const weakEnv = {
      ...validEnv,
      JWT_ACCESS_SECRET: 'change-me-access-secret-32-characters-min',
    } as NodeJS.ProcessEnv;
    expect(() => loadConfig(weakEnv)).not.toThrow();
  });
});
