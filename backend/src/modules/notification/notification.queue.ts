import { Queue } from 'bullmq';
import { redisConnection } from '../../infra/queues/index.js';
import type { NotificationChannel } from './notification.schemas.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  data?: Record<string, unknown>;
}

export const notificationQueue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
  connection: redisConnection,
});

notificationQueue.on('error', () => undefined);
