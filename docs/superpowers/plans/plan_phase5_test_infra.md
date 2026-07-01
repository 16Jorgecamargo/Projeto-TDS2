# Fase 5 — Test Infra (Vitest, buildTestApp, factories, mocks, RTL, Playwright) Implementation Plan

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar a infraestrutura de testes que todas as fases de negócio (6+) consomem: Vitest configurado (unit + integração) com `buildTestApp()`, mocks de repositório/Redis/BullMQ e o builder de factories no backend; Vitest + Testing Library com `renderWithProviders` e a base do Playwright por perfil no frontend.

**Architecture:** Backend `src/test/` concentra o harness: `mocks/` (fakes de `Repository`, Redis e Queue para unit sem infra), `database.ts` (um `TestDataSource` glob-based que descobre as entidades/migrations da fase 6 automaticamente), `buildTestApp.ts` (reusa `buildApp()` da fase 3 + garante banco de teste) e `factories/` (builder genérico `createFactory`). Frontend `src/test/` traz o setup jsdom + RTL e `renderWithProviders`; `e2e/` traz a base do Playwright fatiada por perfil.

**Tech Stack:** `vitest`, `unplugin-swc` + `@swc/core` (decorators TypeORM em teste), `typeorm` + `mysql2`, `ioredis`/`bullmq` (tipos para os fakes) · `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`, `@vitejs/plugin-react`, `@tanstack/react-query`, `react-router-dom`, `@playwright/test`.

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

- `backend/src/test/mocks/repo.ts`: `mockRepo<T extends ObjectLiteral>(): MockRepository<T>` — `Repository<T>` com todos os métodos usados pelos services como `vi.fn()` (find/findOne/findOneBy/findBy/save/create/insert/update/delete/remove/count/existsBy + `createQueryBuilder` encadeável).
- `backend/src/test/mocks/redis.ts`: `mockRedis(): MockRedis` — fake em memória de `ioredis` (get/set/del/exists/incr/decr/expire/ttl/flushall/quit) com store `Map` inspecionável.
- `backend/src/test/mocks/queue.ts`: `mockQueue<T = unknown>(name?: string): MockQueue<T>` — fake de `bullmq` `Queue` (add/addBulk/getJob/remove/close) que registra os jobs adicionados em `jobs`.
- `backend/src/test/database.ts`: `TestDataSource: DataSource`; `setupTestDatabase(): Promise<DataSource>`; `teardownTestDatabase(): Promise<void>`; `truncateAll(): Promise<void>`.
- `backend/src/test/buildTestApp.ts`: `buildTestApp(): Promise<FastifyInstance>` — app real (`buildApp()`) com banco de teste inicializado e migrations aplicadas.
- `backend/src/test/factories/create-factory.ts`: `createFactory<T extends ObjectLiteral>(target: EntityTarget<T>, defaults: () => DeepPartial<T>)` → `(dataSource: DataSource, overrides?: DeepPartial<T>) => Promise<T>`. As factories concretas (`createUser`, `createProfessional`, `createDemand`, …) são **autoradas nas fases de domínio** usando este builder — ver "Nota de ordenação".
- `frontend/src/test/renderWithProviders.tsx`: `renderWithProviders(ui: ReactElement, options?: RenderWithProvidersOptions): RenderResult & { queryClient: QueryClient }`.
- `frontend/e2e/`: `playwright.config.ts` com projetos por perfil (`auth`, `clients`, `professionals`, `admins`, `flows`) + fixtures base.

**Consome da fase 3:** `buildApp()` (`backend/src/app.ts`), `queryClient`/stores do frontend. **Consome da fase 4:** nada obrigatório. **Consome da fase 2:** serviços MySQL/Redis do Docker Compose para a suíte de integração.

## Nota de ordenação (fase 5 antes da fase 6)

As entidades TypeORM, as migrations e o `data-source` de produção só existem na fase 6. Para a fase 5 fechar verde de forma independente:

- O `TestDataSource` (Task 5.5) usa **globs** (`src/infra/database/entities/**` e `.../migrations/**`). Com as pastas ainda vazias, ele conecta num schema vazio (válido) e passa a descobrir entidades/migrations automaticamente quando a fase 6 as adicionar — sem edição posterior.
- O builder `createFactory` (Task 5.7) é testado contra um `DataSource` **mockado**, sem depender de entidade real.
- As factories concretas (`createUser`, `createProfessional`, `createDemand`, …) **não são commitadas nesta fase**. A Task 5.7 fixa o builder, a convenção de arquivo (`backend/src/test/factories/<entity>.factory.ts`) e o template de referência. Cada fase de domínio adiciona sua factory usando o builder.
- A suíte de integração (`buildTestApp`) exige MySQL de teste no ar (Docker da fase 2). O self-test da fase 5 só bate no módulo `health` (fase 3), sem tabelas de domínio.

---

## Parte A — Backend

### Task 5.1: Configuração do Vitest (unit + integração) e setup global

**Files:**
- Create: `backend/vitest.config.ts`
- Create: `backend/src/test/setup.ts`
- Create: `backend/src/test/env.ts`
- Create: `backend/src/test/setup.test.ts`

**Interfaces:**
- Consumes: `unplugin-swc`, `vitest`.
- Produces: config Vitest com plugin SWC (decorators TypeORM), `setupFiles` carregando `reflect-metadata` + env de teste; `src/test/env.ts` exporta `loadTestEnv(): void` idempotente.

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('backend test setup', () => {
  it('runs under NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('has reflect-metadata available', () => {
    expect(typeof Reflect.getMetadata).toBe('function');
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/setup.test.ts`
Expected: FAIL — `NODE_ENV` não é `test` e/ou `Reflect.getMetadata` indefinido (setup ainda não existe).

- [ ] **Step 3: Implemente env de teste**

`backend/src/test/env.ts`:

```ts
export function loadTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST ?? '127.0.0.1';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT ?? '3306';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER ?? 'root';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'root';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'marketplace_test';
  process.env.TEST_REDIS_HOST = process.env.TEST_REDIS_HOST ?? '127.0.0.1';
  process.env.TEST_REDIS_PORT = process.env.TEST_REDIS_PORT ?? '6379';
}
```

- [ ] **Step 4: Implemente o setup global**

`backend/src/test/setup.ts`:

```ts
import 'reflect-metadata';
import { loadTestEnv } from './env';

loadTestEnv();
```

- [ ] **Step 5: Implemente a config do Vitest**

`backend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/**/*.test.ts', 'src/infra/database/migrations/**'],
    },
  },
});
```

- [ ] **Step 6: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/setup.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/vitest.config.ts backend/src/test/setup.ts backend/src/test/env.ts backend/src/test/setup.test.ts
git commit -m "test(infra): configura vitest com swc e setup global do backend"
```

---

### Task 5.2: Mock de repositório TypeORM (`mockRepo<T>()`)

**Files:**
- Create: `backend/src/test/mocks/repo.ts`
- Test: `backend/src/test/mocks/repo.test.ts`

**Interfaces:**
- Consumes: `typeorm` (`ObjectLiteral`, `Repository`), `vitest` (`vi`, `Mock`).
- Produces:
  - `type MockRepository<T extends ObjectLiteral>` — `Repository<T>` com métodos mockados + `createQueryBuilder` encadeável.
  - `mockRepo<T extends ObjectLiteral>(): MockRepository<T>`.
  - `mockQueryBuilder()` — query builder encadeável (where/andWhere/leftJoinAndSelect/orderBy/skip/take/getMany/getManyAndCount/getOne).

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/mocks/repo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mockRepo } from './repo';

type User = { id: string; email: string };

describe('mockRepo', () => {
  it('exposes repository methods as spies', () => {
    const repo = mockRepo<User>();
    expect(repo.find).toBeTypeOf('function');
    expect(repo.findOne).toBeTypeOf('function');
    expect(repo.save).toBeTypeOf('function');
    expect(repo.create).toBeTypeOf('function');
    expect(repo.delete).toBeTypeOf('function');
  });

  it('records calls and honors mocked return values', async () => {
    const repo = mockRepo<User>();
    repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c' });
    const result = await repo.findOne({ where: { id: 'u1' } });
    expect(result).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('returns a chainable query builder', async () => {
    const repo = mockRepo<User>();
    const qb = repo.createQueryBuilder();
    qb.getMany.mockResolvedValue([{ id: 'u1', email: 'a@b.c' }]);
    const rows = await qb.where('x = :x', { x: 1 }).orderBy('id').take(10).getMany();
    expect(rows).toHaveLength(1);
    expect(qb.where).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/mocks/repo.test.ts`
Expected: FAIL — `Cannot find module './repo'`.

- [ ] **Step 3: Implemente o mock**

`backend/src/test/mocks/repo.ts`:

```ts
import type { ObjectLiteral, Repository } from 'typeorm';
import { vi, type Mock } from 'vitest';

export type MockQueryBuilder = {
  select: Mock;
  addSelect: Mock;
  where: Mock;
  andWhere: Mock;
  orWhere: Mock;
  leftJoin: Mock;
  leftJoinAndSelect: Mock;
  innerJoin: Mock;
  innerJoinAndSelect: Mock;
  orderBy: Mock;
  addOrderBy: Mock;
  groupBy: Mock;
  skip: Mock;
  take: Mock;
  limit: Mock;
  offset: Mock;
  getOne: Mock;
  getMany: Mock;
  getManyAndCount: Mock;
  getCount: Mock;
  getRawOne: Mock;
  getRawMany: Mock;
  execute: Mock;
};

export function mockQueryBuilder(): MockQueryBuilder {
  const qb = {} as MockQueryBuilder;
  const chainable = [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orWhere',
    'leftJoin',
    'leftJoinAndSelect',
    'innerJoin',
    'innerJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'skip',
    'take',
    'limit',
    'offset',
  ] as const;
  for (const method of chainable) {
    qb[method] = vi.fn(() => qb);
  }
  qb.getOne = vi.fn().mockResolvedValue(null);
  qb.getMany = vi.fn().mockResolvedValue([]);
  qb.getManyAndCount = vi.fn().mockResolvedValue([[], 0]);
  qb.getCount = vi.fn().mockResolvedValue(0);
  qb.getRawOne = vi.fn().mockResolvedValue(undefined);
  qb.getRawMany = vi.fn().mockResolvedValue([]);
  qb.execute = vi.fn().mockResolvedValue(undefined);
  return qb;
}

export type MockRepository<T extends ObjectLiteral> = {
  [K in keyof Repository<T>]: Mock;
} & { createQueryBuilder: Mock<[], MockQueryBuilder> };

export function mockRepo<T extends ObjectLiteral>(): MockRepository<T> {
  const queryBuilder = mockQueryBuilder();
  const repo = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findOneBy: vi.fn().mockResolvedValue(null),
    findOneByOrFail: vi.fn(),
    findBy: vi.fn().mockResolvedValue([]),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    create: vi.fn((value) => value),
    save: vi.fn((value) => Promise.resolve(value)),
    insert: vi.fn().mockResolvedValue({ identifiers: [], generatedMaps: [], raw: {} }),
    update: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    upsert: vi.fn().mockResolvedValue({ identifiers: [], generatedMaps: [], raw: {} }),
    delete: vi.fn().mockResolvedValue({ affected: 1, raw: {} }),
    softDelete: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    remove: vi.fn((value) => Promise.resolve(value)),
    count: vi.fn().mockResolvedValue(0),
    countBy: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(false),
    existsBy: vi.fn().mockResolvedValue(false),
    increment: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    decrement: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    createQueryBuilder: vi.fn(() => queryBuilder),
  };
  return repo as unknown as MockRepository<T>;
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/mocks/repo.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/mocks/repo.ts backend/src/test/mocks/repo.test.ts
git commit -m "test(infra): adiciona mock de repositorio typeorm"
```

---

### Task 5.3: Mock de Redis (`mockRedis()`)

**Files:**
- Create: `backend/src/test/mocks/redis.ts`
- Test: `backend/src/test/mocks/redis.test.ts`

**Interfaces:**
- Consumes: nada (fake puro em memória).
- Produces:
  - `type MockRedis` — subconjunto de `ioredis` usado pelos services + `store: Map<string, string>` inspecionável.
  - `mockRedis(): MockRedis`.

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/mocks/redis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mockRedis } from './redis';

describe('mockRedis', () => {
  it('sets and gets a value', async () => {
    const redis = mockRedis();
    await redis.set('k', 'v');
    expect(await redis.get('k')).toBe('v');
  });

  it('deletes keys and reports existence', async () => {
    const redis = mockRedis();
    await redis.set('k', 'v');
    expect(await redis.exists('k')).toBe(1);
    expect(await redis.del('k')).toBe(1);
    expect(await redis.get('k')).toBeNull();
    expect(await redis.exists('k')).toBe(0);
  });

  it('increments and decrements numeric values', async () => {
    const redis = mockRedis();
    expect(await redis.incr('n')).toBe(1);
    expect(await redis.incr('n')).toBe(2);
    expect(await redis.decr('n')).toBe(1);
  });

  it('exposes an inspectable store and flushes', async () => {
    const redis = mockRedis();
    await redis.set('a', '1');
    expect(redis.store.get('a')).toBe('1');
    await redis.flushall();
    expect(redis.store.size).toBe(0);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/mocks/redis.test.ts`
Expected: FAIL — `Cannot find module './redis'`.

- [ ] **Step 3: Implemente o mock**

`backend/src/test/mocks/redis.ts`:

```ts
export type MockRedis = {
  store: Map<string, string>;
  ttls: Map<string, number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string | number): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  flushall(): Promise<'OK'>;
  quit(): Promise<'OK'>;
};

export function mockRedis(): MockRedis {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    store,
    ttls,
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key, value) {
      store.set(key, String(value));
      return 'OK';
    },
    async del(...keys) {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          removed += 1;
        }
        ttls.delete(key);
      }
      return removed;
    },
    async exists(...keys) {
      return keys.reduce((count, key) => count + (store.has(key) ? 1 : 0), 0);
    },
    async incr(key) {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    async decr(key) {
      const next = Number(store.get(key) ?? '0') - 1;
      store.set(key, String(next));
      return next;
    },
    async expire(key, seconds) {
      if (!store.has(key)) {
        return 0;
      }
      ttls.set(key, seconds);
      return 1;
    },
    async ttl(key) {
      if (!store.has(key)) {
        return -2;
      }
      return ttls.get(key) ?? -1;
    },
    async flushall() {
      store.clear();
      ttls.clear();
      return 'OK';
    },
    async quit() {
      return 'OK';
    },
  };
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/mocks/redis.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/mocks/redis.ts backend/src/test/mocks/redis.test.ts
git commit -m "test(infra): adiciona mock em memoria do redis"
```

---

### Task 5.4: Mock de fila BullMQ (`mockQueue()`)

**Files:**
- Create: `backend/src/test/mocks/queue.ts`
- Test: `backend/src/test/mocks/queue.test.ts`

**Interfaces:**
- Consumes: nada (fake puro).
- Produces:
  - `type MockJob<T>` — `{ id: string; name: string; data: T }`.
  - `type MockQueue<T>` — subconjunto de `bullmq` `Queue` + `jobs: MockJob<T>[]` inspecionável.
  - `mockQueue<T = unknown>(name?: string): MockQueue<T>`.

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/mocks/queue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mockQueue } from './queue';

type NotifyJob = { userId: string };

describe('mockQueue', () => {
  it('records added jobs', async () => {
    const queue = mockQueue<NotifyJob>('notifications');
    const job = await queue.add('send', { userId: 'u1' });
    expect(job.name).toBe('send');
    expect(job.data).toEqual({ userId: 'u1' });
    expect(queue.jobs).toHaveLength(1);
    expect(queue.name).toBe('notifications');
  });

  it('adds jobs in bulk and retrieves by id', async () => {
    const queue = mockQueue<NotifyJob>();
    const [first] = await queue.addBulk([
      { name: 'a', data: { userId: 'u1' } },
      { name: 'b', data: { userId: 'u2' } },
    ]);
    expect(queue.jobs).toHaveLength(2);
    expect(await queue.getJob(first.id)).toEqual(first);
  });

  it('removes a job', async () => {
    const queue = mockQueue<NotifyJob>();
    const job = await queue.add('send', { userId: 'u1' });
    await queue.remove(job.id);
    expect(queue.jobs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/mocks/queue.test.ts`
Expected: FAIL — `Cannot find module './queue'`.

- [ ] **Step 3: Implemente o mock**

`backend/src/test/mocks/queue.ts`:

```ts
import { randomUUID } from 'node:crypto';

export type MockJob<T> = {
  id: string;
  name: string;
  data: T;
};

export type MockQueue<T> = {
  name: string;
  jobs: MockJob<T>[];
  add(name: string, data: T): Promise<MockJob<T>>;
  addBulk(entries: Array<{ name: string; data: T }>): Promise<MockJob<T>[]>;
  getJob(id: string): Promise<MockJob<T> | undefined>;
  remove(id: string): Promise<number>;
  close(): Promise<void>;
};

export function mockQueue<T = unknown>(name = 'test-queue'): MockQueue<T> {
  const jobs: MockJob<T>[] = [];
  return {
    name,
    jobs,
    async add(jobName, data) {
      const job: MockJob<T> = { id: randomUUID(), name: jobName, data };
      jobs.push(job);
      return job;
    },
    async addBulk(entries) {
      const created = entries.map((entry) => ({
        id: randomUUID(),
        name: entry.name,
        data: entry.data,
      }));
      jobs.push(...created);
      return created;
    },
    async getJob(id) {
      return jobs.find((job) => job.id === id);
    },
    async remove(id) {
      const index = jobs.findIndex((job) => job.id === id);
      if (index === -1) {
        return 0;
      }
      jobs.splice(index, 1);
      return 1;
    },
    async close() {
      jobs.length = 0;
    },
  };
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/mocks/queue.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/mocks/queue.ts backend/src/test/mocks/queue.test.ts
git commit -m "test(infra): adiciona mock de fila bullmq"
```

---

### Task 5.5: Harness de banco de teste (`TestDataSource` + helpers)

**Files:**
- Create: `backend/src/test/database.ts`
- Test: `backend/src/test/database.test.ts`

**Interfaces:**
- Consumes: `typeorm` (`DataSource`), env de teste (Task 5.1). Descobre entidades/migrations da fase 6 via glob.
- Produces:
  - `TestDataSource: DataSource` — MySQL de teste, `synchronize: false`, globs de entidades/migrations.
  - `setupTestDatabase(): Promise<DataSource>` — inicializa (idempotente) e roda migrations.
  - `teardownTestDatabase(): Promise<void>` — destrói a conexão.
  - `truncateAll(): Promise<void>` — trunca todas as tabelas mapeadas com FK checks desabilitados.

**Dependência de infra:** exige MySQL de teste no ar (Docker da fase 2). Este é o primeiro teste de **integração** da suíte.

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/database.test.ts`:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, truncateAll, TestDataSource } from './database';

describe('test database harness', () => {
  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('initializes a connectable data source', async () => {
    const dataSource = await setupTestDatabase();
    expect(dataSource.isInitialized).toBe(true);
    const result = await dataSource.query('SELECT 1 AS ok');
    expect(Number(result[0].ok)).toBe(1);
  });

  it('truncates without throwing on an empty schema', async () => {
    await setupTestDatabase();
    await expect(truncateAll()).resolves.toBeUndefined();
  });

  it('keeps a single initialized instance', async () => {
    const a = await setupTestDatabase();
    const b = await setupTestDatabase();
    expect(a).toBe(b);
    expect(TestDataSource.isInitialized).toBe(true);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/database.test.ts`
Expected: FAIL — `Cannot find module './database'`.

- [ ] **Step 3: Implemente o harness**

`backend/src/test/database.ts`:

```ts
import { DataSource } from 'typeorm';
import { loadTestEnv } from './env';

loadTestEnv();

export const TestDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TEST_DB_HOST,
  port: Number(process.env.TEST_DB_PORT),
  username: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
  database: process.env.TEST_DB_NAME,
  synchronize: false,
  dropSchema: false,
  logging: false,
  entities: ['src/infra/database/entities/**/*.{ts,js}'],
  migrations: ['src/infra/database/migrations/**/*.{ts,js}'],
});

export async function setupTestDatabase(): Promise<DataSource> {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
    await TestDataSource.runMigrations();
  }
  return TestDataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
}

export async function truncateAll(): Promise<void> {
  if (!TestDataSource.isInitialized) {
    return;
  }
  const tableNames = TestDataSource.entityMetadatas.map((metadata) => metadata.tableName);
  await TestDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const tableName of tableNames) {
      await TestDataSource.query(`TRUNCATE TABLE \`${tableName}\``);
    }
  } finally {
    await TestDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/database.test.ts`
Expected: PASS (3 testes). Pré-requisito: MySQL de teste acessível em `TEST_DB_*` (subir via `docker compose up -d mysql` da fase 2 e garantir o database `marketplace_test`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/database.ts backend/src/test/database.test.ts
git commit -m "test(infra): adiciona data source e helpers de banco de teste"
```

---

### Task 5.6: `buildTestApp()` + self-test de integração

**Files:**
- Create: `backend/src/test/buildTestApp.ts`
- Test: `backend/src/test/buildTestApp.test.ts`

**Interfaces:**
- Consumes: `buildApp()` (`backend/src/app.ts`, fase 3); `setupTestDatabase`/`teardownTestDatabase` (Task 5.5).
- Produces: `buildTestApp(): Promise<FastifyInstance>` — banco de teste inicializado + app real pronto (`app.ready()`), pronto para `app.inject`.

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/buildTestApp.test.ts`:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './buildTestApp';
import { teardownTestDatabase } from './database';

describe('buildTestApp', () => {
  let app: FastifyInstance;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  it('boots the real app against the test database', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/buildTestApp.test.ts`
Expected: FAIL — `Cannot find module './buildTestApp'`.

- [ ] **Step 3: Implemente `buildTestApp`**

`backend/src/test/buildTestApp.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { setupTestDatabase } from './database';

export async function buildTestApp(): Promise<FastifyInstance> {
  await setupTestDatabase();
  const app = await buildApp();
  await app.ready();
  return app;
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/buildTestApp.test.ts`
Expected: PASS (1 teste). A rota `/health` vem do módulo `health` (fase 3); se o path diferir, ajuste a URL para o do módulo health.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/buildTestApp.ts backend/src/test/buildTestApp.test.ts
git commit -m "test(infra): adiciona buildTestApp para testes de integracao"
```

---

### Task 5.7: Builder de factories + convenção/template

**Files:**
- Create: `backend/src/test/factories/create-factory.ts`
- Test: `backend/src/test/factories/create-factory.test.ts`

**Interfaces:**
- Consumes: `typeorm` (`DataSource`, `EntityTarget`, `DeepPartial`, `ObjectLiteral`).
- Produces: `createFactory<T extends ObjectLiteral>(target: EntityTarget<T>, defaults: () => DeepPartial<T>)` → `(dataSource: DataSource, overrides?: DeepPartial<T>) => Promise<T>`. Cada chamada mescla `defaults()` com `overrides`, chama `repository.create` e persiste via `repository.save`.

**Convenção fixada (consumida pelas fases 6+):** cada factory concreta mora em `backend/src/test/factories/<entity>.factory.ts`, exporta `create<Entity>` construída com `createFactory`, e é registrada em `backend/src/test/factories/index.ts` na fase que cria a entidade. **Nenhuma factory concreta é commitada nesta fase** (as entidades só existem na fase 6). Template de referência (a ser adicionado pela fase 7 junto da entidade `User`):

```ts
import { randomUUID } from 'node:crypto';
import { User } from '../../infra/database/entities/user.entity';
import { createFactory } from './create-factory';

export const createUser = createFactory<User>(User, () => ({
  id: randomUUID(),
  email: `user-${randomUUID()}@example.com`,
  passwordHash: 'hashed',
  role: 'client',
}));
```

- [ ] **Step 1: Escreva o teste que falha**

`backend/src/test/factories/create-factory.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { createFactory } from './create-factory';

type Widget = { id: string; label: string; size: number };

function fakeDataSource() {
  const save = vi.fn((entity: Widget) => Promise.resolve(entity));
  const create = vi.fn((value: Partial<Widget>) => value as Widget);
  const getRepository = vi.fn(() => ({ create, save }));
  return { dataSource: { getRepository } as unknown as DataSource, save, create, getRepository };
}

describe('createFactory', () => {
  it('merges defaults with overrides and persists', async () => {
    const { dataSource, save, create } = fakeDataSource();
    const createWidget = createFactory<Widget>('Widget', () => ({
      id: 'default',
      label: 'default',
      size: 1,
    }));
    const widget = await createWidget(dataSource, { label: 'custom' });
    expect(create).toHaveBeenCalledWith({ id: 'default', label: 'custom', size: 1 });
    expect(save).toHaveBeenCalledWith({ id: 'default', label: 'custom', size: 1 });
    expect(widget).toEqual({ id: 'default', label: 'custom', size: 1 });
  });

  it('calls defaults fresh on every invocation', async () => {
    const { dataSource } = fakeDataSource();
    const defaults = vi.fn(() => ({ id: 'x', label: 'y', size: 0 }));
    const createWidget = createFactory<Widget>('Widget', defaults);
    await createWidget(dataSource);
    await createWidget(dataSource);
    expect(defaults).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd backend && npx vitest run src/test/factories/create-factory.test.ts`
Expected: FAIL — `Cannot find module './create-factory'`.

- [ ] **Step 3: Implemente o builder**

`backend/src/test/factories/create-factory.ts`:

```ts
import type { DataSource, DeepPartial, EntityTarget, ObjectLiteral } from 'typeorm';

export function createFactory<T extends ObjectLiteral>(
  target: EntityTarget<T>,
  defaults: () => DeepPartial<T>,
) {
  return async (dataSource: DataSource, overrides: DeepPartial<T> = {}): Promise<T> => {
    const repository = dataSource.getRepository(target);
    const entity = repository.create({ ...defaults(), ...overrides } as DeepPartial<T>);
    return repository.save(entity);
  };
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd backend && npx vitest run src/test/factories/create-factory.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/factories/create-factory.ts backend/src/test/factories/create-factory.test.ts
git commit -m "test(infra): adiciona builder generico de factories"
```

---

### Task 5.8: Verde total do backend

**Files:**
- Modify: nenhum (verificação).

- [ ] **Step 1: Typecheck + lint + suíte completa**

Run: `cd backend && npm run typecheck && npm run lint && npx vitest run`
Expected: sem erros de tipo/lint; todos os testes verdes (unit sem infra; `database`/`buildTestApp` verdes com MySQL de teste no ar).

- [ ] **Step 2: Commit (se o lint aplicar auto-fix)**

```bash
git add -A
git commit -m "test(infra): garante backend verde apos infra de testes"
```

Se não houver mudanças, pule o commit.

---

## Parte B — Frontend

### Task 5.9: Vitest + jsdom + Testing Library setup

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/setup.test.ts`

**Interfaces:**
- Consumes: `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
- Produces: config Vitest com `environment: 'jsdom'`, `globals: true`, `setupFiles` com jest-dom + `cleanup` automático.

- [ ] **Step 1: Escreva o teste que falha**

`frontend/src/test/setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('frontend test setup', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('extends expect with jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'hello';
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/test/setup.test.ts`
Expected: FAIL — sem env jsdom e/ou `toBeInTheDocument` inexistente.

- [ ] **Step 3: Implemente o setup**

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Implemente a config do Vitest**

`frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
  },
});
```

- [ ] **Step 5: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/test/setup.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/test/setup.test.ts
git commit -m "test(infra): configura vitest jsdom e testing library no frontend"
```

---

### Task 5.10: `renderWithProviders` (RTL + Query + Router)

**Files:**
- Create: `frontend/src/test/renderWithProviders.tsx`
- Test: `frontend/src/test/renderWithProviders.test.tsx`

**Interfaces:**
- Consumes: `@testing-library/react`, `@tanstack/react-query`, `react-router-dom`.
- Produces:
  - `type RenderWithProvidersOptions = { route?: string; queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'>`.
  - `renderWithProviders(ui: ReactElement, options?): RenderResult & { queryClient: QueryClient }` — envolve com `QueryClientProvider` (retries desligados) + `MemoryRouter` na rota inicial.
  - `createTestQueryClient(): QueryClient`.

- [ ] **Step 1: Escreva o teste que falha**

`frontend/src/test/renderWithProviders.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, useLocation } from 'react-router-dom';
import { renderWithProviders } from './renderWithProviders';

function QueryProbe() {
  const { data } = useQuery({ queryKey: ['probe'], queryFn: () => Promise.resolve('ok') });
  return <span>{data ?? 'loading'}</span>;
}

function LocationProbe() {
  return <span>{useLocation().pathname}</span>;
}

describe('renderWithProviders', () => {
  it('provides a query client', async () => {
    renderWithProviders(<QueryProbe />);
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('renders at the requested route', () => {
    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>,
      { route: '/dashboard' },
    );
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rode o teste e confirme a falha**

Run: `cd frontend && npx vitest run src/test/renderWithProviders.test.tsx`
Expected: FAIL — `Cannot find module './renderWithProviders'`.

- [ ] **Step 3: Implemente o helper**

`frontend/src/test/renderWithProviders.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export type RenderWithProvidersOptions = {
  route?: string;
  queryClient?: QueryClient;
} & Omit<RenderOptions, 'wrapper'>;

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { route = '/', queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
```

- [ ] **Step 4: Rode o teste e confirme o sucesso**

Run: `cd frontend && npx vitest run src/test/renderWithProviders.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/test/renderWithProviders.tsx frontend/src/test/renderWithProviders.test.tsx
git commit -m "test(infra): adiciona renderWithProviders para rtl"
```

---

### Task 5.11: Base do Playwright por perfil

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/fixtures.ts`
- Create: `frontend/e2e/smoke.spec.ts`
- Create: `frontend/e2e/.gitignore`

**Interfaces:**
- Consumes: `@playwright/test`.
- Produces:
  - `playwright.config.ts` com `testDir: 'e2e'`, `baseURL` de `E2E_BASE_URL` (default `http://localhost:4173`), e projetos por perfil: `auth`, `clients`, `professionals`, `admins`, `flows` (cada um com `testMatch` na pasta correspondente; os de sessão consomem `storageState` de `e2e/.auth/<role>.json`).
  - `e2e/fixtures.ts`: `export const test` estendido + `export { expect }`, com `roleStorageState(role)` helper.
  - `e2e/smoke.spec.ts`: smoke sem servidor (navega a `about:blank`), garantindo que a base do Playwright roda.

**Nota:** os specs reais por perfil (`e2e/clients/**`, etc.) são adicionados na fase 13. Aqui entregamos só a base executável.

- [ ] **Step 1: Crie o `.gitignore` de artefatos e sessões**

`frontend/e2e/.gitignore`:

```
.auth/
```

Adicione também, se ainda não existir, ao `frontend/.gitignore` (append): `playwright-report/`, `test-results/`.

- [ ] **Step 2: Escreva o smoke spec**

`frontend/e2e/smoke.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('playwright base', () => {
  test('boots a browser context', async ({ page }) => {
    await page.goto('about:blank');
    expect(page.url()).toBe('about:blank');
  });
});
```

- [ ] **Step 3: Implemente as fixtures**

`frontend/e2e/fixtures.ts`:

```ts
import { test as base, expect } from '@playwright/test';

export type WorkerRole = 'client' | 'professional' | 'admin';

export function roleStorageState(role: WorkerRole): string {
  return `e2e/.auth/${role}.json`;
}

export const test = base;
export { expect };
```

- [ ] **Step 4: Implemente a config**

`frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth',
      testMatch: ['smoke.spec.ts', 'auth/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'clients',
      testMatch: ['clients/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/client.json' },
    },
    {
      name: 'professionals',
      testMatch: ['professionals/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/professional.json' },
    },
    {
      name: 'admins',
      testMatch: ['admins/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
    },
    {
      name: 'flows',
      testMatch: ['flows/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 5: Instale o browser do Playwright e rode o smoke**

Run: `cd frontend && npx playwright install chromium && npx playwright test --project=auth smoke.spec.ts`
Expected: PASS (1 teste). O projeto `auth` não depende de `storageState`, então roda sem sessão pré-gravada nem servidor.

- [ ] **Step 6: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e/fixtures.ts frontend/e2e/smoke.spec.ts frontend/e2e/.gitignore frontend/.gitignore
git commit -m "test(infra): adiciona base do playwright por perfil"
```

---

### Task 5.12: Verde total do frontend

**Files:**
- Modify: nenhum (verificação).

- [ ] **Step 1: Typecheck + lint + suíte Vitest**

Run: `cd frontend && npm run typecheck && npm run lint && npx vitest run`
Expected: sem erros; testes de setup e `renderWithProviders` verdes.

- [ ] **Step 2: Commit (se o lint aplicar auto-fix)**

```bash
git add -A
git commit -m "test(infra): garante frontend verde apos infra de testes"
```

Se não houver mudanças, pule o commit.

---

## Fechamento da fase

- [ ] Backend verde: `cd backend && npm run typecheck && npm run lint && npx vitest run` (MySQL de teste no ar para `database`/`buildTestApp`).
- [ ] Frontend verde: `cd frontend && npm run typecheck && npm run lint && npx vitest run`.
- [ ] Smoke Playwright verde: `cd frontend && npx playwright test --project=auth smoke.spec.ts`.
- [ ] Confirme que os contratos estão exportados e estáveis: `mockRepo`, `mockRedis`, `mockQueue`, `TestDataSource`/`setupTestDatabase`/`teardownTestDatabase`/`truncateAll`, `buildTestApp`, `createFactory`, `renderWithProviders`.
- [ ] Confirme que nenhuma factory concreta foi commitada aqui (só o builder + template documentado); as fases 6+ adicionam `create<Entity>` via `createFactory`.
- [ ] Marque `Fase 5 — test infra` como concluída em `plan_index.md`.

## Self-Review (autoria do plano)

**Cobertura da spec (§2 devDeps de teste, §7 estratégia de testes, contrato "Test infra (fase 5)" do índice):**
- Vitest backend (unit + integração) → Task 5.1/5.8. Vitest frontend + RTL → 5.9/5.10/5.12.
- `buildTestApp()` → Task 5.6. Factories em `backend/src/test/factories/` (`createFactory` + convenção `create<Entity>`) → Task 5.7. Mocks `mockRepo`/`mockRedis`/`mockQueue` → Tasks 5.2/5.3/5.4. Playwright base por perfil → Task 5.11.
- Unit mocka repos/Redis/BullMQ; integração usa banco real via `buildTestApp()` → coberto por 5.2-5.6.

**Placeholders:** nenhum "TODO/TBD"; toda etapa de código traz o código completo. As factories concretas são deliberadamente diferidas às fases de domínio (dependência de entidade da fase 6), com builder + template concretos entregues aqui.

**Consistência de tipos:** `mockRepo`/`mockRedis`/`mockQueue`, `TestDataSource`/`setupTestDatabase`/`teardownTestDatabase`/`truncateAll`, `buildTestApp`, `createFactory` e `renderWithProviders`/`createTestQueryClient` usam a mesma assinatura na declaração, no teste e no uso.
