import { DataSource } from 'typeorm';
import { loadTestEnv } from './env.js';

loadTestEnv();

export const TestDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TEST_DB_HOST,
  port: Number(process.env.TEST_DB_PORT),
  username: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
  database: process.env.TEST_DB_NAME,
  synchronize: false,
  dropSchema: false,
  logging: false,
  entities: ['src/infra/database/entities/**/*.{ts,js}'],
  migrations: ['src/infra/database/migrations/**/*.{ts,js}'],
});

export async function setupTestDatabase(): Promise<DataSource> {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
    await TestDataSource.runMigrations();
  }
  return TestDataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
}

export async function truncateAll(): Promise<void> {
  if (!TestDataSource.isInitialized) {
    return;
  }
  const tableNames = TestDataSource.entityMetadatas.map((metadata) => metadata.tableName);
  await TestDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const tableName of tableNames) {
      await TestDataSource.query(`TRUNCATE TABLE \`${tableName}\``);
    }
  } finally {
    await TestDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
