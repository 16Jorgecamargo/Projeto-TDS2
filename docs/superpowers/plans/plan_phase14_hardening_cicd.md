# Fase 14 — Hardening + CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Endurecer o backend em produção (secrets fail-fast, headers de segurança via helmet, rate limiting configurável por env) e automatizar qualidade e entrega via GitHub Actions (lint + typecheck + testes com MySQL/Redis + artefato OpenAPI no CI; build e push das imagens Docker multi-stage no CD ao integrar `main`).

**Architecture:** O hardening reaproveita os plugins de segurança já registrados no `buildApp()` (fase 3) — apenas troca as opções por versões endurecidas dirigidas por `getConfig()` — e reforça o parser de config (fase 1) com uma `superRefine` que rejeita secrets fracos/placeholder quando `NODE_ENV=production`. O CI/CD são dois workflows GitHub Actions que consomem os scripts de workspace existentes (`lint`, `typecheck`, `test`, `build`, `docs:export`) e os `Dockerfile` multi-stage da fase 2, publicando as imagens no GitHub Container Registry (GHCR) somente na branch `main`.

**Tech Stack:** Fastify 5 (`@fastify/helmet ^13`, `@fastify/rate-limit ^11`), Zod, GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/metadata-action@v5`, `docker/build-push-action@v6`), Docker multi-stage (fase 2), services MySQL 8 + Redis 7, Vitest.

## Global Constraints

Toda task herda estas regras verbatim (fonte: `docs/superpowers/plans/plan_index.md` §Global Constraints):

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

Referência: `docs/superpowers/plans/plan_index.md` e `docs/superpowers/specs/2026-07-01-services-marketplace-design.md`.

**Nota de dependências (Actions):** os `docker/*` e `actions/*` são GitHub Actions versionadas por tag — **não** são dependências npm e não violam a spec §2 (que trava apenas libs de runtime/dev do código). Nenhuma dependência npm nova é adicionada nesta fase.

---

## Contratos consumidos (fases 1-13, não redefinir)

- `getConfig(): Config` e `loadConfig(source?): Config` em `backend/src/config/index.ts` (fase 1) — parser Zod fail-fast; **modificado** nesta fase (novas variáveis + `superRefine`).
- `type Config = z.infer<typeof envSchema>` (fase 1).
- `buildApp(): Promise<FastifyInstance>` em `backend/src/app.ts` (fase 3) — registra helmet/cors/rate-limit/compress/swagger + rotas; **modificado** nesta fase (opções endurecidas de helmet e rate-limit).
- Scripts de workspace (fase 1): backend `lint`/`typecheck`/`test`/`build`/`docs:export`; frontend `lint`/`typecheck`/`test`/`build`.
- `backend/src/scripts/export-openapi.ts` (referenciado por `docs:export` na fase 1; implementado na auditoria Swagger da fase 13) — **contrato desta fase:** deve emitir o arquivo `backend/openapi.json`. Se a fase 13 escreveu em outro caminho, ajuste o `path` do artefato no CI.
- `backend/Dockerfile` e `frontend/Dockerfile` multi-stage (fase 2), contexto de build na raiz do monorepo.
- `.env.example` (fase 1) — **modificado** nesta fase (novas variáveis de rate limit).

### Contratos produzidos nesta fase

- Config endurecido: `Config` ganha `RATE_LIMIT_MAX: number` e `RATE_LIMIT_WINDOW: string`; `loadConfig` rejeita secrets fracos em produção.
- `buildApp()` passa a emitir headers de segurança endurecidos e rate limit dirigido por env.
- `.github/workflows/ci.yml` — jobs `quality`, `test`, `openapi`, `build`.
- `.github/workflows/cd.yml` — job `images` (build + push GHCR das duas imagens) restrito a `main`.

---

## File Structure

Backend:
- `backend/src/config/index.ts` — **modify**: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, `superRefine` de secrets.
- `backend/src/config/config.test.ts` — **modify**: casos de hardening de secrets.
- `backend/src/app.ts` — **modify**: opções endurecidas de helmet e rate-limit.
- `backend/src/app.security.test.ts` — **create**: integração de headers + rate limit.
- `backend/.env.example` — **modify**: novas variáveis de rate limit.

Raiz / infra:
- `.github/workflows/ci.yml` — **create**: lint/typecheck → test (MySQL+Redis) → OpenAPI artifact → build.
- `.github/workflows/cd.yml` — **create**: build + push das imagens Docker na `main`.

---

## Task 1: Hardening de secrets no parser de config

**Files:**
- Modify: `backend/src/config/index.ts`
- Modify: `backend/src/config/config.test.ts`

**Interfaces:**
- Consumes: `zod`; `envSchema`/`loadConfig` (fase 1).
- Produces: `loadConfig` lança `Invalid environment configuration` quando `NODE_ENV=production` e algum JWT secret é fraco (menos de 32 chars ou contém `change-me`/`placeholder`/`secret`). Fora de produção o comportamento é inalterado.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `backend/src/config/config.test.ts` (o `validEnv` do arquivo já existe na fase 1):

```ts
describe('production secret hardening', () => {
  const strong = 'K7pQ2wZ9xL4mN8vR1tB6yH3cD5fJ0sA';
  const strongRefresh = 'M2nB4vC6xZ8lK0jH1gF3dS5aP7oI9uY';

  it('rejects placeholder secrets in production', () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'change-me-access-secret-32-characters-min',
        JWT_REFRESH_SECRET: strongRefresh,
      } as NodeJS.ProcessEnv),
    ).toThrow('Invalid environment configuration');
  });

  it('accepts strong secrets in production', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: strongRefresh,
    } as NodeJS.ProcessEnv);
    expect(config.NODE_ENV).toBe('production');
  });

  it('allows placeholder secrets outside production', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'change-me-access-secret-32-characters-min',
      JWT_REFRESH_SECRET: 'change-me-refresh-secret-32-characters-min',
    } as NodeJS.ProcessEnv);
    expect(config.NODE_ENV).toBe('development');
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm run test --workspace backend -- src/config/config.test.ts`
Expected: FAIL — o caso "rejects placeholder secrets in production" não lança (secret placeholder tem 41 chars, passa no `min(32)`).

- [ ] **Step 3: Implementar o `superRefine` no `envSchema`**

Em `backend/src/config/index.ts`, adicionar `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW` ao objeto (usados na Task 3) e encadear `.superRefine` no schema. O schema final fica:

```ts
const WEAK_SECRET_PATTERN = /change-me|placeholder|secret/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default('0.0.0.0'),
    DATABASE_HOST: z.string().min(1),
    DATABASE_PORT: z.coerce.number().int().positive().default(3306),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_NAME: z.string().min(1),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
    SENTRY_DSN: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
      return;
    }
    const guarded: Array<['JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', string]> = [
      ['JWT_ACCESS_SECRET', data.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', data.JWT_REFRESH_SECRET],
    ];
    for (const [key, value] of guarded) {
      if (WEAK_SECRET_PATTERN.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must not use a placeholder value in production`,
        });
      }
    }
  });
```

Manter `type Config`, `loadConfig`, `getConfig` como estão — `safeParse` já propaga os issues do `superRefine`.

- [ ] **Step 4: Rodar e confirmar verde**

Run: `npm run test --workspace backend -- src/config/config.test.ts`
Expected: PASS — todos os casos, incluindo os três novos.

- [ ] **Step 5: Typecheck e lint**

Run: `npm run typecheck --workspace backend && npm run lint --workspace backend`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/index.ts backend/src/config/config.test.ts
git commit -m "feat(config): rejeita secrets placeholder em producao e adiciona limites de rate limit"
```

---

## Task 2: `.env.example` com variáveis de rate limit

**Files:**
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: schema de env (Task 1).
- Produces: template documenta `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW`.

- [ ] **Step 1: Verificação que falha**

Run: `grep -q RATE_LIMIT_MAX backend/.env.example && echo PRESENT || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Acrescentar ao final de `backend/.env.example`**

```dotenv
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

- [ ] **Step 3: Confirmar presença**

Run: `grep -q RATE_LIMIT_WINDOW backend/.env.example && echo PRESENT`
Expected: `PRESENT`

- [ ] **Step 4: Commit**

```bash
git add backend/.env.example
git commit -m "chore(config): documenta variaveis de rate limit no env de exemplo"
```

---

## Task 3: Headers de segurança e rate limit endurecidos no `buildApp()`

**Files:**
- Modify: `backend/src/app.ts`
- Test: `backend/src/app.security.test.ts`

**Interfaces:**
- Consumes: `@fastify/helmet`, `@fastify/rate-limit` (já registrados na fase 3); `getConfig()` (Task 1); `buildApp()` (fase 3).
- Produces: respostas com `strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `content-security-policy` e `x-ratelimit-limit`. Rate limit global usa `config.RATE_LIMIT_MAX`/`config.RATE_LIMIT_WINDOW`.

- [ ] **Step 1: Escrever o teste de integração que falha**

`backend/src/app.security.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  app.get('/security-probe', async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('security hardening', () => {
  it('emits hardened security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/security-probe' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('exposes rate limit headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/security-probe' });
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm run test --workspace backend -- src/app.security.test.ts`
Expected: FAIL — `x-frame-options`/`content-security-policy` ausentes ou com defaults do helmet que não batem (`SAMEORIGIN`), ou `x-ratelimit-limit` ausente se o rate limit da fase 3 não expõe headers.

- [ ] **Step 3: Endurecer as opções de helmet e rate-limit em `backend/src/app.ts`**

Localizar as registrações existentes (fase 3) `await app.register(helmet, ...)` e `await app.register(rateLimit, ...)` dentro de `buildApp()` e substituir as opções pelas versões abaixo. Garantir que `getConfig` está importado de `./config/index.js`.

```ts
const config = getConfig();

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      scriptSrc: [`'self'`, `'unsafe-inline'`],
      styleSrc: [`'self'`, `'unsafe-inline'`],
      imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
      objectSrc: [`'none'`],
      upgradeInsecureRequests: null,
    },
  },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: false,
});

await app.register(rateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
});
```

Notas: `crossOriginEmbedderPolicy: false` mantém o Swagger UI (fase 3) funcional; `scriptSrc`/`styleSrc` com `'unsafe-inline'` são necessários para os assets embutidos do swagger-ui. Se a fase 3 registrou helmet/rate-limit via um plugin agregador (ex.: `src/plugins/security.ts`), aplicar as mesmas opções lá em vez de em `app.ts`.

- [ ] **Step 4: Rodar e confirmar verde**

Run: `npm run test --workspace backend -- src/app.security.test.ts`
Expected: PASS — headers endurecidos e `x-ratelimit-limit` presentes.

- [ ] **Step 5: Rodar a suíte completa do backend (garante que o hardening não quebrou o Swagger nem outros módulos)**

Run: `npm run test --workspace backend`
Expected: PASS.

- [ ] **Step 6: Typecheck e lint**

Run: `npm run typecheck --workspace backend && npm run lint --workspace backend`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.ts backend/src/app.security.test.ts
git commit -m "feat(security): endurece headers helmet e rate limit dirigido por env"
```

---

## Task 4: Workflow CI (lint/typecheck → testes → OpenAPI → build)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts de workspace (`lint`, `typecheck`, `test`, `build`, `docs:export`); services MySQL 8 + Redis 7; script de migrations `migration:run` (fase 6).
- Produces: quatro jobs — `quality` (lint + typecheck), `test` (MySQL+Redis, depende de `quality`), `openapi` (artefato `openapi.json`, depende de `test`), `build` (`npm run build --workspaces`, depende de `quality`).

- [ ] **Step 1: Verificação que falha**

Run: `test -f .github/workflows/ci.yml && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    needs: quality
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: marketplace_test
          MYSQL_USER: app
          MYSQL_PASSWORD: secret
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h localhost -proot"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10
    env:
      NODE_ENV: test
      DATABASE_HOST: 127.0.0.1
      DATABASE_PORT: 3306
      DATABASE_USER: app
      DATABASE_PASSWORD: secret
      DATABASE_NAME: marketplace_test
      REDIS_HOST: 127.0.0.1
      REDIS_PORT: 6379
      JWT_ACCESS_SECRET: ci-access-secret-01234567890123456789
      JWT_REFRESH_SECRET: ci-refresh-secret-01234567890123456789
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run migration:run --workspace @marketplace/backend
      - run: npm run test --workspace @marketplace/backend
      - run: npm run test --workspace @marketplace/frontend

  openapi:
    runs-on: ubuntu-latest
    needs: test
    env:
      NODE_ENV: test
      DATABASE_HOST: 127.0.0.1
      DATABASE_PORT: 3306
      DATABASE_USER: app
      DATABASE_PASSWORD: secret
      DATABASE_NAME: marketplace_test
      REDIS_HOST: 127.0.0.1
      REDIS_PORT: 6379
      JWT_ACCESS_SECRET: ci-access-secret-01234567890123456789
      JWT_REFRESH_SECRET: ci-refresh-secret-01234567890123456789
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run docs:export --workspace @marketplace/backend
      - uses: actions/upload-artifact@v4
        with:
          name: openapi
          path: backend/openapi.json
          if-no-files-found: error

  build:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build --workspaces
```

Notas: `docs:export` roda com `NODE_ENV=test` porque exporta o OpenAPI a partir de `buildApp()` sem subir servidor; o job `openapi` não usa services (o export não toca DB/Redis reais). Se `export-openapi.ts` (fase 13) exigir conexão, replique o bloco `services`/`env` do job `test`. O `path` do artefato assume que `docs:export` grava `backend/openapi.json` — ajuste se a fase 13 usar outro caminho.

- [ ] **Step 3: Validar a sintaxe YAML do workflow**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('CI_YAML_OK')"`
Expected: imprime `CI_YAML_OK`.

- [ ] **Step 4: Confirmar que os jobs esperados existem**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); assert set(d['jobs'])=={'quality','test','openapi','build'}, d['jobs']; print('CI_JOBS_OK')"`
Expected: imprime `CI_JOBS_OK`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: adiciona pipeline de lint typecheck testes e artefato openapi"
```

---

## Task 5: Workflow CD (build + push das imagens Docker na `main`)

**Files:**
- Create: `.github/workflows/cd.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile`, `frontend/Dockerfile` (fase 2, contexto na raiz); workflow CI (Task 4) via `workflow_run`.
- Produces: imagens `ghcr.io/<owner>/marketplace-backend` e `ghcr.io/<owner>/marketplace-frontend` publicadas quando o CI conclui com sucesso na `main`.

- [ ] **Step 1: Verificação que falha**

Run: `test -f .github/workflows/cd.yml && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `.github/workflows/cd.yml`**

```yaml
name: CD

on:
  workflow_run:
    workflows: [CI]
    branches: [main]
    types: [completed]

permissions:
  contents: read
  packages: write

jobs:
  images:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    strategy:
      matrix:
        include:
          - name: backend
            dockerfile: backend/Dockerfile
          - name: frontend
            dockerfile: frontend/Dockerfile
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/marketplace-${{ matrix.name }}
          tags: |
            type=sha
            type=raw,value=latest
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.dockerfile }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Notas: dispara via `workflow_run` para só publicar após o CI (Task 4) verde na `main` — garante lint/typecheck/testes antes do push. `GITHUB_TOKEN` com `packages: write` autentica no GHCR sem secret extra. O contexto `.` respeita os workspaces npm exigidos pelos Dockerfiles multi-stage da fase 2.

- [ ] **Step 3: Validar a sintaxe YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/cd.yml')); print('CD_YAML_OK')"`
Expected: imprime `CD_YAML_OK`.

- [ ] **Step 4: Confirmar gatilho e matriz**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/cd.yml')); names=[i['name'] for i in d['jobs']['images']['strategy']['matrix']['include']]; assert names==['backend','frontend'], names; print('CD_MATRIX_OK')"`
Expected: imprime `CD_MATRIX_OK`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/cd.yml
git commit -m "ci: publica imagens docker no ghcr apos ci verde na main"
```

---

## Task 6: Verificação integrada da fase (hardening + build de produção)

**Files:**
- Nenhum arquivo novo — valida o deliverable da fase inteira.

**Interfaces:**
- Consumes: todas as tasks anteriores; `Dockerfile` multi-stage (fase 2).
- Produces: evidência de que o hardening está verde, os workflows são YAML válidos e as imagens de produção buildam.

- [ ] **Step 1: Suíte, typecheck e lint agregados**

Run: `npm run lint && npm run typecheck && npm run test --workspace @marketplace/backend`
Expected: PASS — hardening de config e headers verdes, sem violações.

- [ ] **Step 2: Validar os dois workflows de uma vez**

Run: `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]; print('WORKFLOWS_OK')"`
Expected: imprime `WORKFLOWS_OK`.

- [ ] **Step 3: Build de produção das duas imagens (stage production)**

Run: `docker build -f backend/Dockerfile -t marketplace-backend:ci . && docker build -f frontend/Dockerfile -t marketplace-frontend:ci .`
Expected: PASS — ambas as imagens multi-stage buildam (o backend já tem `server.js` a partir da fase 3).

- [ ] **Step 4: Confirmar o build de produção dos workspaces**

Run: `npm run build --workspaces`
Expected: PASS — `backend/dist` gerado por `tsc` e `frontend/dist` por `vite build`.

- [ ] **Step 5: Commit (se houver ajustes)**

```bash
git add -A
git commit -m "chore: valida fase 14 com hardening workflows e build de producao" || echo "nada a commitar"
```

---

## Self-Review

**Spec coverage (§fase 14 / §infra):**
- Hardening — secrets fail-fast em produção → Task 1. ✅
- Hardening — headers de segurança (helmet CSP/HSTS/frameguard) → Task 3. ✅
- Hardening — rate limit dirigido por env → Tasks 1-3. ✅
- CI GitHub Actions — lint+typecheck → Task 4 job `quality`. ✅
- CI — testes com MySQL+Redis de serviço → Task 4 job `test`. ✅
- CI — export do artefato OpenAPI → Task 4 job `openapi`. ✅
- CI — build → Task 4 job `build`. ✅
- CD — build + push imagem Docker na `main` → Task 5. ✅
- Build de produção multi-stage (iniciado na fase 2) → Task 6 Steps 3-4. ✅

**Placeholder scan:** Sem TBD/TODO. Todo passo de código traz código completo; YAML dos workflows completos; comandos de verificação com saída esperada explícita.

**Type consistency:** `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW` adicionados ao `envSchema` (Task 1) e consumidos como `config.RATE_LIMIT_MAX`/`config.RATE_LIMIT_WINDOW` no `buildApp` (Task 3) — nomes idênticos. `getConfig()` retorna `Config` já contendo os novos campos. Nomes de workspace (`@marketplace/backend`, `@marketplace/frontend`) batem com a fase 1. Nomes de job referenciados no `needs` (`quality`, `test`) existem. `docs:export` → artefato `backend/openapi.json` é contrato único citado em CI e nas notas.

**Sem deps novas:** nenhuma dependência npm adicionada; `docker/*` e `actions/*` são GitHub Actions (não npm), fora do escopo da trava da spec §2.

**Ordem respeitada:** fase 14 é a última — consome `buildApp`/config (1,3), Dockerfiles (2), scripts e `export-openapi.ts` (1,13). Todos entregues antes.

---

## Execution Handoff

Plano completo e salvo em `docs/superpowers/plans/plan_phase14_hardening_cicd.md`. Duas opções de execução:

1. **Subagent-Driven (recomendado)** — um subagent novo por task, review entre tasks, iteração rápida.
2. **Inline Execution** — executar as tasks nesta sessão com `superpowers:executing-plans`, checkpoints de review.
