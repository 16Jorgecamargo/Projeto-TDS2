import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppDataSource } from './data-source.js';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

async function expectTables(tables: string[]): Promise<void> {
  const runner = AppDataSource.createQueryRunner();
  try {
    for (const table of tables) {
      expect(await runner.hasTable(table), `missing table ${table}`).toBe(true);
    }
  } finally {
    await runner.release();
  }
}

describe('auth schema', () => {
  it('creates auth and account tables', async () => {
    await expectTables([
      'users',
      'refresh_tokens',
      'password_reset_tokens',
      'email_verification_tokens',
      'phone_verification_tokens',
      'user_oauth_accounts',
      'user_preferences',
      'account_deletion_requests',
      'user_consents',
      'push_device_tokens',
    ]);
  });
});
