import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `avail-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('availability routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria perfil, adiciona slot e le publicamente com horario HH:MM', async () => {
    const headers = await professionalHeader(app);
    const profile = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Diarista', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const professionalId = profile.json().id;

    const slot = await app.inject({
      method: 'POST',
      url: '/api/availability/me/slots',
      headers,
      payload: { weekday: 2, startTime: '09:00', endTime: '17:00' },
    });
    expect(slot.statusCode).toBe(201);
    expect(slot.json().startTime).toBe('09:00');
    expect(slot.json().endTime).toBe('17:00');

    const list = await app.inject({ method: 'GET', url: `/api/availability/${professionalId}/slots` });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].startTime).toBe('09:00');
    expect(list.json()[0].endTime).toBe('17:00');
  });

  it('rejeita adicionar slot sem autenticacao', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/availability/me/slots',
      payload: { weekday: 1, startTime: '08:00', endTime: '12:00' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('adiciona e remove excecao', async () => {
    const headers = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Jardineiro', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/availability/me/exceptions',
      headers,
      payload: { date: '2026-12-25', isAvailable: false, startTime: null, endTime: null, reason: 'Feriado' },
    });
    expect(created.statusCode).toBe(201);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/availability/me/exceptions/${created.json().id}`,
      headers,
    });
    expect(removed.statusCode).toBe(204);
  });
});
