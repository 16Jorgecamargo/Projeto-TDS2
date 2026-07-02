import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { Notification } from '../../infra/database/entities/notification.entity.js';

async function registerUser(app: FastifyInstance) {
  const email = `notification-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Notification User', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

describe('notification routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('lista vazio para usuario novo', async () => {
    const user = await registerUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?page=1&limit=20',
      headers: user.headers,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
  });

  it('lista notificacoes in_app do usuario e marca como lida', async () => {
    const user = await registerUser(app);
    const notifications = TestDataSource.getRepository(Notification);
    const saved = await notifications.save(
      notifications.create({
        user_id: user.userId,
        channel: 'in_app',
        type: 'review_received',
        title: 'Voce recebeu uma avaliacao',
        body: 'Nota 5',
        data: null,
        read_at: null,
        sent_at: new Date(),
      }),
    );

    const list = await app.inject({
      method: 'GET',
      url: '/api/notifications?page=1&limit=20',
      headers: user.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);
    expect(list.json().items[0]).toMatchObject({ id: saved.id, readAt: null });

    const markRead = await app.inject({
      method: 'PATCH',
      url: `/api/notifications/${saved.id}/read`,
      headers: user.headers,
    });
    expect(markRead.statusCode).toBe(204);

    const updated = await notifications.findOne({ where: { id: saved.id } });
    expect(updated?.read_at).not.toBeNull();
  });

  it('retorna 404 ao marcar como lida notificacao de outro usuario', async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    const notifications = TestDataSource.getRepository(Notification);
    const saved = await notifications.save(
      notifications.create({
        user_id: owner.userId,
        channel: 'in_app',
        type: 'review_received',
        title: 't',
        body: 'b',
        data: null,
        read_at: null,
        sent_at: new Date(),
      }),
    );

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/notifications/${saved.id}/read`,
      headers: other.headers,
    });
    expect(res.statusCode).toBe(404);
  });

  it('registra device token e evita duplicidade', async () => {
    const user = await registerUser(app);

    const first = await app.inject({
      method: 'POST',
      url: '/api/notifications/devices',
      headers: user.headers,
      payload: { token: 'fcm-token-1234567890', platform: 'android' },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/notifications/devices',
      headers: user.headers,
      payload: { token: 'fcm-token-1234567890', platform: 'android' },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().id).toBe(first.json().id);
  });

  it('retorna 401 sem autenticacao', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications',
    });
    expect(res.statusCode).toBe(401);
  });
});
