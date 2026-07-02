import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `chat-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Chat User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

describe('chat routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria sala e reaproveita ao chamar de novo pelo outro participante', async () => {
    const client = await registerUser(app, 'client');
    const pro = await registerUser(app, 'professional');

    const first = await app.inject({
      method: 'POST',
      url: '/api/chat/rooms',
      headers: client.headers,
      payload: { participantId: pro.userId },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/chat/rooms',
      headers: pro.headers,
      payload: { participantId: client.userId },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().id).toBe(first.json().id);
  });

  it('lista mensagens paginadas da sala para participante', async () => {
    const client = await registerUser(app, 'client');
    const pro = await registerUser(app, 'professional');

    const room = await app.inject({
      method: 'POST',
      url: '/api/chat/rooms',
      headers: client.headers,
      payload: { participantId: pro.userId },
    });
    const roomId = room.json().id as string;

    const list = await app.inject({
      method: 'GET',
      url: `/api/chat/rooms/${roomId}/messages?page=1&limit=20`,
      headers: client.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toEqual([]);
    expect(list.json().total).toBe(0);
  });

  it('rejeita listagem de mensagens por quem nao participa da sala', async () => {
    const client = await registerUser(app, 'client');
    const pro = await registerUser(app, 'professional');
    const outsider = await registerUser(app, 'client');

    const room = await app.inject({
      method: 'POST',
      url: '/api/chat/rooms',
      headers: client.headers,
      payload: { participantId: pro.userId },
    });
    const roomId = room.json().id as string;

    const res = await app.inject({
      method: 'GET',
      url: `/api/chat/rooms/${roomId}/messages`,
      headers: outsider.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('requisicao sem autenticacao recebe 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat/rooms',
      payload: { participantId: '11111111-1111-1111-1111-111111111111' },
    });
    expect(res.statusCode).toBe(401);
  });
});
