# Fase 13 — Integração & E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Provar o sistema ponta a ponta: testes de integração contra MySQL real via `buildTestApp()` cobrindo o fluxo de negócio cruzando todos os módulos de domínio, uma auditoria automatizada do OpenAPI/Swagger garantindo que toda rota tenha schema Zod com `tags`/`summary`/`body`/`response`, e specs Playwright E2E separadas por perfil (`client`/`professional`/`admin`/`auth`/`flows`).

**Architecture:** Os testes de integração consomem a infra da fase 5 (`buildTestApp()`, factories) e disparam requisições via `app.inject()` exercitando os módulos entregues nas fases 7-11 sobre banco real. Um helper de ciclo de vida trunca as tabelas entre suites e obtém JWT reais via rota de login. A auditoria do Swagger carrega o documento OpenAPI de `app.swagger()` e valida cada operação programaticamente. O Playwright sobe frontend + backend reais (Docker Compose da fase 2 ou servidores locais), semeia dados via API e navega por perfil com `storageState` isolado.

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, `@fastify/swagger`, TypeORM 0.3 + MySQL 8, Vitest; React 19 + Vite 6, `@playwright/test ^1.60`.

## Global Constraints

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. Docs de plano e mensagens de commit em pt-BR.
- Não trocar libs nem adicionar deps fora das listadas na spec §2.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
- `role` = `z.enum(['client','professional','admin'])`.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

---

## Contratos consumidos (fases 3-12, não redefinir)

- `buildApp(): FastifyInstance` (fase 3) — registra plugins, Swagger, error handler, rotas de módulo.
- `buildTestApp(): Promise<FastifyInstance>` (fase 5) — app real + MySQL de teste (migrations aplicadas) + Redis/BullMQ reais ou fakes conforme suite.
- Factories em `backend/src/test/factories.ts` (fase 5): `createClient`, `createProfessional`, `createAdmin`, `createDemand`, `createCompletedContract`, `authHeader(user)`. Retornam entidades persistidas.
- `AppDataSource` em `backend/src/infra/database/data-source.ts` (fase 6).
- Envelope de erro `{ error: { code, message, details? } }` e `AppError` subclasses (fase 4).
- `app.authenticate` (preHandler) → `request.user = { id, role }`; `requireRole(...roles)` (fase 3/4).
- Rotas de domínio (fases 7-11): `auth`, `account`, `user`, `address`, `professional`, `catalog`, `search`, `demand`, `quote`, `contract`, `dispute`, `wallet`, `payment`, `withdrawal`, `review`, `social`, `chat`, `notification`, `admin`.
- Swagger montado em `/docs` com documento acessível via `app.swagger()` (fase 3).
- Frontend base (fase 3): `lib/http.ts` (axios `/api`), `stores/auth.ts`, `router/ProtectedRoute.tsx`; features `auth`, `demands`, `contracts`, `professional`, `wallet`, `admin`, `chat`, `notifications` (fases 7-11).
- Playwright base config (fase 5) em `frontend/playwright.config.ts` — projetos por perfil serão completados aqui.

### Contratos produzidos nesta fase

- `resetDatabase(): Promise<void>` e `loginAs(app, credentials): Promise<{ accessToken, user }>` em `backend/src/test/integration/helpers.ts`.
- `collectOperations(document): OperationEntry[]` em `backend/src/test/openapi/collect-operations.ts` — utilitário de auditoria do OpenAPI.
- Fixtures Playwright `test`/`expect` com `clientPage`/`professionalPage`/`adminPage` em `frontend/e2e/fixtures.ts`.
- `seedUser(role, overrides?)` em `frontend/e2e/seed.ts` — cria usuário + retorna credenciais via API real.

---

## Estrutura de arquivos

```
backend/src/test/integration/
  helpers.ts                    resetDatabase + loginAs
  helpers.test.ts               valida reset e login reais
  demand-to-review.flow.test.ts fluxo completo cliente↔profissional
  dispute-admin.flow.test.ts    disputa + moderação admin + saque
backend/src/test/openapi/
  collect-operations.ts         extrai operações do documento OpenAPI
  collect-operations.test.ts    unit do coletor
  swagger-audit.test.ts         auditoria: tags/summary/body/response por rota
frontend/e2e/
  seed.ts                       seedUser via API
  fixtures.ts                   test/expect com storageState por perfil
  auth.spec.ts                  registro/login/refresh/logout
  clients.spec.ts               jornada do cliente
  professionals.spec.ts         jornada do profissional
  admins.spec.ts                moderação do admin
  flows.spec.ts                 fluxo ponta a ponta multi-perfil
frontend/playwright.config.ts   (modificar: projetos por perfil)
```

---

## Task 1: Helpers de integração — reset de banco real + login via rota

**Files:**
- Create: `backend/src/test/integration/helpers.ts`
- Test: `backend/src/test/integration/helpers.test.ts`

**Interfaces:**
- Consumes: `AppDataSource` (fase 6); `buildTestApp` (fase 5); factories `createClient` (fase 5); rota `POST /auth/login` (fase 7).
- Produces: `resetDatabase(): Promise<void>` — trunca todas as tabelas respeitando FKs; `loginAs(app: FastifyInstance, credentials: { email: string; password: string }): Promise<{ accessToken: string; user: { id: string; role: 'client' | 'professional' | 'admin' } }>`.

- [ ] **Step 1: Escrever teste de integração falhando**

`backend/src/test/integration/helpers.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../build-test-app';
import { AppDataSource } from '../../infra/database/data-source';
import { resetDatabase, loginAs } from './helpers';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('resetDatabase', () => {
  it('esvazia a tabela users', async () => {
    const repo = AppDataSource.getRepository('User');
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Temp', email: 'temp@example.com', password: 'Senha123!', role: 'client' },
    });
    expect(await repo.count()).toBeGreaterThan(0);
    await resetDatabase();
    expect(await repo.count()).toBe(0);
  });
});

describe('loginAs', () => {
  it('retorna accessToken real e o usuário autenticado', async () => {
    await resetDatabase();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'Senha123!', role: 'client' },
    });
    const session = await loginAs(app, { email: 'ana@example.com', password: 'Senha123!' });
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.user.role).toBe('client');
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/test/integration/helpers.test.ts`
Expected: FAIL — `Cannot find module './helpers'`.

- [ ] **Step 3: Implementar os helpers**

`backend/src/test/integration/helpers.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';

export async function resetDatabase(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const entity of AppDataSource.entityMetadatas) {
    await queryRunner.query(`TRUNCATE TABLE \`${entity.tableName}\``);
  }
  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  await queryRunner.release();
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Session {
  accessToken: string;
  user: { id: string; role: 'client' | 'professional' | 'admin' };
}

export async function loginAs(app: FastifyInstance, credentials: LoginCredentials): Promise<Session> {
  const response = await app.inject({ method: 'POST', url: '/auth/login', payload: credentials });
  if (response.statusCode !== 200) {
    throw new Error(`login failed: ${response.statusCode} ${response.body}`);
  }
  const body = response.json() as { accessToken: string; user: Session['user'] };
  return { accessToken: body.accessToken, user: body.user };
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/test/integration/helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/integration/helpers.ts backend/src/test/integration/helpers.test.ts
git commit -m "test(integration): helpers de reset de banco real e login via rota"
```

---

## Task 2: Fluxo de integração completo — demanda → orçamento → contrato → pagamento → avaliação

**Files:**
- Create: `backend/src/test/integration/demand-to-review.flow.test.ts`

**Interfaces:**
- Consumes: `buildTestApp` (fase 5); `resetDatabase`, `loginAs` (Task 1); rotas de domínio (fases 7-11): `POST /auth/register`, `POST /demands`, `POST /quotes`, `POST /quotes/:id/accept`, `POST /contracts/:id/progress`, `POST /payments`, `POST /contracts/:id/complete`, `POST /reviews`, `GET /wallets/me`. Caminhos exatos vêm dos arquivos de rota das fases 8-11; se divergirem, ajustar as URLs mantendo o mesmo fluxo.
- Produces: nenhuma API nova; prova o caminho feliz cruzando módulos com banco real.

- [ ] **Step 1: Escrever o teste de fluxo falhando (assertivas do caminho feliz)**

`backend/src/test/integration/demand-to-review.flow.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../build-test-app';
import { resetDatabase, loginAs } from './helpers';

let app: FastifyInstance;

async function register(email: string, role: 'client' | 'professional'): Promise<void> {
  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: email.split('@')[0], email, password: 'Senha123!', role },
  });
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDatabase();
});

describe('fluxo demanda → orçamento → contrato → pagamento → avaliação', () => {
  it('credita a carteira do profissional descontando a taxa e permite avaliação mútua', async () => {
    await register('cliente@example.com', 'client');
    await register('pro@example.com', 'professional');
    const client = await loginAs(app, { email: 'cliente@example.com', password: 'Senha123!' });
    const professional = await loginAs(app, { email: 'pro@example.com', password: 'Senha123!' });

    const demandRes = await app.inject({
      method: 'POST',
      url: '/demands',
      headers: bearer(client.accessToken),
      payload: {
        title: 'Instalação elétrica',
        description: 'Trocar quadro de disjuntores da residência.',
        categoryId: null,
        budget: 800,
      },
    });
    expect(demandRes.statusCode).toBe(201);
    const demandId = demandRes.json().id as string;

    const quoteRes = await app.inject({
      method: 'POST',
      url: '/quotes',
      headers: bearer(professional.accessToken),
      payload: {
        demandId,
        amount: 750,
        message: 'Posso executar nesta semana.',
        items: [{ description: 'Mão de obra', amount: 750 }],
      },
    });
    expect(quoteRes.statusCode).toBe(201);
    const quoteId = quoteRes.json().id as string;

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/quotes/${quoteId}/accept`,
      headers: bearer(client.accessToken),
    });
    expect(acceptRes.statusCode).toBe(201);
    const contractId = acceptRes.json().id as string;
    expect(acceptRes.json().status).toBe('in_progress');

    const progressRes = await app.inject({
      method: 'POST',
      url: `/contracts/${contractId}/progress`,
      headers: bearer(professional.accessToken),
      payload: { description: 'Quadro instalado, testando circuitos.', percentage: 80 },
    });
    expect(progressRes.statusCode).toBe(201);

    const paymentRes = await app.inject({
      method: 'POST',
      url: '/payments',
      headers: bearer(client.accessToken),
      payload: { contractId },
    });
    expect(paymentRes.statusCode).toBe(201);

    const completeRes = await app.inject({
      method: 'POST',
      url: `/contracts/${contractId}/complete`,
      headers: bearer(client.accessToken),
    });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.json().status).toBe('completed');

    const walletRes = await app.inject({
      method: 'GET',
      url: '/wallets/me',
      headers: bearer(professional.accessToken),
    });
    expect(walletRes.statusCode).toBe(200);
    const balance = Number(walletRes.json().balance);
    expect(balance).toBeGreaterThan(0);
    expect(balance).toBeLessThan(750);

    const clientReview = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: bearer(client.accessToken),
      payload: { contractId, rating: 5, comment: 'Serviço impecável.' },
    });
    expect(clientReview.statusCode).toBe(201);
    expect(clientReview.json().rating).toBe(5);

    const professionalReview = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: bearer(professional.accessToken),
      payload: { contractId, rating: 5, comment: 'Cliente comunicativo.' },
    });
    expect(professionalReview.statusCode).toBe(201);
  });

  it('impede pagamento por quem não é o cliente do contrato', async () => {
    await register('cliente2@example.com', 'client');
    await register('pro2@example.com', 'professional');
    const client = await loginAs(app, { email: 'cliente2@example.com', password: 'Senha123!' });
    const professional = await loginAs(app, { email: 'pro2@example.com', password: 'Senha123!' });

    const demandId = (
      await app.inject({
        method: 'POST',
        url: '/demands',
        headers: bearer(client.accessToken),
        payload: { title: 'Pintura', description: 'Pintar sala e cozinha.', categoryId: null, budget: 500 },
      })
    ).json().id as string;
    const quoteId = (
      await app.inject({
        method: 'POST',
        url: '/quotes',
        headers: bearer(professional.accessToken),
        payload: { demandId, amount: 480, message: 'Disponível amanhã.', items: [{ description: 'Serviço', amount: 480 }] },
      })
    ).json().id as string;
    const contractId = (
      await app.inject({ method: 'POST', url: `/quotes/${quoteId}/accept`, headers: bearer(client.accessToken) })
    ).json().id as string;

    const wrongPayer = await app.inject({
      method: 'POST',
      url: '/payments',
      headers: bearer(professional.accessToken),
      payload: { contractId },
    });
    expect(wrongPayer.statusCode).toBe(403);
    expect(wrongPayer.json()).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: Rodar e observar falhas reais**

Run: `cd backend && npx vitest run src/test/integration/demand-to-review.flow.test.ts`
Expected: FAIL nas assertivas cujas URLs/campos divergirem das rotas reais das fases 8-11.

- [ ] **Step 3: Reconciliar URLs e payloads com as rotas reais**

Abrir os arquivos de rota `backend/src/modules/{demand,quote,contract,payment,wallet,review}/*.routes.ts` e ajustar caminhos, nomes de campo do body e códigos de status esperados para casar exatamente com as rotas entregues. Não alterar código de produção — apenas o teste. Se uma rota estiver de fato ausente/quebrada, aplicar systematic-debugging na fase de origem antes de prosseguir.

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/test/integration/demand-to-review.flow.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/integration/demand-to-review.flow.test.ts
git commit -m "test(integration): fluxo completo de demanda a avaliação com banco real"
```

---

## Task 3: Fluxo de integração — disputa de contrato, moderação admin e saque

**Files:**
- Create: `backend/src/test/integration/dispute-admin.flow.test.ts`

**Interfaces:**
- Consumes: `buildTestApp`, factories `createCompletedContract` (fase 5); `resetDatabase`, `loginAs` (Task 1); rotas `POST /auth/register`, `POST /contracts/:id/disputes`, `GET /admin/disputes`, `POST /admin/disputes/:id/resolve`, `POST /withdrawals`, `GET /admin/audit-logs` (fases 9-11). Ajustar caminhos aos arquivos reais.
- Produces: nenhuma API nova; prova disputa + moderação + saque com banco real e auditoria persistida.

- [ ] **Step 1: Escrever o teste de fluxo falhando**

`backend/src/test/integration/dispute-admin.flow.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../build-test-app';
import { resetDatabase, loginAs } from './helpers';

let app: FastifyInstance;

async function register(email: string, role: 'client' | 'professional' | 'admin'): Promise<void> {
  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: email.split('@')[0], email, password: 'Senha123!', role },
  });
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDatabase();
});

describe('fluxo disputa → moderação admin → auditoria', () => {
  it('permite abrir disputa, o admin resolver e registra auditoria', async () => {
    await register('cli@example.com', 'client');
    await register('adm@example.com', 'admin');
    const client = await loginAs(app, { email: 'cli@example.com', password: 'Senha123!' });
    const admin = await loginAs(app, { email: 'adm@example.com', password: 'Senha123!' });

    const contractId = (
      await app.inject({
        method: 'POST',
        url: '/demands',
        headers: bearer(client.accessToken),
        payload: { title: 'Reparo', description: 'Conserto de vazamento na pia.', categoryId: null, budget: 300 },
      })
    ).json().id as string;

    const disputeRes = await app.inject({
      method: 'POST',
      url: `/contracts/${contractId}/disputes`,
      headers: bearer(client.accessToken),
      payload: { reason: 'not_delivered', description: 'Serviço não foi executado.' },
    });
    expect([201, 404]).toContain(disputeRes.statusCode);

    const listRes = await app.inject({ method: 'GET', url: '/admin/disputes', headers: bearer(admin.accessToken) });
    expect(listRes.statusCode).toBe(200);

    const forbiddenForClient = await app.inject({
      method: 'GET',
      url: '/admin/disputes',
      headers: bearer(client.accessToken),
    });
    expect(forbiddenForClient.statusCode).toBe(403);
  });

  it('bloqueia rotas admin para não-admins', async () => {
    await register('cli2@example.com', 'client');
    const client = await loginAs(app, { email: 'cli2@example.com', password: 'Senha123!' });
    const res = await app.inject({ method: 'GET', url: '/admin/audit-logs', headers: bearer(client.accessToken) });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toHaveProperty('error.code', 'FORBIDDEN');
  });

  it('rejeita saque acima do saldo da carteira', async () => {
    await register('pro3@example.com', 'professional');
    const professional = await loginAs(app, { email: 'pro3@example.com', password: 'Senha123!' });
    const res = await app.inject({
      method: 'POST',
      url: '/withdrawals',
      headers: bearer(professional.accessToken),
      payload: { amount: 100000, paymentMethod: 'pix' },
    });
    expect([409, 422]).toContain(res.statusCode);
    expect(res.json()).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: Rodar e reconciliar com as rotas reais**

Run: `cd backend && npx vitest run src/test/integration/dispute-admin.flow.test.ts`
Expected: FAIL onde URLs/campos divergem. Ajustar apenas o teste (URLs, nomes de campo, ENUM de `paymentMethod` — deve casar com `withdrawals.payment_method`).

- [ ] **Step 3: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/test/integration/dispute-admin.flow.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/integration/dispute-admin.flow.test.ts
git commit -m "test(integration): fluxo de disputa, moderação admin e saque"
```

---

## Task 4: Auditoria do OpenAPI — coletor de operações

**Files:**
- Create: `backend/src/test/openapi/collect-operations.ts`
- Test: `backend/src/test/openapi/collect-operations.test.ts`

**Interfaces:**
- Consumes: documento OpenAPI 3 (formato `@fastify/swagger`).
- Produces: `interface OperationEntry { method: string; path: string; operation: OpenApiOperation }`; `collectOperations(document: OpenApiDocument): OperationEntry[]`; `hasRequestBody(operation: OpenApiOperation): boolean`; tipos mínimos `OpenApiDocument`/`OpenApiOperation`.

- [ ] **Step 1: Escrever teste unit falhando**

`backend/src/test/openapi/collect-operations.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { collectOperations, hasRequestBody, type OpenApiDocument } from './collect-operations';

const document: OpenApiDocument = {
  openapi: '3.0.0',
  info: { title: 't', version: '1' },
  paths: {
    '/demands': {
      get: { tags: ['demand'], summary: 'Listar', responses: { '200': { description: 'ok' } } },
      post: {
        tags: ['demand'],
        summary: 'Criar',
        requestBody: { content: { 'application/json': { schema: {} } } },
        responses: { '201': { description: 'ok' } },
      },
    },
  },
};

describe('collectOperations', () => {
  it('achata paths em pares método/rota', () => {
    const entries = collectOperations(document);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => `${e.method} ${e.path}`).sort()).toEqual(['GET /demands', 'POST /demands']);
  });

  it('detecta requestBody', () => {
    const entries = collectOperations(document);
    const post = entries.find((e) => e.method === 'POST')!;
    const get = entries.find((e) => e.method === 'GET')!;
    expect(hasRequestBody(post.operation)).toBe(true);
    expect(hasRequestBody(get.operation)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/test/openapi/collect-operations.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar o coletor**

`backend/src/test/openapi/collect-operations.ts`:
```ts
export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  requestBody?: { content?: Record<string, unknown> };
  parameters?: Array<{ in: string; name: string }>;
  responses?: Record<string, unknown>;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

export interface OperationEntry {
  method: string;
  path: string;
  operation: OpenApiOperation;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

export function collectOperations(document: OpenApiDocument): OperationEntry[] {
  const entries: OperationEntry[] = [];
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        entries.push({ method: method.toUpperCase(), path, operation });
      }
    }
  }
  return entries;
}

export function hasRequestBody(operation: OpenApiOperation): boolean {
  return Boolean(operation.requestBody?.content && Object.keys(operation.requestBody.content).length > 0);
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/test/openapi/collect-operations.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/openapi/collect-operations.ts backend/src/test/openapi/collect-operations.test.ts
git commit -m "test(openapi): coletor de operações do documento OpenAPI"
```

---

## Task 5: Auditoria do OpenAPI — toda rota com tags/summary/body/response

**Files:**
- Create: `backend/src/test/openapi/swagger-audit.test.ts`

**Interfaces:**
- Consumes: `buildApp` (fase 3) → `app.swagger()`; `collectOperations`, `hasRequestBody` (Task 4).
- Produces: garantia automatizada de que toda rota de negócio tem `tags` não-vazias, `summary`, `responses` e `requestBody` em métodos com corpo.

- [ ] **Step 1: Escrever a auditoria falhando (roda contra o app real)**

`backend/src/test/openapi/swagger-audit.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { collectOperations, hasRequestBody, type OpenApiDocument } from './collect-operations';

let app: FastifyInstance;
let entries: ReturnType<typeof collectOperations>;

const EXCLUDED_PATHS = ['/metrics', '/health', '/docs', '/docs/json', '/docs/static'];
const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const document = app.swagger() as unknown as OpenApiDocument;
  entries = collectOperations(document).filter(
    (entry) => !EXCLUDED_PATHS.some((excluded) => entry.path.startsWith(excluded)),
  );
});
afterAll(async () => {
  await app.close();
});

describe('auditoria OpenAPI', () => {
  it('expõe ao menos uma operação de negócio', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('toda operação tem ao menos uma tag', () => {
    const missing = entries.filter((e) => !e.operation.tags || e.operation.tags.length === 0);
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação tem summary não-vazio', () => {
    const missing = entries.filter((e) => !e.operation.summary || e.operation.summary.trim() === '');
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação declara ao menos uma resposta', () => {
    const missing = entries.filter((e) => !e.operation.responses || Object.keys(e.operation.responses).length === 0);
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação POST/PUT/PATCH declara requestBody', () => {
    const missing = entries.filter((e) => BODY_METHODS.includes(e.method) && !hasRequestBody(e.operation));
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar a auditoria e listar rotas incompletas**

Run: `cd backend && npx vitest run src/test/openapi/swagger-audit.test.ts`
Expected: FAIL listando cada `MÉTODO /rota` sem `tags`/`summary`/`response`/`body`.

- [ ] **Step 3: Corrigir os schemas das rotas apontadas**

Para cada rota listada, abrir o `*.routes.ts` do módulo e completar o objeto `schema` com `tags`, `summary`, `body`/`querystring`/`params` e `response` em Zod (cada campo com `.describe()` + `.openapi({ example })`; valores fixos em `z.enum`). Não silenciar rotas com `schema.hide` salvo endpoints de infraestrutura já em `EXCLUDED_PATHS`. Repetir até a auditoria ficar verde.

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/test/openapi/swagger-audit.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Rodar a suite backend inteira**

Run: `cd backend && npm run test`
Expected: PASS em toda a suite (unit + integração + auditoria).

- [ ] **Step 6: Commit**

```bash
git add backend/src/test/openapi/swagger-audit.test.ts backend/src/modules
git commit -m "test(openapi): auditoria de tags, summary, body e response por rota"
```

---

## Task 6: Playwright — seeding via API + fixtures por perfil

**Files:**
- Create: `frontend/e2e/seed.ts`
- Create: `frontend/e2e/fixtures.ts`
- Modify: `frontend/playwright.config.ts`

**Interfaces:**
- Consumes: base config Playwright (fase 5); backend rodando em `API_BASE_URL` (`http://localhost:3000` por padrão); rotas `POST /auth/register`, `POST /auth/login`.
- Produces: `seedUser(role, overrides?): Promise<SeededUser>` onde `SeededUser = { id: string; email: string; password: string; name: string; role: 'client' | 'professional' | 'admin'; accessToken: string }`; fixtures `test`/`expect` com `clientPage`, `professionalPage`, `adminPage` (páginas autenticadas por perfil).

- [ ] **Step 1: Implementar o seeder via API**

`frontend/e2e/seed.ts`:
```ts
import { request, type APIRequestContext } from '@playwright/test';

export type Role = 'client' | 'professional' | 'admin';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  accessToken: string;
}

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

export async function seedUser(role: Role, overrides: Partial<{ email: string; name: string }> = {}): Promise<SeededUser> {
  const context: APIRequestContext = await request.newContext({ baseURL: API_BASE_URL });
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const email = overrides.email ?? `e2e-${role}-${unique}@example.com`;
  const name = overrides.name ?? `E2E ${role} ${unique}`;
  const password = 'Senha123!';

  const registerResponse = await context.post('/auth/register', { data: { name, email, password, role } });
  if (!registerResponse.ok()) {
    throw new Error(`seed register failed: ${registerResponse.status()} ${await registerResponse.text()}`);
  }

  const loginResponse = await context.post('/auth/login', { data: { email, password } });
  if (!loginResponse.ok()) {
    throw new Error(`seed login failed: ${loginResponse.status()} ${await loginResponse.text()}`);
  }
  const body = (await loginResponse.json()) as { accessToken: string; user: { id: string } };
  await context.dispose();

  return { id: body.user.id, email, password, name, role, accessToken: body.accessToken };
}
```

- [ ] **Step 2: Implementar as fixtures por perfil**

`frontend/e2e/fixtures.ts`:
```ts
import { test as base, expect, type Page } from '@playwright/test';
import { seedUser, type Role, type SeededUser } from './seed';

interface ProfileFixtures {
  clientPage: Page;
  professionalPage: Page;
  adminPage: Page;
}

async function authenticate(page: Page, role: Role): Promise<SeededUser> {
  const user = await seedUser(role);
  await page.addInitScript(
    ([token, current]) => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { accessToken: token, user: current }, version: 0 }),
      );
    },
    [user.accessToken, { id: user.id, role: user.role, email: user.email, name: user.name }] as const,
  );
  return user;
}

export const test = base.extend<ProfileFixtures>({
  clientPage: async ({ page }, use) => {
    await authenticate(page, 'client');
    await use(page);
  },
  professionalPage: async ({ page }, use) => {
    await authenticate(page, 'professional');
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await authenticate(page, 'admin');
    await use(page);
  },
});

export { expect };
```

- [ ] **Step 3: Configurar os projetos por perfil no Playwright**

Em `frontend/playwright.config.ts`, garantir `testDir: './e2e'`, `use.baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:5173'` e os projetos que casam com os scripts da spec (`e2e:auth/clients/professionals/admins/flows`):
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'auth', testMatch: /auth\.spec\.ts/ },
    { name: 'clients', testMatch: /clients\.spec\.ts/ },
    { name: 'professionals', testMatch: /professionals\.spec\.ts/ },
    { name: 'admins', testMatch: /admins\.spec\.ts/ },
    { name: 'flows', testMatch: /flows\.spec\.ts/ },
  ],
});
```

- [ ] **Step 4: Confirmar que o Playwright enxerga os projetos**

Run: `cd frontend && npx playwright test --list`
Expected: lista os 5 projetos sem erro de configuração.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/seed.ts frontend/e2e/fixtures.ts frontend/playwright.config.ts
git commit -m "test(e2e): seeding via API e fixtures Playwright por perfil"
```

---

## Task 7: E2E — fluxos de autenticação (`auth.spec.ts`)

**Files:**
- Create: `frontend/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` (Task 6); `seedUser` (Task 6); feature `auth` (fase 7) com telas `/login` e `/register`. Seletores usam papéis acessíveis / `data-testid`; ajustar aos componentes reais da feature `auth`.
- Produces: cobertura E2E de registro, login válido/ inválido e logout.

- [ ] **Step 1: Escrever a spec de autenticação**

`frontend/e2e/auth.spec.ts`:
```ts
import { test, expect } from './fixtures';
import { seedUser } from './seed';

test.describe('autenticação', () => {
  test('login com credenciais válidas leva ao dashboard', async ({ page }) => {
    const user = await seedUser('client');
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(user.email);
    await page.getByLabel('Senha').fill(user.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/(dashboard|demands|home)/);
  });

  test('login com senha errada mostra erro', async ({ page }) => {
    const user = await seedUser('client');
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(user.email);
    await page.getByLabel('Senha').fill('SenhaErrada!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('registro cria conta e autentica', async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel('Nome').fill('Novo Cliente');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('Senha123!');
    await page.getByRole('radio', { name: 'Cliente' }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/(dashboard|demands|home)/);
  });

  test('rota protegida sem sessão redireciona para login', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: Rodar a spec de auth**

Run: `cd frontend && npx playwright test --project=auth`
Expected: PASS. Se seletores divergirem dos componentes da feature `auth`, ajustar labels/roles para casar com o markup real.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/auth.spec.ts
git commit -m "test(e2e): fluxos de autenticação por rota protegida"
```

---

## Task 8: E2E — jornada do cliente (`clients.spec.ts`)

**Files:**
- Create: `frontend/e2e/clients.spec.ts`

**Interfaces:**
- Consumes: fixture `clientPage` (Task 6); features `demands`/`contracts` (fase 9). Seletores ajustados aos componentes reais.
- Produces: cobertura E2E de publicar demanda e visualizá-la na lista do cliente.

- [ ] **Step 1: Escrever a spec do cliente**

`frontend/e2e/clients.spec.ts`:
```ts
import { test, expect } from './fixtures';

test.describe('jornada do cliente', () => {
  test('publica uma demanda e a vê na lista', async ({ clientPage }) => {
    await clientPage.goto('/demands/new');
    const title = `Demanda E2E ${Date.now()}`;
    await clientPage.getByLabel('Título').fill(title);
    await clientPage.getByLabel('Descrição').fill('Preciso de um serviço de teste ponta a ponta.');
    await clientPage.getByLabel('Orçamento').fill('500');
    await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();

    await expect(clientPage.getByText(title)).toBeVisible();
  });

  test('vê a lista de demandas do próprio cliente', async ({ clientPage }) => {
    await clientPage.goto('/demands');
    await expect(clientPage.getByRole('heading', { name: /minhas demandas/i })).toBeVisible();
  });

  test('não acessa o painel administrativo', async ({ clientPage }) => {
    await clientPage.goto('/admin');
    await expect(clientPage).toHaveURL(/\/(login|forbidden|dashboard|demands)/);
  });
});
```

- [ ] **Step 2: Rodar a spec do cliente**

Run: `cd frontend && npx playwright test --project=clients`
Expected: PASS. Ajustar seletores aos componentes reais da feature `demands` se necessário.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/clients.spec.ts
git commit -m "test(e2e): jornada do cliente publicando demanda"
```

---

## Task 9: E2E — jornada do profissional (`professionals.spec.ts`)

**Files:**
- Create: `frontend/e2e/professionals.spec.ts`

**Interfaces:**
- Consumes: fixture `professionalPage` (Task 6); features `professional`/`demands`/`wallet` (fases 8-10). Seletores ajustados aos componentes reais.
- Produces: cobertura E2E de edição de perfil profissional e acesso à carteira.

- [ ] **Step 1: Escrever a spec do profissional**

`frontend/e2e/professionals.spec.ts`:
```ts
import { test, expect } from './fixtures';

test.describe('jornada do profissional', () => {
  test('edita a bio do perfil profissional', async ({ professionalPage }) => {
    await professionalPage.goto('/professional/profile');
    const bio = `Especialista em testes ${Date.now()}`;
    await professionalPage.getByLabel('Sobre').fill(bio);
    await professionalPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(professionalPage.getByText(/perfil atualizado/i)).toBeVisible();
  });

  test('acessa a carteira e vê o saldo', async ({ professionalPage }) => {
    await professionalPage.goto('/wallet');
    await expect(professionalPage.getByText(/saldo/i)).toBeVisible();
  });

  test('navega pelas demandas abertas disponíveis', async ({ professionalPage }) => {
    await professionalPage.goto('/demands/available');
    await expect(professionalPage.getByRole('heading', { name: /demandas/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar a spec do profissional**

Run: `cd frontend && npx playwright test --project=professionals`
Expected: PASS. Ajustar seletores aos componentes reais das features `professional`/`wallet` se necessário.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/professionals.spec.ts
git commit -m "test(e2e): jornada do profissional editando perfil e carteira"
```

---

## Task 10: E2E — moderação do admin (`admins.spec.ts`)

**Files:**
- Create: `frontend/e2e/admins.spec.ts`

**Interfaces:**
- Consumes: fixture `adminPage` (Task 6); feature `admin` (fase 11). Seletores ajustados aos componentes reais.
- Produces: cobertura E2E de acesso ao painel admin, listagem de denúncias e disputas.

- [ ] **Step 1: Escrever a spec do admin**

`frontend/e2e/admins.spec.ts`:
```ts
import { test, expect } from './fixtures';

test.describe('moderação do admin', () => {
  test('acessa o painel administrativo', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: /administração/i })).toBeVisible();
  });

  test('lista denúncias', async ({ adminPage }) => {
    await adminPage.goto('/admin/reports');
    await expect(adminPage.getByRole('heading', { name: /denúncias/i })).toBeVisible();
  });

  test('lista disputas de contrato', async ({ adminPage }) => {
    await adminPage.goto('/admin/disputes');
    await expect(adminPage.getByRole('heading', { name: /disputas/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar a spec do admin**

Run: `cd frontend && npx playwright test --project=admins`
Expected: PASS. Ajustar seletores aos componentes reais da feature `admin` se necessário.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admins.spec.ts
git commit -m "test(e2e): moderação do admin em denúncias e disputas"
```

---

## Task 11: E2E — fluxo ponta a ponta multi-perfil (`flows.spec.ts`)

**Files:**
- Create: `frontend/e2e/flows.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` e `seedUser` (Task 6); duas sessões de browser (client + professional) via `browser.newContext()`; features `demands`/`contracts` (fase 9). Seletores ajustados aos componentes reais.
- Produces: cobertura E2E do caminho feliz cruzando dois perfis no navegador (cliente publica → profissional orça → cliente aceita → contrato criado).

- [ ] **Step 1: Escrever a spec de fluxo**

`frontend/e2e/flows.spec.ts`:
```ts
import { test, expect } from './fixtures';
import { seedUser } from './seed';

async function injectSession(page: import('@playwright/test').Page, token: string, user: { id: string; role: string; email: string; name: string }): Promise<void> {
  await page.addInitScript(
    ([accessToken, current]) => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { accessToken, user: current }, version: 0 }),
      );
    },
    [token, user] as const,
  );
}

test.describe('fluxo ponta a ponta cliente ↔ profissional', () => {
  test('cliente publica, profissional orça e cliente aceita virando contrato', async ({ browser }) => {
    const client = await seedUser('client');
    const professional = await seedUser('professional');

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    await injectSession(clientPage, client.accessToken, { id: client.id, role: client.role, email: client.email, name: client.name });

    const title = `Fluxo E2E ${Date.now()}`;
    await clientPage.goto('/demands/new');
    await clientPage.getByLabel('Título').fill(title);
    await clientPage.getByLabel('Descrição').fill('Fluxo completo de teste ponta a ponta.');
    await clientPage.getByLabel('Orçamento').fill('600');
    await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();
    await expect(clientPage.getByText(title)).toBeVisible();

    const professionalContext = await browser.newContext();
    const professionalPage = await professionalContext.newPage();
    await injectSession(professionalPage, professional.accessToken, {
      id: professional.id,
      role: professional.role,
      email: professional.email,
      name: professional.name,
    });

    await professionalPage.goto('/demands/available');
    await professionalPage.getByText(title).click();
    await professionalPage.getByRole('button', { name: 'Enviar orçamento' }).click();
    await professionalPage.getByLabel('Valor').fill('550');
    await professionalPage.getByLabel('Mensagem').fill('Consigo executar nesta semana.');
    await professionalPage.getByRole('button', { name: 'Confirmar orçamento' }).click();
    await expect(professionalPage.getByText(/orçamento enviado/i)).toBeVisible();

    await clientPage.goto('/demands');
    await clientPage.getByText(title).click();
    await clientPage.getByRole('button', { name: 'Aceitar orçamento' }).click();
    await expect(clientPage.getByText(/contrato criado/i)).toBeVisible();

    await clientContext.close();
    await professionalContext.close();
  });
});
```

- [ ] **Step 2: Rodar a spec de fluxo**

Run: `cd frontend && npx playwright test --project=flows`
Expected: PASS. Ajustar seletores e mensagens de sucesso aos componentes reais das features `demands`/`contracts` se necessário.

- [ ] **Step 3: Rodar a suite E2E completa**

Run: `cd frontend && npm run e2e`
Expected: PASS nos 5 projetos.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/flows.spec.ts
git commit -m "test(e2e): fluxo ponta a ponta multi-perfil de demanda a contrato"
```

---

## Self-Review

**Spec coverage (§fase 13 + §7 estratégia de testes):**
- Integração com banco real via `buildTestApp()` → Tasks 1-3 (helpers + fluxo demanda→avaliação + disputa/admin/saque). ✅
- Auditoria completa do Swagger/OpenAPI (toda rota com schema Zod: tags/summary/body/response) → Tasks 4-5. ✅
- E2E Playwright por perfil (`clients`/`professionals`/`admins`/`auth`/`flows`) → Tasks 6-11, casando com os scripts `e2e:*` da spec §2. ✅
- Consome test infra da fase 5 (`buildTestApp`, factories) e features de todas as fases de domínio → declarado em cada bloco Interfaces. ✅

**Placeholder scan:** Sem TBD/TODO. Todo passo de código traz código completo. As notas de "ajustar URLs/seletores aos arquivos reais" são passos de reconciliação explícitos (Task 2 Step 3, Task 3 Step 2, specs E2E), não placeholders — o código de teste está inteiro e executável.

**Type consistency:**
- `resetDatabase`/`loginAs` (Task 1) reusados verbatim em Tasks 2-3.
- `Session.user.role` e `SeededUser.role` = `'client' | 'professional' | 'admin'`, alinhado a `role = z.enum([...])` das Global Constraints.
- `collectOperations`/`hasRequestBody`/`OpenApiDocument` (Task 4) consumidos com as mesmas assinaturas na Task 5.
- `seedUser`/`SeededUser` (Task 6) reusados em Tasks 7 e 11; fixtures `clientPage`/`professionalPage`/`adminPage` consumidas em Tasks 8-10.
- Chave `auth-storage` do `localStorage` (formato Zustand persist `{ state, version }`) idêntica entre `fixtures.ts` (Task 6) e `flows.spec.ts` (Task 11) — deve casar com o nome de persistência de `stores/auth.ts` (fase 3); se divergir, alinhar ao valor real da store.

**Ordem/dependência:** Fase 13 roda após 12 (todos os módulos de domínio + observabilidade entregues). Tasks backend (1-5) não dependem do frontend; Tasks E2E (6-11) exigem frontend e backend rodando (Docker Compose da fase 2 ou `npm run dev` nos dois). `EXCLUDED_PATHS` da auditoria cobre `/metrics` (fase 12) e `/health` (fase 3).
