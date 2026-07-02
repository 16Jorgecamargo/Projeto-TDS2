import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

export const mailQueue = {
  async add(_name: string, _data: unknown): Promise<void> {},
};

export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
};
