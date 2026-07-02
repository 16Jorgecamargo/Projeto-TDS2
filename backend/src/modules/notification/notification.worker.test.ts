import { describe, it, expect, vi } from 'vitest';
import { processNotificationJob, type NotificationWorkerDeps } from './notification.worker.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { Notification } from '../../infra/database/entities/notification.entity.js';
import type { PushDeviceToken } from '../../infra/database/entities/push-device-token.entity.js';

function makeDeps(): NotificationWorkerDeps {
  const notifications = mockRepo<Notification>();
  const deviceTokens = mockRepo<PushDeviceToken>();
  deviceTokens.find.mockResolvedValue([{ token: 't-1' }, { token: 't-2' }]);
  const pushProvider = { send: vi.fn().mockResolvedValue(undefined) };
  const emailProvider = { send: vi.fn().mockResolvedValue(undefined) };
  return {
    notifications: notifications as never,
    deviceTokens: deviceTokens as never,
    pushProvider,
    emailProvider,
  };
}

describe('processNotificationJob', () => {
  it('persiste notificacao in_app', async () => {
    const deps = makeDeps();

    await processNotificationJob(
      { userId: 'u-1', type: 'x', title: 't', body: 'b', channel: 'in_app' },
      deps,
    );

    expect(deps.notifications.save).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'in_app', user_id: 'u-1' }),
    );
    expect(deps.pushProvider.send).not.toHaveBeenCalled();
    expect(deps.emailProvider.send).not.toHaveBeenCalled();
  });

  it('envia push para cada device token e registra a notificacao', async () => {
    const deps = makeDeps();

    await processNotificationJob(
      { userId: 'u-1', type: 'x', title: 't', body: 'b', channel: 'push' },
      deps,
    );

    expect(deps.deviceTokens.find).toHaveBeenCalledWith({ where: { user_id: 'u-1' } });
    expect(deps.pushProvider.send).toHaveBeenCalledWith('t-1', expect.objectContaining({ title: 't' }));
    expect(deps.pushProvider.send).toHaveBeenCalledWith('t-2', expect.objectContaining({ title: 't' }));
    expect(deps.notifications.save).toHaveBeenCalledWith(expect.objectContaining({ channel: 'push' }));
  });

  it('envia email e registra a notificacao', async () => {
    const deps = makeDeps();

    await processNotificationJob(
      { userId: 'u-1', type: 'x', title: 't', body: 'b', channel: 'email' },
      deps,
    );

    expect(deps.emailProvider.send).toHaveBeenCalledWith('u-1', expect.objectContaining({ title: 't' }));
    expect(deps.notifications.save).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email' }));
  });
});
