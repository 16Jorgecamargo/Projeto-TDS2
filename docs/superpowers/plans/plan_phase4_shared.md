# Fase 4 — Shared (erros, schemas base, middlewares, tipos) Implementation Plan

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar os blocos compartilhados que todos os módulos de domínio (fases 6+) importam sem redefinir: a hierarquia `AppError`, os schemas Zod base (id/paginação/resposta paginada), middlewares comuns e os tipos/utilitários compartilhados do frontend.

**Architecture:** Backend `shared/` concentra erros, schemas e middlewares reutilizáveis; `AppError` é a base de exceções serializadas pelo error handler da fase 3 (por shape `statusCode`+`code`). Frontend `types/` e `lib/utils` centralizam o envelope de erro, o tipo `Paginated<T>` e helpers de formatação que respeitam DECIMAL-como-string.

**Tech Stack:** `zod`, `zod-openapi`, Fastify 5 (hooks) · React 19, `axios` (tipos de erro), `clsx`-free `cn` manual (sem novas deps).

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

Consumidos verbatim pelas fases 6+. **Não redefinir.**

- `src/shared/errors.ts`:
  - `class AppError extends Error { constructor(statusCode: number, code: string, message: string, details?: unknown) }` com campos públicos `statusCode`, `code`, `details`.
  - Subclasses: `BadRequestError(message?, details?)` → `(400,'BAD_REQUEST')`; `UnauthorizedError` → `(401,'UNAUTHORIZED')`; `ForbiddenError` → `(403,'FORBIDDEN')`; `NotFoundError` → `(404,'NOT_FOUND')`; `ConflictError` → `(409,'CONFLICT')`; `UnprocessableError` → `(422,'UNPROCESSABLE')`.
- `src/shared/schemas.ts`:
  - `idParamSchema = z.object({ id: z.string().uuid()... })`.
  - `paginationQuerySchema = z.object({ page, limit })` com `z.coerce.number().int()`, defaults `page=1`, `limit=20`, `limit.max=100`.
  - `paginatedResponse(itemSchema)` → `z.object({ items, page, limit, total })`.
  - `errorResponseSchema` (documenta o envelope de erro no OpenAPI).
- `src/shared/types.ts`: `type Paginated<T> = { items: T[]; page: number; limit: number; total: number }`; re-export de `Role`/`AuthUser` da fase 3.
- `src/shared/middlewares/request-id.ts`: `requestIdPlugin` (fp) — garante `x-request-id` em request/response.
- Frontend `src/types/index.ts`: `type ApiError = { error: { code: string; message: string; details?: unknown } }`; `type Paginated<T>`; `type Role`.
- Frontend `src/lib/utils.ts`: `cn(...)`, `toNumber(value: string | number): number`, `formatCurrency(value: string | number): string`, `formatDate(value: string | Date): string`.

**Consome da fase 3:** `roleSchema`, `Role`, `AuthUser` (`backend/src/plugins/auth.ts`); error handler já serializa `AppError` por shape.

---

## Parte A — Backend

### Task 4.1: Hierarquia de erros `AppError`

**Files:**
- Create: `backend/src/shared/errors.ts`
- Test: `backend/src/shared/errors.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppError` + 6 subclasses. Cada instância carrega `statusCode:number`, `code:string`, `message:string`, `details?:unknown` — shape reconhecido pelo `errorHandlerPlugin` (fase 3).

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from './errors';

describe('AppError hierarchy', () => {
  it('carries status, code, message and details', () => {
    const error = new AppError(418, 'TEAPOT', 'no coffee', { hint: 'tea' });
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.message).toBe('no coffee');
    expect(error.details).toEqual({ hint: 'tea' });
  });

  it('maps each subclass to its status and code', () => {
    expect([new BadRequestError().statusCode, new BadRequestError().code]).toEqual([400, 'BAD_REQUEST']);
    expect([new UnauthorizedError().statusCode, new UnauthorizedError().code]).toEqual([401, 'UNAUTHORIZED']);
    expect([new ForbiddenError().statusCode, new ForbiddenError().code]).toEqual([403, 'FORBIDDEN']);
    expect([new NotFoundError().statusCode, new NotFoundError().code]).toEqual([404, 'NOT_FOUND']);
    expect([new ConflictError().statusCode, new ConflictError().code]).toEqual([409, 'CONFLICT']);
    expect([new UnprocessableError().statusCode, new UnprocessableError().code]).toEqual([422, 'UNPROCESSABLE']);
  });

  it('accepts a custom message and details on subclasses', () => {
    const error = new NotFoundError('user not found', { id: 'u1' });
    expect(error.message).toBe('user not found');
    expect(error.details).toEqual({ id: 'u1' });
    expect(error).toBeInstanceOf(AppError);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/shared/errors.test.ts`
Expected: FAIL — `Cannot find module './errors'`.

- [ ] **Step 3: Implemente a hierarquia**

`backend/src/shared/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', details?: unknown) {
    super(422, 'UNPROCESSABLE', message, details);
  }
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/shared/errors.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Verifique a integração com o error handler**

Adicione ao final de `backend/src/shared/errors.test.ts`:

```ts
import Fastify from 'fastify';
import { errorHandlerPlugin } from '../plugins/error-handler';

describe('AppError through the global handler', () => {
  it('serializes a thrown ConflictError to the envelope', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    app.get('/x', async () => {
      throw new ConflictError('email taken', { field: 'email' });
    });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/x' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'email taken', details: { field: 'email' } },
    });
    await app.close();
  });
});
```

Run: `cd backend && npx vitest run src/shared/errors.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/shared/errors.ts backend/src/shared/errors.test.ts
git commit -m "feat(shared): adiciona hierarquia AppError serializavel"
```

---

### Task 4.2: Schemas Zod base

**Files:**
- Create: `backend/src/shared/schemas.ts`
- Test: `backend/src/shared/schemas.test.ts`

**Interfaces:**
- Consumes: `zod`, `zod-openapi`.
- Produces:
  - `idParamSchema: ZodObject<{ id }>`.
  - `paginationQuerySchema: ZodObject<{ page, limit }>` (coerce + defaults).
  - `paginatedResponse<T extends ZodTypeAny>(itemSchema: T)` → `ZodObject<{ items: ZodArray<T>, page, limit, total }>`.
  - `errorResponseSchema` (envelope de erro para `response` do OpenAPI).

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  idParamSchema,
  paginationQuerySchema,
  paginatedResponse,
  errorResponseSchema,
} from './schemas';

describe('shared schemas', () => {
  it('validates a uuid id param', () => {
    expect(idParamSchema.safeParse({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }).success).toBe(true);
    expect(idParamSchema.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('applies pagination defaults and coercion', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('rejects out-of-range pagination', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('wraps an item schema into a paginated envelope', () => {
    const schema = paginatedResponse(z.object({ id: z.string() }));
    const value = { items: [{ id: 'a' }], page: 1, limit: 20, total: 1 };
    expect(schema.parse(value)).toEqual(value);
    expect(schema.safeParse({ ...value, items: [{ id: 1 }] }).success).toBe(false);
  });

  it('describes the error envelope', () => {
    const parsed = errorResponseSchema.parse({ error: { code: 'NOT_FOUND', message: 'x' } });
    expect(parsed.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/shared/schemas.test.ts`
Expected: FAIL — `Cannot find module './schemas'`.

- [ ] **Step 3: Implemente os schemas**

`backend/src/shared/schemas.ts`:

```ts
import { z, type ZodTypeAny } from 'zod';
import 'zod-openapi/extend';

export const idParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('Resource identifier')
    .openapi({ example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number, 1-based')
    .openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Items per page, max 100')
    .openapi({ example: 20 }),
});

export function paginatedResponse<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema).describe('Page items'),
    page: z.number().int().describe('Current page').openapi({ example: 1 }),
    limit: z.number().int().describe('Items per page').openapi({ example: 20 }),
    total: z.number().int().describe('Total items available').openapi({ example: 137 }),
  });
}

export const errorResponseSchema = z.object({
  error: z
    .object({
      code: z.string().describe('Machine-readable error code').openapi({ example: 'NOT_FOUND' }),
      message: z.string().describe('Human-readable message').openapi({ example: 'Not found' }),
      details: z.unknown().optional().describe('Optional structured error context'),
    })
    .describe('Error envelope'),
});
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/shared/schemas.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/schemas.ts backend/src/shared/schemas.test.ts
git commit -m "feat(shared): adiciona schemas base de id, paginacao e erro"
```

---

### Task 4.3: Tipos compartilhados do backend

**Files:**
- Create: `backend/src/shared/types.ts`
- Test: `backend/src/shared/types.test.ts`

**Interfaces:**
- Consumes: `Role`, `AuthUser` de `src/plugins/auth.ts`; `paginatedResponse` (4.2).
- Produces: `type Paginated<T> = { items: T[]; page: number; limit: number; total: number }`; re-export de `Role` e `AuthUser`; helper `toPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T>`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { toPaginated } from './types';

describe('shared types', () => {
  it('builds a paginated envelope', () => {
    const result = toPaginated([{ id: 'a' }], 42, 2, 10);
    expect(result).toEqual({ items: [{ id: 'a' }], total: 42, page: 2, limit: 10 });
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/shared/types.test.ts`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Implemente os tipos**

`backend/src/shared/types.ts`:

```ts
export type { Role, AuthUser } from '../plugins/auth';

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export function toPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit };
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/shared/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/types.ts backend/src/shared/types.test.ts
git commit -m "feat(shared): adiciona tipos compartilhados e helper de paginacao"
```

---

### Task 4.4: Middleware de request-id

**Files:**
- Create: `backend/src/shared/middlewares/request-id.ts`
- Test: `backend/src/shared/middlewares/request-id.test.ts`

**Interfaces:**
- Consumes: `fastify`, `fastify-plugin`, `node:crypto`.
- Produces: `requestIdPlugin` (fp) — `onRequest` gera `request.id` de `x-request-id` recebido ou `randomUUID()`; `onSend` ecoa `x-request-id` no header de resposta.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { requestIdPlugin } from './request-id';

async function buildProbe() {
  const app = Fastify({ genReqId: () => 'ignored' });
  await app.register(requestIdPlugin);
  app.get('/x', async (request) => ({ id: request.id }));
  await app.ready();
  return app;
}

describe('requestIdPlugin', () => {
  it('reuses an incoming x-request-id', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/x', headers: { 'x-request-id': 'abc-123' } });
    expect(res.json().id).toBe('abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
    await app.close();
  });

  it('generates an id when none is provided', async () => {
    const app = await buildProbe();
    const res = await app.inject({ method: 'GET', url: '/x' });
    expect(typeof res.headers['x-request-id']).toBe('string');
    expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
    await app.close();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/shared/middlewares/request-id.test.ts`
Expected: FAIL — `Cannot find module './request-id'`.

- [ ] **Step 3: Implemente o middleware**

`backend/src/shared/middlewares/request-id.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const handler: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook('onRequest', async (request) => {
    const incoming = request.headers['x-request-id'];
    request.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  });
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  done();
};

export const requestIdPlugin = fp(handler, { name: 'request-id' });
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/shared/middlewares/request-id.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Registre no `buildApp`**

Em `backend/src/app.ts`, importe e registre após `errorHandlerPlugin`:

```ts
import { requestIdPlugin } from './shared/middlewares/request-id';
```

```ts
  await app.register(errorHandlerPlugin);
  await app.register(requestIdPlugin);
```

- [ ] **Step 6: Rode a suíte do app e confirme verde**

Run: `cd backend && npx vitest run src/app.test.ts src/shared/middlewares/request-id.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/shared/middlewares/request-id.ts backend/src/shared/middlewares/request-id.test.ts backend/src/app.ts
git commit -m "feat(shared): adiciona middleware de request-id"
```

---

## Parte B — Frontend

### Task 4.5: Tipos compartilhados do frontend

**Files:**
- Create: `frontend/src/types/index.ts`
- Test: `frontend/src/types/index.test.ts`

**Interfaces:**
- Consumes: `Role` de `src/stores/auth.ts`.
- Produces:
  - `type ApiError = { error: { code: string; message: string; details?: unknown } }`.
  - `type Paginated<T> = { items: T[]; page: number; limit: number; total: number }`.
  - `type Role` (re-export).
  - `isApiError(value: unknown): value is ApiError` — type guard sobre respostas de erro do axios.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { isApiError } from './index';

describe('frontend shared types', () => {
  it('recognizes the API error envelope', () => {
    expect(isApiError({ error: { code: 'NOT_FOUND', message: 'x' } })).toBe(true);
  });

  it('rejects non-envelope values', () => {
    expect(isApiError({ message: 'oops' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError('error')).toBe(false);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/types/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implemente os tipos**

`frontend/src/types/index.ts`:

```ts
export type { Role } from '../stores/auth';

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = (value as { error?: unknown }).error;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { code?: unknown }).code === 'string' &&
    typeof (candidate as { message?: unknown }).message === 'string'
  );
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/types/index.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/types/index.test.ts
git commit -m "feat(shared): adiciona tipos e guard de erro no frontend"
```

---

### Task 4.6: Utilitários compartilhados do frontend

**Files:**
- Create: `frontend/src/lib/utils.ts`
- Test: `frontend/src/lib/utils.test.ts`

**Interfaces:**
- Consumes: nada (sem novas deps).
- Produces:
  - `cn(...classes: Array<string | false | null | undefined>): string` — junta classes truthy.
  - `toNumber(value: string | number): number` — normaliza DECIMAL-como-string.
  - `formatCurrency(value: string | number): string` — BRL via `Intl.NumberFormat('pt-BR')`.
  - `formatDate(value: string | Date): string` — `dd/mm/aaaa` via `Intl.DateTimeFormat('pt-BR')`.

- [ ] **Step 1: Escreva o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { cn, toNumber, formatCurrency, formatDate } from './utils';

describe('frontend utils', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });

  it('coerces decimal strings to numbers', () => {
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber(10)).toBe(10);
  });

  it('formats currency in BRL from a decimal string', () => {
    expect(formatCurrency('1234.5').replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('formats an ISO date to pt-BR', () => {
    expect(formatDate('2026-07-01T00:00:00.000Z')).toBe('01/07/2026');
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/lib/utils.test.ts`
Expected: FAIL — `Cannot find module './utils'`.

- [ ] **Step 3: Implemente os utilitários**

`frontend/src/lib/utils.ts`:

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter((entry): entry is string => Boolean(entry)).join(' ');
}

export function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(toNumber(value));
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/lib/utils.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Rode typecheck e lint nos dois projetos**

Run: `cd backend && npm run typecheck && npm run lint`
Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/utils.ts frontend/src/lib/utils.test.ts
git commit -m "feat(shared): adiciona utilitarios de formatacao no frontend"
```

---

## Fechamento da fase

- [ ] Backend verde: `cd backend && npm run typecheck && npm run lint && npx vitest run`.
- [ ] Frontend verde: `cd frontend && npm run typecheck && npm run lint && npx vitest run`.
- [ ] Confirme que nenhum módulo redefine `AppError`, os schemas base, `Paginated<T>` ou `ApiError` — todos importam desta fase.
- [ ] Marque `Fase 4 — shared` como concluída em `plan_index.md`.
