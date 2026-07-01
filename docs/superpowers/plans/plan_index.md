# Services Marketplace — Índice de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar cada fase task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Marketplace de serviços full-stack (cliente/profissional/admin) com carteira interna, contratos, chat, notificações e observabilidade.

**Architecture:** Monorepo (`backend/` Fastify 5 monolito modular + `frontend/` React 19/Vite) com MySQL 8, Redis/BullMQ. Zod é fonte única de validação e OpenAPI. Frontend fatiado por feature junto do módulo backend correspondente. Docker Compose orquestra tudo.

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, ioredis + BullMQ, Zod + fastify-type-provider-zod + zod-openapi, JWT + bcrypt, socket.io, prom-client + Sentry, Vitest; React 19 + Vite 6, react-router-dom 6, TanStack Query 5, Zustand 5, react-hook-form + Zod, axios, socket.io-client, Tailwind 3, Playwright.

Spec de referência: `docs/superpowers/specs/2026-07-01-services-marketplace-design.md`.

---

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

---

## Ordem de execução (item 7 da spec)

Executar as fases nesta ordem. Cada fase é um arquivo de plano próprio. Uma fase só começa quando a anterior está verde (typecheck + lint + testes).

| # | Arquivo | Deliverable |
|---|---------|-------------|
| 1 | `plan_phase1_setup.md` | Monorepo, TS strict, ESLint/Prettier, env/config, scripts, scaffold Vite |
| 2 | `plan_phase2_docker_infra.md` | Docker Compose (mysql/redis/prometheus/grafana), multi-stage, Nginx proxy |
| 3 | `plan_phase3_foundation.md` | Fastify boot + plugins + Swagger + health; app shell React + router + HTTP client + stores |
| 4 | `plan_phase4_shared.md` | Schemas Zod compartilhados, envelope de erro, middlewares, tipos frontend |
| 5 | `plan_phase5_test_infra.md` | Vitest + `buildTestApp()` + factories + mocks; Vitest/RTL + Playwright base |
| 6 | `plan_phase6_data.md` | ~50 entidades TypeORM + migrations + data-source |
| 7 | `plan_phase7_auth_account.md` | auth, account, user, address, LGPD, exclusão; features auth/settings |
| 8 | `plan_phase8_professional.md` | professional, catálogo, portfolio, availability, search; features professional/landing |
| 9 | `plan_phase9_demand_contract.md` | demand, quote, contract, disputes; features demands/contracts |
| 10 | `plan_phase10_wallet_payment.md` | wallet, payment, fees, refunds, withdrawals; feature wallet |
| 11 | `plan_phase11_social_comm.md` | review, social, chat, notification, audit, admin; features chat/notifications/admin |
| 12 | `plan_phase12_observability.md` | prom-client, Sentry, Grafana, Prometheus scrape |
| 13 | `plan_phase13_integration_e2e.md` | Integração banco real, auditoria Swagger, E2E Playwright por perfil |
| 14 | `plan_phase14_hardening_cicd.md` | Hardening, GitHub Actions CI/CD, build de produção |

---

## Contratos de interface compartilhados

Definidos nas fases fundacionais (3-5). Toda fase de domínio consome estes contratos; não redefinir.

### Envelope de erro (fase 4)
```ts
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) { super(message); }
}
```
Handler global serializa para `{ error: { code: string; message: string; details?: unknown } }`.
Subclasses: `BadRequestError(400,'BAD_REQUEST')`, `UnauthorizedError(401,'UNAUTHORIZED')`, `ForbiddenError(403,'FORBIDDEN')`, `NotFoundError(404,'NOT_FOUND')`, `ConflictError(409,'CONFLICT')`, `UnprocessableError(422,'UNPROCESSABLE')`.

### Schemas base (fase 4)
- `idParamSchema = z.object({ id: z.string().uuid().describe('...').openapi({ example }) })`
- `paginationQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })`
- `paginatedResponse(itemSchema)` → `{ items, page, limit, total }`.
- Toda rota registra `schema: { tags, summary, body?, querystring?, params?, response }` com Zod.

### App e request (fase 3)
- `buildApp(): FastifyInstance` — registra plugins, swagger, error handler, rotas de módulos.
- Autenticação via decorator `app.authenticate` (preHandler) → popula `request.user = { id, role }`.
- `role` = `z.enum(['client','professional','admin'])`.
- Guard `requireRole(...roles)` como preHandler factory.

### Test infra (fase 5)
- `buildTestApp(): Promise<FastifyInstance>` — app real + banco de teste (migrations aplicadas), Redis/BullMQ reais ou fakes conforme suite.
- Factories em `backend/src/test/factories/` retornam entidades persistidas (`createUser`, `createProfessional`, `createDemand`, ...).
- Unit: helper `mockRepo<T>()`, `mockRedis()`, `mockQueue()`.

### Frontend base (fase 3)
- `lib/http.ts` — instância axios com baseURL `/api`, interceptors de auth (access token) e refresh.
- `stores/auth.ts` — Zustand: `{ user, accessToken, setAuth, clear }`.
- Query client TanStack em `lib/queryClient.ts`; chaves de query por feature em `features/<x>/queries.ts`.
- Rotas protegidas via `router/ProtectedRoute.tsx` (checa role).

---

## Convenção de estrutura por módulo backend

Cada módulo em `backend/src/modules/<name>/`:
```
<name>.routes.ts      registro de rotas + schema Zod inline
<name>.controller.ts  handlers finos, chamam service
<name>.service.ts     regra de negócio, usa repositórios TypeORM
<name>.schemas.ts     schemas Zod (request/response) com describe+openapi
<name>.service.test.ts  unit (mocka repos/Redis/BullMQ)
<name>.routes.test.ts   integração via buildTestApp()
```

## Convenção de estrutura por feature frontend

Cada feature em `frontend/src/features/<name>/`:
```
api.ts        chamadas axios tipadas
queries.ts    hooks TanStack Query/mutations
components/    UI da feature
pages/         telas roteáveis
schemas.ts    Zod (react-hook-form resolvers)
<name>.test.tsx  RTL
```

---

## Estado das fases

- [ ] Fase 1 — setup
- [ ] Fase 2 — docker/infra
- [ ] Fase 3 — foundation
- [ ] Fase 4 — shared
- [ ] Fase 5 — test infra
- [ ] Fase 6 — data
- [ ] Fase 7 — auth/account
- [ ] Fase 8 — professional
- [ ] Fase 9 — demand/contract
- [ ] Fase 10 — wallet/payment
- [ ] Fase 11 — social/comm
- [ ] Fase 12 — observability
- [ ] Fase 13 — integração/E2E
- [ ] Fase 14 — hardening/CI/CD (plano escrito)
