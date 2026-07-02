import { Worker } from 'bullmq';
import type { Repository } from 'typeorm';
import { redisConnection } from '../../infra/queues/index.js';
import { AppDataSource } from '../../infra/database/data-source.js';
import { Notification } from '../../infra/database/entities/notification.entity.js';
import { PushDeviceToken } from '../../infra/database/entities/push-device-token.entity.js';
import { NOTIFICATION_QUEUE_NAME, type NotificationJobData } from './notification.queue.js';
import { pushProvider, type PushPayload } from './providers/push.provider.js';
import { emailProvider, type EmailPayload } from './providers/email.provider.js';

export interface NotificationWorkerDeps {
  notifications: Repository<Notification>;
  deviceTokens: Repository<PushDeviceToken>;
  pushProvider: { send(token: string, payload: PushPayload): Promise<void> };
  emailProvider: { send(userId: string, payload: EmailPayload): Promise<void> };
}

export async function processNotificationJob(
  data: NotificationJobData,
  deps: NotificationWorkerDeps,
): Promise<void> {
  const record = deps.notifications.create({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    channel: data.channel,
    data: data.data ?? null,
    read_at: null,
    sent_at: new Date(),
  });
  await deps.notifications.save(record);

  if (data.channel === 'push') {
    const tokens = await deps.deviceTokens.find({ where: { user_id: data.userId } });
    await Promise.all(
      tokens.map((token) => deps.pushProvider.send(token.token, { title: data.title, body: data.body })),
    );
  }

  if (data.channel === 'email') {
    await deps.emailProvider.send(data.userId, { title: data.title, body: data.body });
  }
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  const deps: NotificationWorkerDeps = {
    notifications: AppDataSource.getRepository(Notification),
    deviceTokens: AppDataSource.getRepository(PushDeviceToken),
    pushProvider,
    emailProvider,
  };

  return new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job) => processNotificationJob(job.data, deps),
    { connection: redisConnection },
  );
}
