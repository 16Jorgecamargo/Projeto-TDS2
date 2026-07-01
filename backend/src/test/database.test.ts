import { afterAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, truncateAll, TestDataSource } from './database.js';

describe('test database harness', () => {
  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('initializes a connectable data source', async () => {
    const dataSource = await setupTestDatabase();
    expect(dataSource.isInitialized).toBe(true);
    const result = await dataSource.query('SELECT 1 AS ok');
    expect(Number(result[0].ok)).toBe(1);
  });

  it('truncates without throwing on an empty schema', async () => {
    await setupTestDatabase();
    await expect(truncateAll()).resolves.toBeUndefined();
  });

  it('keeps a single initialized instance', async () => {
    const a = await setupTestDatabase();
    const b = await setupTestDatabase();
    expect(a).toBe(b);
    expect(TestDataSource.isInitialized).toBe(true);
  });
});
