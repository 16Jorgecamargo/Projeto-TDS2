import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../../config/env.js';
import { entities } from './entities/index.js';
import { migrations } from './migrations/index.js';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  logging: false,
  entities,
  migrations,
});
