# Fase 3 — Foundation (Fastify boot + App shell React) Implementation Plan

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Erguer o esqueleto executável do backend (`buildApp()` com plugins de segurança, Swagger via Zod, error handler, autenticação e health) e o app shell do frontend (router, HTTP client, stores, layout), sobre os quais todas as fases de domínio (6+) se apoiam.

**Architecture:** Backend Fastify 5 com `ZodTypeProvider` (fastify-type-provider-zod) como fonte única de validação/OpenAPI; plugins registrados via `fastify-plugin`; `buildApp()` monta plugins + swagger + rotas de módulos. Frontend React 19 + Vite com `createBrowserRouter`, axios central com interceptors de access/refresh, TanStack Query e Zustand.

**Tech Stack:** Fastify 5, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/compress`, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod`, `zod-openapi`, `jsonwebtoken`, `zod` · React 19, react-router-dom 6, `@tanstack/react-query` 5, `zustand` 5, `axios`.

## Global Constraints

Toda task herda estas regras verbatim:

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. (Docs de plano e mensagens de commit em pt-BR.)
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada no plano.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

## Contratos fundacionais definidos nesta fase

Estes são consumidos verbatim pelas fases 6+. **Não redefinir.**

- `src/plugins/auth.ts` exporta:
  - `roleSchema = z.enum(['client','professional','admin'])` — enum de perfil (contrato do plan_index §"App e request").
  - `type Role = z.infer<typeof roleSchema>`.
  - `type AuthUser = { id: string; role: Role }`.
  - `authPlugin` (fastify-plugin) que decora `app.authenticate: preHandlerHookHandler`.
  - `requireRole(...roles: Role[]): preHandlerHookHandler` — factory de guard.
- `src/app.ts` exporta `buildApp(): Promise<FastifyInstance>` — instância pronta (plugins + swagger + error handler + health), **sem** chamar `listen`.
- `src/types/fastify.d.ts` — augmentation: `FastifyRequest.user: AuthUser`, `FastifyInstance.authenticate: preHandlerHookHandler`.
- Error handler global serializa qualquer erro com `statusCode:number` + `code:string` para `{ error: { code, message, details? } }`. A classe `AppError` (fase 4) satisfaz esse shape e é serializada sem mudança no handler.
- Convenção de módulo: cada módulo exporta `async function <name>Routes(app: FastifyInstance): Promise<void>` e é registrado dentro de `buildApp()`.

**Consome da fase 1:** `env` em `src/config/env.ts` com no mínimo `PORT:number`, `HOST:string`, `NODE_ENV:'development'|'test'|'production'`, `CORS_ORIGIN:string`, `JWT_ACCESS_SECRET:string`. Se algum campo faltar, adicione-o ao schema de env da fase 1 antes de prosseguir.

---

## Parte A — Backend

### Task 3.1: Error handler global

**Files:**
- Create: `backend/src/plugins/error-handler.ts`
- Test: `backend/src/plugins/error-handler.test.ts`

**Interfaces:**
- Consumes: nada além de `fastify` e `zod`.
- Produces: `errorHandlerPlugin: FastifyPluginCallback` (via `fastify-plugin`). Instala `app.setErrorHandler`. Serializa: `ZodError` → `400 { error: { code: 'BAD_REQUEST', message, details: issues } }`; qualquer erro com `statusCode:number` + `code:string` → `statusCode { error: { code, message, details? } }`; demais → `500 { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { errorHandlerPlugin } from './error-handler';

async function buildProbe() {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  app.get('/app-error', async () => {
    throw Object.assign(new Error('boom'), {
      statusCode: 409,
      code: 'CONFLICT',
      details: { field: 'email' },
    });
  });
  app.get('/zod-error', async () => {
    z.object({ id: z.string().uuid() }).parse({ id: 'nope' });
    return { ok: true };
  });
  app.get('/unknown', async () => {
    throw new Error('unexpected');
  });
  await app.ready();
  return app;
}

describe('errorHandlerPlugin', () => {
  it('serializes shaped errors to the error envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'boom', details: { field: 'email' } },
    });
  });

  it('maps ZodError to a 400 BAD_REQUEST envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/zod-error' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.json().error.details)).toBe(true);
  });

  it('hides internal errors behind a 500 envelope', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/unknown' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/plugins/error-handler.test.ts`
Expected: FAIL — `Cannot find module './error-handler'`.

- [ ] **Step 3: Implemente o mínimo**

```ts
import type { FastifyPluginCallback, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

interface ShapedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function isShapedError(error: unknown): error is ShapedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Record<string, unknown>).statusCode === 'number' &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

const handler: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Validation failed', details: error.issues },
      });
      return;
    }
    if (isShapedError(error)) {
      reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    app.log.error(error);
    reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
  done();
};

export const errorHandlerPlugin = fp(handler, { name: 'error-handler' });
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/plugins/error-handler.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/plugins/error-handler.ts backend/src/plugins/error-handler.test.ts
git commit -m "feat(core): adiciona error handler global com envelope de erro"
```

---

### Task 3.2: Plugin de autenticação (authenticate + requireRole + roleSchema)

**Files:**
- Create: `backend/src/plugins/auth.ts`
- Create: `backend/src/types/fastify.d.ts`
- Test: `backend/src/plugins/auth.test.ts`

**Interfaces:**
- Consumes: `env.JWT_ACCESS_SECRET` de `src/config/env.ts`; `errorHandlerPlugin` da Task 3.1 (para serializar os 401/403 no teste).
- Produces:
  - `roleSchema = z.enum(['client','professional','admin'])`, `type Role`, `type AuthUser = { id: string; role: Role }`.
  - `authPlugin` (fp) decorando `app.authenticate` — preHandler que lê `Authorization: Bearer <jwt>`, verifica com `JWT_ACCESS_SECRET`, popula `request.user = { id: payload.sub, role: payload.role }`; falha → erro shape `{ statusCode: 401, code: 'UNAUTHORIZED' }`.
  - `requireRole(...roles: Role[]): preHandlerHookHandler` — 401 se sem `request.user`, 403 shape `FORBIDDEN` se role fora do conjunto.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach } from 'vitest';
import { errorHandlerPlugin } from './error-handler';
import { authPlugin, requireRole, roleSchema } from './auth';

const SECRET = 'test-access-secret';

function tokenFor(role: string) {
  return jwt.sign({ sub: 'user-1', role }, SECRET);
}

async function buildProbe(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { accessSecret: SECRET });
  app.get('/me', { preHandler: app.authenticate }, async (request) => request.user);
  app.get(
    '/admin',
    { preHandler: [app.authenticate, requireRole('admin')] },
    async () => ({ ok: true }),
  );
  await app.ready();
  return app;
}

describe('authPlugin', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await buildProbe();
  });

  it('exposes the shared role enum', () => {
    expect(roleSchema.options).toEqual(['client', 'professional', 'admin']);
  });

  it('rejects requests without a bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('populates request.user from a valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${tokenFor('client')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'user-1', role: 'client' });
  });

  it('forbids a role outside the guard set', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${tokenFor('client')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('allows a matching role through the guard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${tokenFor('admin')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/plugins/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 3: Escreva a augmentation de tipos**

`backend/src/types/fastify.d.ts`:

```ts
import 'fastify';
import type { preHandlerHookHandler } from 'fastify';
import type { AuthUser } from '../plugins/auth';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
  }
}
```

- [ ] **Step 4: Implemente o plugin**

`backend/src/plugins/auth.ts`:

```ts
import type { FastifyPluginCallback, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const roleSchema = z.enum(['client', 'professional', 'admin']);

export type Role = z.infer<typeof roleSchema>;

export type AuthUser = { id: string; role: Role };

interface AuthPluginOptions {
  accessSecret: string;
}

function unauthorized(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 401, code: 'UNAUTHORIZED' });
}

function forbidden(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 403, code: 'FORBIDDEN' });
}

const tokenPayloadSchema = z.object({ sub: z.string(), role: roleSchema });

const handler: FastifyPluginCallback<AuthPluginOptions> = (app, opts, done) => {
  const authenticate: preHandlerHookHandler = async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      unauthorized('Missing bearer token');
    }
    const raw = header.slice('Bearer '.length);
    let decoded: unknown;
    try {
      decoded = jwt.verify(raw, opts.accessSecret);
    } catch {
      unauthorized('Invalid access token');
    }
    const parsed = tokenPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      unauthorized('Malformed access token');
    }
    request.user = { id: parsed.data.sub, role: parsed.data.role };
  };

  app.decorate('authenticate', authenticate);
  done();
};

export const authPlugin = fp(handler, { name: 'auth' });

export function requireRole(...roles: Role[]): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      unauthorized('Authentication required');
    }
    if (!roles.includes(request.user.role)) {
      forbidden('Insufficient role');
    }
  };
}
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/plugins/auth.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/plugins/auth.ts backend/src/types/fastify.d.ts backend/src/plugins/auth.test.ts
git commit -m "feat(core): adiciona autenticacao JWT e guard requireRole"
```

---

### Task 3.3: Módulo health

**Files:**
- Create: `backend/src/modules/health/health.schemas.ts`
- Create: `backend/src/modules/health/health.routes.ts`
- Test: `backend/src/modules/health/health.routes.test.ts`

**Interfaces:**
- Consumes: `ZodTypeProvider` de `fastify-type-provider-zod`.
- Produces: `healthRoutes(app: FastifyInstance): Promise<void>` — registra `GET /health` → `{ status: 'ok', uptime: number }` e `GET /health/ready` → `{ status: 'ready' }`. Schemas com `.describe()` + `.openapi({ example })`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { describe, it, expect } from 'vitest';
import 'zod-openapi/extend';
import { healthRoutes } from './health.routes';

async function buildProbe() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(healthRoutes);
  await app.ready();
  return app;
}

describe('healthRoutes', () => {
  it('reports liveness on GET /health', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    expect(typeof res.json().uptime).toBe('number');
  });

  it('reports readiness on GET /health/ready', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/modules/health/health.routes.test.ts`
Expected: FAIL — `Cannot find module './health.routes'`.

- [ ] **Step 3: Escreva os schemas**

`backend/src/modules/health/health.schemas.ts`:

```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const healthResponseSchema = z.object({
  status: z.literal('ok').describe('Liveness marker').openapi({ example: 'ok' }),
  uptime: z.number().describe('Process uptime in seconds').openapi({ example: 12.34 }),
});

export const readyResponseSchema = z.object({
  status: z.literal('ready').describe('Readiness marker').openapi({ example: 'ready' }),
});
```

- [ ] **Step 4: Escreva as rotas**

`backend/src/modules/health/health.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { healthResponseSchema, readyResponseSchema } from './health.schemas';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: 'ok' as const, uptime: process.uptime() }),
  );

  typed.get(
    '/health/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness probe',
        response: { 200: readyResponseSchema },
      },
    },
    async () => ({ status: 'ready' as const }),
  );
}
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/modules/health/health.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/health/
git commit -m "feat(health): adiciona rotas de liveness e readiness"
```

---

### Task 3.4: `buildApp()` — montagem completa

**Files:**
- Create: `backend/src/app.ts`
- Test: `backend/src/app.test.ts`

**Interfaces:**
- Consumes: `env` (fase 1); `errorHandlerPlugin` (3.1); `authPlugin` (3.2); `healthRoutes` (3.3); plugins `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/compress`, `@fastify/swagger`, `@fastify/swagger-ui`; `serializerCompiler`, `validatorCompiler`, `jsonSchemaTransform` de `fastify-type-provider-zod`.
- Produces: `buildApp(): Promise<FastifyInstance>` com `ZodTypeProvider`, swagger em `/docs`, JSON OpenAPI em `/docs/json`. Ponto de extensão: fases de domínio registram seus `xRoutes` no bloco marcado `MODULE ROUTES`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from './app';

describe('buildApp', () => {
  it('boots and serves the health route', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });

  it('exposes the OpenAPI document with the health path', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    expect(res.json().paths['/health']).toBeDefined();
    await app.close();
  });

  it('serializes the auth guard failure through the global error handler', async () => {
    const app = await buildApp();
    app.get('/guarded', { preHandler: app.authenticate }, async () => ({ ok: true }));
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/guarded' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
    await app.close();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/app.test.ts`
Expected: FAIL — `Cannot find module './app'`.

- [ ] **Step 3: Implemente `buildApp`**

`backend/src/app.ts`:

```ts
import 'zod-openapi/extend';
import Fastify, { type FastifyInstance } from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './config/env';
import { errorHandlerPlugin } from './plugins/error-handler';
import { authPlugin } from './plugins/auth';
import { healthRoutes } from './modules/health/health.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(compress, { global: true });

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { accessSecret: env.JWT_ACCESS_SECRET });

  await app.register(swagger, {
    openapi: {
      info: { title: 'Services Marketplace API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(healthRoutes);

  return app;
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/app.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Rode typecheck e lint**

Run: `cd backend && npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/app.ts backend/src/app.test.ts
git commit -m "feat(core): adiciona buildApp com plugins de seguranca e swagger"
```

---

### Task 3.5: Bootstrap do servidor

**Files:**
- Create: `backend/src/server.ts`
- Test: `backend/src/server.test.ts`

**Interfaces:**
- Consumes: `buildApp` (3.4); `env`.
- Produces: `start(): Promise<FastifyInstance>` — chama `buildApp()`, `listen({ port, host })`, retorna a instância. `src/server.ts` executa `start()` quando rodado direto (`import.meta.url` entrypoint check).

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { start } from './server';

describe('start', () => {
  it('listens on the configured host/port and closes cleanly', async () => {
    const app = await start();
    const address = app.server.address();
    expect(address).not.toBeNull();
    await app.close();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: FAIL — `Cannot find module './server'`.

- [ ] **Step 3: Implemente o bootstrap**

`backend/src/server.ts`:

```ts
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { env } from './config/env';

export async function start(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  return app;
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/server.ts backend/src/server.test.ts
git commit -m "feat(core): adiciona bootstrap do servidor http"
```

---

## Parte B — Frontend

### Task 3.6: Store de autenticação (Zustand)

**Files:**
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/stores/auth.test.ts`

**Interfaces:**
- Consumes: `zustand`.
- Produces: `useAuthStore` — estado `{ user: AuthUser | null; accessToken: string | null }` + ações `setAuth(user: AuthUser, accessToken: string): void` e `clear(): void`. `type AuthUser = { id: string; role: Role }`, `type Role = 'client' | 'professional' | 'admin'` (fonte de tipo do frontend; a fase 4 re-exporta destes tipos).

*(Esta task também bootstrapa a config mínima de Vitest+jsdom que a fase 5 expande com coverage/Testing Library/Playwright.)*

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('starts logged out', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('stores the user and token on setAuth', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token-abc');
    const state = useAuthStore.getState();
    expect(state.user).toEqual({ id: 'u1', role: 'client' });
    expect(state.accessToken).toBe('token-abc');
  });

  it('resets state on clear', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token-abc');
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
```

- [ ] **Step 2: Escreva a config de teste + setup**

`frontend/vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/stores/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 4: Implemente o store**

`frontend/src/stores/auth.ts`:

```ts
import { create } from 'zustand';

export type Role = 'client' | 'professional' | 'admin';

export type AuthUser = { id: string; role: Role };

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}));
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/stores/auth.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/stores/auth.ts frontend/src/stores/auth.test.ts
git commit -m "feat(auth): adiciona store de autenticacao zustand"
```

---

### Task 3.7: HTTP client (axios) + Query client

**Files:**
- Create: `frontend/src/lib/http.ts`
- Create: `frontend/src/lib/queryClient.ts`
- Test: `frontend/src/lib/http.test.ts`

**Interfaces:**
- Consumes: `axios`; `useAuthStore` (3.6); `@tanstack/react-query`.
- Produces:
  - `http: AxiosInstance` — `baseURL: '/api'`. Request interceptor injeta `Authorization: Bearer <accessToken>` do store. Response interceptor: em 401 chama `refreshAccessToken()` (POST `/api/auth/refresh` com `withCredentials`), atualiza o store e reexecuta a request uma vez; se o refresh falhar, `clear()` e propaga o erro.
  - `refreshAccessToken(): Promise<string>` — resolve com novo access token.
  - `queryClient: QueryClient` — defaults `{ queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } }`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http } from './http';
import { useAuthStore } from '../stores/auth';

describe('http client', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('uses the /api baseURL', () => {
    expect(http.defaults.baseURL).toBe('/api');
  });

  it('attaches the bearer token from the auth store', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token-xyz');
    const requestInterceptor = (http.interceptors.request as unknown as {
      handlers: { fulfilled: (c: { headers: Record<string, string> }) => { headers: Record<string, string> } }[];
    }).handlers[0].fulfilled;
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer token-xyz');
  });

  it('omits the header when logged out', () => {
    const requestInterceptor = (http.interceptors.request as unknown as {
      handlers: { fulfilled: (c: { headers: Record<string, string> }) => { headers: Record<string, string> } }[];
    }).handlers[0].fulfilled;
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/lib/http.test.ts`
Expected: FAIL — `Cannot find module './http'`.

- [ ] **Step 3: Implemente o query client**

`frontend/src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
```

- [ ] **Step 4: Implemente o http client**

`frontend/src/lib/http.ts`:

```ts
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/auth';

export const http: AxiosInstance = axios.create({ baseURL: '/api' });

const refreshClient: AxiosInstance = axios.create({ baseURL: '/api', withCredentials: true });

export async function refreshAccessToken(): Promise<string> {
  const response = await refreshClient.post<{ accessToken: string; user: { id: string; role: 'client' | 'professional' | 'admin' } }>(
    '/auth/refresh',
  );
  const { accessToken, user } = response.data;
  useAuthStore.getState().setAuth(user, accessToken);
  return accessToken;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch (refreshError) {
        useAuthStore.getState().clear();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/lib/http.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/http.ts frontend/src/lib/queryClient.ts frontend/src/lib/http.test.ts
git commit -m "feat(core): adiciona http client axios com refresh e query client"
```

---

### Task 3.8: ProtectedRoute + router

**Files:**
- Create: `frontend/src/router/ProtectedRoute.tsx`
- Create: `frontend/src/router/index.tsx`
- Create: `frontend/src/pages/NotFound.tsx`
- Test: `frontend/src/router/ProtectedRoute.test.tsx`

**Interfaces:**
- Consumes: `react-router-dom`; `useAuthStore` (3.6).
- Produces:
  - `ProtectedRoute({ roles?: Role[] }): JSX.Element` — sem `user` → `<Navigate to="/login" replace>`; com `user` mas role fora de `roles` → `<Navigate to="/forbidden" replace>`; senão `<Outlet />`.
  - `router` (`createBrowserRouter`) com rotas públicas `/login`, `/forbidden`, `*` (NotFound) e um grupo protegido placeholder que as features preenchem.

- [ ] **Step 1: Escreva o teste que falha**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../stores/auth';

function renderAt(initial: string, roles?: ('client' | 'professional' | 'admin')[]) {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute roles={roles} />,
        children: [{ path: '/dashboard', element: <div>dashboard</div> }],
      },
      { path: '/login', element: <div>login page</div> },
      { path: '/forbidden', element: <div>forbidden page</div> },
    ],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('redirects anonymous users to login', () => {
    renderAt('/dashboard');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects wrong-role users to forbidden', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderAt('/dashboard', ['admin']);
    expect(screen.getByText('forbidden page')).toBeInTheDocument();
  });

  it('renders the child route for an allowed user', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 't');
    renderAt('/dashboard', ['admin']);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/router/ProtectedRoute.test.tsx`
Expected: FAIL — `Cannot find module './ProtectedRoute'`.

- [ ] **Step 3: Implemente o ProtectedRoute**

`frontend/src/router/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type Role } from '../stores/auth';

interface ProtectedRouteProps {
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 4: Implemente o NotFound e o router**

`frontend/src/pages/NotFound.tsx`:

```tsx
export function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-slate-600">Página não encontrada</p>
    </div>
  );
}
```

`frontend/src/router/index.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { App } from '../App';
import { NotFound } from '../pages/NotFound';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <div /> },
      { path: '/forbidden', element: <div /> },
      {
        element: <ProtectedRoute />,
        children: [],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/router/ProtectedRoute.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router/ frontend/src/pages/NotFound.tsx frontend/src/router/ProtectedRoute.test.tsx
git commit -m "feat(core): adiciona protected route e router base"
```

---

### Task 3.9: App shell + layout + entrypoint

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `queryClient` (3.7); `router` (3.8); `Outlet` de react-router-dom; Tailwind.
- Produces:
  - `App(): JSX.Element` — envolve `<Layout>` com `<Outlet />`.
  - `Layout({ children })` — header + `<main>` com container Tailwind.
  - `main.tsx` — monta `<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>`.

- [ ] **Step 1: Escreva o teste que falha**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';

describe('App shell', () => {
  it('renders the layout header around routed content', () => {
    const router = createMemoryRouter(
      [{ element: <App />, children: [{ path: '/', element: <div>home content</div> }] }],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: FAIL — `Cannot find module './App'`.

- [ ] **Step 3: Implemente Layout e App**

`frontend/src/components/Layout.tsx`:

```tsx
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold">Services Marketplace</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
```

`frontend/src/App.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';

export function App(): JSX.Element {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
```

- [ ] **Step 4: Implemente entrypoint e estilos**

`frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Rode typecheck e lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/main.tsx frontend/src/index.css frontend/src/App.test.tsx
git commit -m "feat(core): adiciona app shell, layout e entrypoint do frontend"
```

---

## Fechamento da fase

- [ ] Backend verde: `cd backend && npm run typecheck && npm run lint && npx vitest run`.
- [ ] Frontend verde: `cd frontend && npm run typecheck && npm run lint && npx vitest run`.
- [ ] Marque `Fase 3 — foundation` como concluída em `plan_index.md`.
