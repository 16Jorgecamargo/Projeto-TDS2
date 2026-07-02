import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../buildTestApp.js';
import { TestDataSource } from '../database.js';
import { resetDatabase, loginAs } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('resetDatabase', () => {
  it('esvazia a tabela users', async () => {
    const repo = TestDataSource.getRepository('User');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Temp',
        email: 'temp@example.com',
        phone: '+5551999990010',
        password: 'Senha123!',
        role: 'client',
      },
    });
    expect(await repo.count()).toBeGreaterThan(0);
    await resetDatabase();
    expect(await repo.count()).toBe(0);
  });
});

describe('loginAs', () => {
  it('retorna accessToken real e o usuario autenticado', async () => {
    await resetDatabase();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Ana',
        email: 'ana@example.com',
        phone: '+5551999990011',
        password: 'Senha123!',
        role: 'client',
      },
    });
    const session = await loginAs(app, { email: 'ana@example.com', password: 'Senha123!' });
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.user.role).toBe('client');
  });
});
