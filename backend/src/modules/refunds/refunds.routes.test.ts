import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `refund-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Refund User', email, phone, password: 'S3nh@Forte', role },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` }, userId: body.user.id as string };
}

async function createProfessionalWithProfile(app: FastifyInstance) {
  const { headers, userId } = await registerUser(app, 'professional');
  const res = await app.inject({
    method: 'PUT',
    url: '/api/professionals/me',
    headers,
    payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
  });
  return { headers, userId, profileId: res.json().id as string };
}

async function registerAdmin() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `refund-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Refund Admin',
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

function demandPayload(categoryId: string) {
  return {
    categoryId,
    title: 'Instalacao eletrica',
    description: 'x'.repeat(25),
    budgetMin: 100,
    budgetMax: 500,
    addressId: null,
    tagIds: [],
    images: [],
  };
}

async function creditWallet(userId: string, amount: string): Promise<void> {
  const repo = TestDataSource.getRepository(Wallet);
  await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
}

describe('refund routes', () => {
  let app: FastifyInstance;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
    const admin = await registerAdmin();
    const category = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: admin,
      payload: {
        parentId: null,
        name: 'Eletrica',
        slug: `eletrica-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        icon: null,
        description: null,
      },
    });
    categoryId = category.json().id;
  });
  afterAll(async () => {
    await app.close();
  });

  async function createDemand(headers: { authorization: string }) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers,
      payload: demandPayload(categoryId),
    });
    return res.json().id as string;
  }

  async function createAcceptedContract(total: number) {
    const client = await registerUser(app, 'client');
    const pro = await createProfessionalWithProfile(app);
    const demandId = await createDemand(client.headers);

    const quote = await app.inject({
      method: 'POST',
      url: `/api/demands/${demandId}/quotes`,
      headers: pro.headers,
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mao de obra', quantity: 1, unitPrice: total }] },
    });
    const quoteId = quote.json().id;

    const accept = await app.inject({
      method: 'POST',
      url: `/api/quotes/${quoteId}/accept`,
      headers: client.headers,
      payload: { schedule: null },
    });
    const contractId = accept.json().id as string;

    return { client, pro, contractId };
  }

  async function createCapturedPayment(total: number) {
    const { client, pro, contractId } = await createAcceptedContract(total);
    await creditWallet(client.userId, '500.00');

    const pay = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      headers: client.headers,
      payload: { method: 'wallet' },
    });
    return { client, pro, contractId, paymentId: pay.json().id as string };
  }

  it('admin estorna pagamento capturado e devolve saldo ao pagador', async () => {
    const admin = await registerAdmin();
    const { client, paymentId } = await createCapturedPayment(200);

    const refund = await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      headers: admin,
      payload: { reason: 'cancelado' },
    });
    expect(refund.statusCode).toBe(201);
    expect(refund.json().status).toBe('completed');
    expect(refund.json().amount).toBe(200);

    const clientWallet = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: client.headers,
    });
    expect(clientWallet.json().balance).toBe(500);
  });

  it('cliente nao pode estornar pagamento', async () => {
    const { client, paymentId } = await createCapturedPayment(100);

    const res = await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      headers: client.headers,
      payload: { reason: null },
    });
    expect(res.statusCode).toBe(403);
  });

  it('nao permite estornar pagamento ja estornado', async () => {
    const admin = await registerAdmin();
    const { paymentId } = await createCapturedPayment(100);

    await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      headers: admin,
      payload: { reason: 'cancelado' },
    });

    const second = await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      headers: admin,
      payload: { reason: 'cancelado de novo' },
    });
    expect(second.statusCode).toBe(422);
  });

  it('requisicao sem autenticacao recebe 401', async () => {
    const { paymentId } = await createCapturedPayment(100);

    const res = await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      payload: { reason: 'cancelado' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('lista estornos do pagamento apos criacao', async () => {
    const admin = await registerAdmin();
    const { paymentId } = await createCapturedPayment(150);

    await app.inject({
      method: 'POST',
      url: `/api/payments/${paymentId}/refund`,
      headers: admin,
      payload: { reason: 'cancelado' },
    });

    const list = await app.inject({
      method: 'GET',
      url: `/api/payments/${paymentId}/refunds`,
      headers: admin,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].paymentId).toBe(paymentId);
  });
});
