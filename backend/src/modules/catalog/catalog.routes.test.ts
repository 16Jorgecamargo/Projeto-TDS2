import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll, TestDataSource } from '../../test/database.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { signAccessToken } from '../../shared/security/token.js';

async function clientHeader(app: FastifyInstance) {
  const email = `cat-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Cat', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

async function adminHeader() {
  const users = TestDataSource.getRepository(User);
  const admin = await users.save(
    users.create({
      email: `cat-admin-${Date.now()}-${Math.random()}@example.com`,
      phone: null,
      password_hash: 'hash',
      role: 'admin',
      full_name: 'Cat Admin',
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

describe('catalog routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('admin cria categoria; publico le lista e arvore', async () => {
    const headers = await adminHeader();
    const slug = `eletrica-${Date.now()}`;
    const created = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers,
      payload: { parentId: null, name: 'Eletrica', slug, icon: 'bolt', description: null },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().slug).toBe(slug);

    const list = await app.inject({ method: 'GET', url: '/api/categories' });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((item: { slug: string }) => item.slug === slug)).toBe(true);

    const tree = await app.inject({ method: 'GET', url: '/api/categories/tree' });
    expect(tree.statusCode).toBe(200);
    expect(Array.isArray(tree.json())).toBe(true);
  });

  it('nao-admin nao cria categoria', async () => {
    const headers = await clientHeader(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers,
      payload: { parentId: null, name: 'X', slug: `x-${Date.now()}`, icon: null, description: null },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejeita slug duplicado com 409', async () => {
    const headers = await adminHeader();
    const slug = `hidraulica-${Date.now()}`;
    const first = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers,
      payload: { parentId: null, name: 'Hidraulica', slug, icon: null, description: null },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers,
      payload: { parentId: null, name: 'Hidraulica 2', slug, icon: null, description: null },
    });
    expect(second.statusCode).toBe(409);
  });

  it('admin cria tag; publico lista tags', async () => {
    const headers = await adminHeader();
    const slug = `instalacao-${Date.now()}`;
    const created = await app.inject({
      method: 'POST',
      url: '/api/tags',
      headers,
      payload: { name: 'Instalacao', slug },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().slug).toBe(slug);

    const list = await app.inject({ method: 'GET', url: '/api/tags' });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((item: { slug: string }) => item.slug === slug)).toBe(true);
  });
});
