import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `withdrawal-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Withdrawal User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

async function createProfessionalWithProfile(app: FastifyInstance) {
  const { headers, userId } = await registerUser(app, 'professional');
  await app.inject({
    method: 'PUT',
    url: '/api/professionals/me',
    headers,
    payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
  });
  return { headers, userId };
}

async function registerAdmin() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `withdrawal-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Withdrawal Admin',
      cpf: null,
      avatar_url: null,
      status: 'active',
      email_verified_at: null,
      phone_verified_at: null,
    }),
  );
  const token = signAccessToken({ sub: admin.id, role: 'admin' });
  return { authorization: `Bearer ${token}` };
}

async function seedWallet(userId: string, amount: string): Promise<void> {
  const repo = TestDataSource.getRepository(Wallet);
  await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
}

describe('withdrawal routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('profissional solicita saque, saldo cai imediatamente e admin processa', async () => {
    const pro = await createProfessionalWithProfile(app);
    const admin = await registerAdmin();
    await seedWallet(pro.userId, '300.00');

    const req = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: pro.headers,
      payload: { amount: 200, paymentMethod: 'pix', destination: 'user@pix.com' },
    });
    expect(req.statusCode).toBe(201);
    expect(req.json().status).toBe('pending');

    const wallet = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: pro.headers,
    });
    expect(wallet.json().balance).toBe(100);

    const process = await app.inject({
      method: 'POST',
      url: `/api/withdrawals/${req.json().id}/process`,
      headers: admin,
    });
    expect(process.statusCode).toBe(200);
    expect(process.json().status).toBe('completed');
  });

  it('rejeita saque acima do saldo', async () => {
    const pro = await createProfessionalWithProfile(app);
    await seedWallet(pro.userId, '50.00');

    const res = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: pro.headers,
      payload: { amount: 200, paymentMethod: 'pix', destination: 'insufficient@pix.com' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('lista saques do profissional autenticado', async () => {
    const pro = await createProfessionalWithProfile(app);
    await seedWallet(pro.userId, '300.00');

    await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: pro.headers,
      payload: { amount: 100, paymentMethod: 'pix', destination: 'user@pix.com' },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/withdrawals',
      headers: pro.headers,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });

  it('cliente nao pode solicitar saque', async () => {
    const client = await registerUser(app, 'client');

    const res = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: client.headers,
      payload: { amount: 100, paymentMethod: 'pix', destination: 'user@pix.com' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('nao admin nao pode processar saque', async () => {
    const pro = await createProfessionalWithProfile(app);
    await seedWallet(pro.userId, '300.00');

    const created = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      headers: pro.headers,
      payload: { amount: 100, paymentMethod: 'pix', destination: 'user@pix.com' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/withdrawals/${created.json().id}/process`,
      headers: pro.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('requisicao sem autenticacao recebe 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/withdrawals',
      payload: { amount: 100, paymentMethod: 'pix', destination: 'user@pix.com' },
    });
    expect(res.statusCode).toBe(401);
  });
});
