export function loadTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-min32chars!!!';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-min32chars!!';
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST ?? '::1';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT ?? '3306';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER ?? 'app';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'secret';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'marketplace_test';
  process.env.DATABASE_HOST = process.env.TEST_DB_HOST;
  process.env.DATABASE_PORT = process.env.TEST_DB_PORT;
  process.env.DATABASE_USER = process.env.TEST_DB_USER;
  process.env.DATABASE_PASSWORD = process.env.TEST_DB_PASSWORD;
  process.env.DATABASE_NAME = process.env.TEST_DB_NAME;
  process.env.TEST_REDIS_HOST = process.env.TEST_REDIS_HOST ?? '127.0.0.1';
  process.env.TEST_REDIS_PORT = process.env.TEST_REDIS_PORT ?? '6379';
}
