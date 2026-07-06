import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { NotificationService, buildEnqueueNotification } from './notification.service.js';
import { mockRepo, mockQueue } from '../../test/mocks/index.js';
import { NotFoundError } from '../../shared/errors.js';
import type { Notification } from '../../infra/database/entities/notification.entity.js';
import type { PushDeviceToken } from '../../infra/database/entities/push-device-token.entity.js';
import type { NotificationJobData } from './notification.queue.js';

describe('buildEnqueueNotification', () => {
  it('adiciona um job por canal solicitado', async () => {
    const queue = mockQueue<NotificationJobData>();
    const enqueue = buildEnqueueNotification(queue);

    await enqueue({
      userId: 'u-1',
      type: 'review_received',
      title: 't',
      body: 'b',
      channels: ['in_app', 'push', 'email'],
    });

    expect(queue.jobs).toHaveLength(3);
    expect(queue.jobs.map((job) => job.data.channel).sort()).toEqual(['email', 'in_app', 'push']);
    expect(queue.jobs[0]?.name).toBe('deliver');
    expect(queue.jobs.every((job) => job.data.userId === 'u-1')).toBe(true);
  });
});

describe('NotificationService', () => {
  let notifications: ReturnType<typeof mockRepo<Notification>>;
  let deviceTokens: ReturnType<typeof mockRepo<PushDeviceToken>>;
  let service: NotificationService;

  beforeEach(() => {
    notifications = mockRepo<Notification>();
    deviceTokens = mockRepo<PushDeviceToken>();
    service = new NotificationService({
      notifications: notifications as unknown as Repository<Notification>,
      deviceTokens: deviceTokens as unknown as Repository<PushDeviceToken>,
    });
  });

  describe('listForUser', () => {
    it('lista notificacoes in_app paginadas', async () => {
      notifications.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'n-1',
            user_id: 'u-1',
            channel: 'in_app',
            type: 'review_received',
            title: 't',
            body: 'b',
            data: null,
            read_at: null,
            sent_at: null,
            created_at: new Date('2026-07-01T12:00:00Z'),
          },
        ],
        1,
      ]);

      const result = await service.listForUser('u-1', 1, 20);

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 'n-1', channel: 'in_app', readAt: null });
      expect(notifications.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'u-1', channel: 'in_app' } }),
      );
    });
  });

  describe('markRead', () => {
    it('marca como lida', async () => {
      notifications.update.mockResolvedValueOnce({ affected: 1, raw: {}, generatedMaps: [] });

      await service.markRead('u-1', 'n-1');

      expect(notifications.update).toHaveBeenCalledWith(
        { id: 'n-1', user_id: 'u-1' },
        expect.objectContaining({ read_at: expect.any(Date) }),
      );
    });

    it('lanca NotFoundError quando nao afeta nenhuma linha', async () => {
      notifications.update.mockResolvedValueOnce({ affected: 0, raw: {}, generatedMaps: [] });

      await expect(service.markRead('u-1', 'n-404')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('markAllRead', () => {
    it('marca todas as notificacoes nao lidas do usuario', async () => {
      notifications.update.mockResolvedValueOnce({ affected: 3, raw: {}, generatedMaps: [] });

      await service.markAllRead('u-1');

      expect(notifications.update).toHaveBeenCalledWith(
        { user_id: 'u-1', read_at: expect.anything() },
        expect.objectContaining({ read_at: expect.any(Date) }),
      );
    });
  });

  describe('registerDeviceToken', () => {
    it('cria token novo quando nao existe', async () => {
      deviceTokens.findOne.mockResolvedValueOnce(null);
      deviceTokens.save.mockImplementationOnce(async (value: Partial<PushDeviceToken>) => ({
        id: 'd-1',
        ...value,
      }));

      const result = await service.registerDeviceToken('u-1', { token: 'fcm-token-1234567890', platform: 'android' });

      expect(result).toEqual({ id: 'd-1' });
      expect(deviceTokens.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u-1', token: 'fcm-token-1234567890', platform: 'android' }),
      );
    });

    it('retorna token existente sem duplicar', async () => {
      deviceTokens.findOne.mockResolvedValueOnce({
        id: 'd-existing',
        user_id: 'u-1',
        token: 'fcm-token-1234567890',
        platform: 'android',
        created_at: new Date(),
      });

      const result = await service.registerDeviceToken('u-1', { token: 'fcm-token-1234567890', platform: 'android' });

      expect(result).toEqual({ id: 'd-existing' });
      expect(deviceTokens.save).not.toHaveBeenCalled();
    });
  });
});
