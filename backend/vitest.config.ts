import { defineConfig } from 'vitest/config';

const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3010',
  CORS_ORIGIN: '*',
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'app',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'marketplace',
  JWT_ACCESS_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  JWT_REFRESH_SECRET: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}

export default defineConfig({
  test: {
    environment: 'node',
  },
});
