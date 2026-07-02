import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `wallet-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Wallet User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

describe('wallet routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria carteira sob demanda e retorna saldo zero como number', async () => {
    const { headers } = await registerUser(app, 'professional');
    const res = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.balance).toBe(0);
    expect(typeof body.balance).toBe('number');
    expect(body.currency).toBe('BRL');
  });

  it('lista transacoes paginadas (vazio inicialmente)', async () => {
    const { headers } = await registerUser(app, 'professional');
    const res = await app.inject({
      method: 'GET',
      url: '/api/wallet/transactions',
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
    expect(res.json().total).toBe(0);
  });

  it('cada usuario possui sua propria carteira isolada', async () => {
    const userA = await registerUser(app, 'client');
    const userB = await registerUser(app, 'professional');

    const resA = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: userA.headers,
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: userB.headers,
    });

    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);
    expect(resA.json().id).not.toBe(resB.json().id);
    expect(resA.json().userId).toBe(userA.userId);
    expect(resB.json().userId).toBe(userB.userId);
  });

  it('cria a carteira corretamente mesmo com requisicoes concorrentes na primeira chamada', async () => {
    const { headers } = await registerUser(app, 'client');

    const [resA, resB, resC] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/wallet', headers }),
      app.inject({ method: 'GET', url: '/api/wallet', headers }),
      app.inject({ method: 'GET', url: '/api/wallet', headers }),
    ]);

    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);
    expect(resC.statusCode).toBe(200);
    expect(resA.json().id).toBe(resB.json().id);
    expect(resB.json().id).toBe(resC.json().id);
  });

  it('rejeita acesso nao autenticado', async () => {
    const walletRes = await app.inject({
      method: 'GET',
      url: '/api/wallet',
    });
    expect(walletRes.statusCode).toBe(401);

    const transactionsRes = await app.inject({
      method: 'GET',
      url: '/api/wallet/transactions',
    });
    expect(transactionsRes.statusCode).toBe(401);
  });
});
