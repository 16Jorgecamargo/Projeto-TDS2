import { IsNull, type Repository } from 'typeorm';
import type { Notification } from '../../infra/database/entities/notification.entity.js';
import type { PushDeviceToken } from '../../infra/database/entities/push-device-token.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  NotificationChannel,
  NotificationResponse,
  RegisterDeviceBody,
  RegisterDeviceResponse,
} from './notification.schemas.js';
import type { NotificationJobData } from './notification.queue.js';

export interface EnqueueNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
}

export type EnqueueNotification = (input: EnqueueNotificationInput) => Promise<void>;

interface NotificationQueueLike {
  add(
    name: string,
    data: NotificationJobData,
    opts?: Record<string, unknown>,
  ): Promise<unknown>;
}

export function buildEnqueueNotification(queue: NotificationQueueLike): EnqueueNotification {
  return async (input) => {
    await Promise.all(
      input.channels.map((channel) =>
        queue.add(
          'deliver',
          {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            channel,
            data: input.data,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true },
        ),
      ),
    );
  };
}

interface NotificationServiceDeps {
  notifications: Repository<Notification>;
  deviceTokens: Repository<PushDeviceToken>;
}

export class NotificationService {
  constructor(private readonly deps: NotificationServiceDeps) {}

  private toResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      channel: notification.channel,
      readAt: notification.read_at ? notification.read_at.toISOString() : null,
      createdAt: notification.created_at.toISOString(),
    };
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationResponse[]; total: number }> {
    const [rows, total] = await this.deps.notifications.findAndCount({
      where: { user_id: userId, channel: 'in_app' },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toResponse(row)), total };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.deps.notifications.update(
      { id, user_id: userId },
      { read_at: new Date() },
    );
    if (!result.affected) {
      throw new NotFoundError('Notificacao nao encontrada');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.deps.notifications.update({ user_id: userId, read_at: IsNull() }, { read_at: new Date() });
  }

  async registerDeviceToken(
    userId: string,
    body: RegisterDeviceBody,
  ): Promise<RegisterDeviceResponse> {
    const existing = await this.deps.deviceTokens.findOne({
      where: { user_id: userId, token: body.token },
    });
    if (existing) {
      return { id: existing.id };
    }

    const saved = await this.deps.deviceTokens.save(
      this.deps.deviceTokens.create({
        user_id: userId,
        token: body.token,
        platform: body.platform,
      }),
    );
    return { id: saved.id };
  }
}
