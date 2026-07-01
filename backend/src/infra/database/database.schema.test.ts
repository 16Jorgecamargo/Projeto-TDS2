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

describe('address schema', () => {
  it('creates address table', async () => {
    await expectTables(['addresses']);
  });
});

describe('professional schema', () => {
  it('creates professional profile tables', async () => {
    await expectTables([
      'professional_profiles',
      'professional_documents',
      'professional_experiences',
      'professional_education',
      'professional_certifications',
      'professional_service_areas',
      'availability_slots',
      'availability_exceptions',
      'portfolio_items',
      'portfolio_images',
    ]);
  });
});

describe('catalog schema', () => {
  it('creates catalog tables', async () => {
    await expectTables([
      'service_categories',
      'service_tags',
      'professional_categories',
      'professional_tags',
    ]);
  });
});

describe('demand schema', () => {
  it('creates demand tables', async () => {
    await expectTables(['service_demands', 'demand_images', 'demand_tags', 'demand_invitations']);
  });
});

describe('quote schema', () => {
  it('creates quote tables', async () => {
    await expectTables(['quotes', 'quote_items']);
  });
});

describe('contract schema', () => {
  it('creates contract tables', async () => {
    await expectTables([
      'contracts',
      'schedules',
      'contract_progress_updates',
      'contract_progress_images',
      'contract_disputes',
    ]);
  });
});
describe('wallet schema', () => {
  it('creates wallet and payment tables', async () => {
    await expectTables([
      'wallets',
      'wallet_transactions',
      'payments',
      'platform_fees',
      'refunds',
      'withdrawals',
    ]);
  });
});

describe('social schema', () => {
  it('creates social tables', async () => {
    await expectTables(['reviews', 'favorites', 'reports', 'user_blocks']);
  });
});
