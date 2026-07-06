import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function registerUser(app: FastifyInstance, role: 'client' | 'professional') {
  const email = `payment-${role}-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Payment User', email, phone, password: 'S3nh@Forte', role },
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
      email: `payment-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Payment Admin',
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
    street: 'Rua Principal',
    number: '100',
    complement: null,
    district: 'Centro',
    city: 'Porto Alegre',
    state: 'RS',
    zipCode: '90000-000',
    tagIds: [],
    images: [],
  };
}

async function creditWallet(userId: string, amount: string): Promise<void> {
  const repo = TestDataSource.getRepository(Wallet);
  await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
}

describe('payment routes', () => {
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
      payload: { message: 'orcamento', validUntil: null, total },
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

  it('cliente paga contrato via carteira e taxa fica registrada', async () => {
    const { client, pro, contractId } = await createAcceptedContract(300);
    await creditWallet(client.userId, '500.00');

    const pay = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      headers: client.headers,
      payload: { method: 'wallet' },
    });
    expect(pay.statusCode).toBe(201);
    expect(pay.json().status).toBe('captured');
    expect(pay.json().amount).toBe(300);

    const fee = await app.inject({
      method: 'GET',
      url: `/api/payments/${pay.json().id}/fee`,
      headers: client.headers,
    });
    expect(fee.statusCode).toBe(200);
    expect(fee.json().amount).toBe(30);

    const wallet = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: pro.headers,
    });
    expect(wallet.json().balance).toBe(0);
    expect(wallet.json().pendingBalance).toBe(300);
  });

  it('bloqueia segundo pagamento do mesmo contrato', async () => {
    const { client, contractId } = await createAcceptedContract(100);
    await creditWallet(client.userId, '500.00');

    await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      headers: client.headers,
      payload: { method: 'wallet' },
    });

    const second = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      headers: client.headers,
      payload: { method: 'wallet' },
    });
    expect(second.statusCode).toBe(409);
  });

  it('nao-cliente recebe 403 ao tentar pagar', async () => {
    const { pro, contractId } = await createAcceptedContract(100);

    const res = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      headers: pro.headers,
      payload: { method: 'wallet' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('requisicao sem autenticacao recebe 401', async () => {
    const { contractId } = await createAcceptedContract(100);

    const res = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contractId}/payment`,
      payload: { method: 'wallet' },
    });
    expect(res.statusCode).toBe(401);
  });
});
