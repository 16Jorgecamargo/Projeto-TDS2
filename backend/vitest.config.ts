import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '0',
      CORS_ORIGIN: '*',
      DATABASE_HOST: 'localhost',
      DATABASE_USER: 'app',
      DATABASE_PASSWORD: 'secret',
      DATABASE_NAME: 'marketplace',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    },
  },
});
