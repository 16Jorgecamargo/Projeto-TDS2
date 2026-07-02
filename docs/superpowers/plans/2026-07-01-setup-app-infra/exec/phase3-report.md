# Fase 3 — Foundation · Relatório de Execução

**Status:** CONCLUÍDA (verde). Branch `feat/marketplace-implementation`.

## Resumo

Esqueleto executável do backend Fastify (`buildApp()` + plugins de segurança + Swagger via Zod + error handler + auth + health + bootstrap) e app shell do frontend (router, HTTP client, stores, layout) entregues via TDD. Todos os contratos fundacionais das fases 6+ estão exportados e verdes.

## Commits (ordem)

| Hash | Mensagem |
|------|----------|
| 699c0e7 | chore(core): adiciona env resolvido, CORS_ORIGIN e fastify-plugin para fase 3 |
| 90e9a93 | feat(core): adiciona error handler global com envelope de erro |
| 74c68f2 | feat(core): adiciona autenticacao JWT e guard requireRole |
| 24e297a | feat(health): adiciona rotas de liveness e readiness |
| 91cb3ca | feat(core): adiciona buildApp com plugins de seguranca e swagger |
| d5e9201 | feat(core): adiciona bootstrap do servidor http com env lazy nos testes |
| 1af03aa | feat(auth): adiciona store de autenticacao zustand |
| fa9494c | feat(core): adiciona http client axios com refresh e query client |
| 4b9b1ca | feat(core): adiciona protected route e pagina not found |
| 4e68ae3 | feat(core): adiciona app shell, layout, router e entrypoint do frontend |

## Testes rodados (saída resumida)

- Backend `npm run typecheck`: sem erros.
- Backend `npm run lint`: sem erros.
- Backend `npx vitest run`: **6 arquivos / 17 testes** verdes (config, error-handler, auth, health, app, server).
- Frontend `npm run typecheck`: sem erros.
- Frontend `npm run lint`: sem erros.
- Frontend `npx vitest run`: **4 arquivos / 10 testes** verdes (auth store, http client, ProtectedRoute, App shell).
- Smoke boot real (`tsx src/server.ts`): `GET /health` → `{"status":"ok","uptime":...}`; `GET /health/ready` → `{"status":"ready"}`; `GET /docs` → 200 (Swagger UI); `GET /docs/json` → OpenAPI 3.0.3.

## Contratos exportados (consumidos pelas fases 6+)

| Contrato | Origem |
|----------|--------|
| `errorHandlerPlugin` (envelope `{ error: { code, message, details? } }`) | `backend/src/plugins/error-handler.ts` |
| `roleSchema = z.enum(['client','professional','admin'])`, `type Role`, `type AuthUser` | `backend/src/plugins/auth.ts` |
| `authPlugin` (decora `app.authenticate`), `requireRole(...roles)` | `backend/src/plugins/auth.ts` |
| Augmentation `FastifyRequest.user` / `FastifyInstance.authenticate` | `backend/src/types/fastify.d.ts` |
| `healthRoutes(app)` → `GET /health`, `GET /health/ready` | `backend/src/modules/health/health.routes.ts` |
| `buildApp(): Promise<FastifyInstance>` (plugins + swagger `/docs` + `/docs/json`) | `backend/src/app.ts` |
| `start(): Promise<FastifyInstance>` + entrypoint | `backend/src/server.ts` |
| `useAuthStore` (`{ user, accessToken, setAuth, clear }`), `type Role`, `type AuthUser` | `frontend/src/stores/auth.ts` |
| `http` (axios baseURL `/api` + interceptors), `refreshAccessToken()` | `frontend/src/lib/http.ts` |
| `queryClient` | `frontend/src/lib/queryClient.ts` |
| `ProtectedRoute({ roles? })` | `frontend/src/router/ProtectedRoute.tsx` |
| `router` (createBrowserRouter), `App`, `Layout`, `NotFound`, `main.tsx` | `frontend/src/router/index.tsx`, `App.tsx`, `components/Layout.tsx`, `pages/NotFound.tsx`, `main.tsx` |

## Desvios / decisões (não inventei contratos)

1. **`env` da fase 1**: config existia como `getConfig()` em `src/config/index.ts`. Criado `src/config/env.ts` exportando `env` (contrato do plano). Implementado como **Proxy lazy** (`getConfig()` no primeiro acesso) para não lançar no import durante a coleta do Vitest — mantém a assinatura `env.PORT`, `env.CORS_ORIGIN`, etc.
2. **`CORS_ORIGIN`** adicionado ao schema de env (faltava; autorizado pelo brief "se faltar, adicione").
3. **`fastify-plugin`** adicionado às deps do backend (usado por todos os plugins `fp`; já hoisted, agora explícito).
4. **`backend/vitest.config.ts`** injeta env de teste via `process.env` (herdado pelos workers forks) — determinístico.
5. **Testes de router no frontend** usam `MemoryRouter` + `Routes/Route` em vez de `createMemoryRouter`/`RouterProvider` (data router). Motivo: incompatibilidade de ambiente jsdom + undici — `@remix-run/router` constrói um `Request` com `AbortSignal` do jsdom, rejeitado por brand-check do `Request` nativo (`RequestInit: Expected signal to be an instance of AbortSignal`). O componente `ProtectedRoute` e o `router` de produção (`createBrowserRouter`) permanecem **inalterados**; só o harness de teste foi adaptado. No browser real não há o mismatch.

## FIX — Code Review (2026-07-01)

Dois achados do code review corrigidos após conclusão da fase.

### FIX 1 — `frontend/src/lib/http.ts`: union literal `Role` → importar `AuthUser`

**O que mudou:** `refreshAccessToken` tipava o retorno do POST com `{ id: string; role: 'client' | 'professional' | 'admin' }` inline. Substituído por `AuthUser` importado de `../stores/auth`.

```diff
-import { useAuthStore } from '../stores/auth';
+import { useAuthStore, type AuthUser } from '../stores/auth';

-  const response = await refreshClient.post<{
-    accessToken: string;
-    user: { id: string; role: 'client' | 'professional' | 'admin' };
-  }>('/auth/refresh');
+  const response = await refreshClient.post<{
+    accessToken: string;
+    user: AuthUser;
+  }>('/auth/refresh');
```

### FIX 2 — `frontend/src/main.tsx`: `as HTMLElement` → null-check seguro

**O que mudou:** cast inseguro removido; `throw` explícito se `#root` ausente.

```diff
-createRoot(document.getElementById('root') as HTMLElement).render(
+const root = document.getElementById('root');
+if (!root) throw new Error('Root element not found');
+createRoot(root).render(
```

### Verificação pós-fix

```
node node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json
# sem saída = zero erros

cd frontend && node ../node_modules/.bin/eslint src/lib/http.ts src/main.tsx
# sem saída = zero warnings/erros

node ../node_modules/.bin/vitest run
# Test Files  4 passed (4)
#       Tests 10 passed (10)
#    Duration 650ms
```

## Concerns para próximas fases

- **jsdom + data router**: testes que exercitam navegação via `createMemoryRouter`/`RouterProvider` (ex.: E2E-ish de RTL na fase 5/13) esbarram no bug do `AbortSignal`. A fase 5 (test infra) deve decidir a correção definitiva (polyfill nativo de `AbortController`/`AbortSignal` no setup, ou `happy-dom`). Enquanto isso, usar `MemoryRouter` no RTL.
- **`refreshAccessToken()`** aponta para `POST /api/auth/refresh` (implementação real na fase 7). Interceptor já pronto para consumir.
- **Rotas de módulo**: `buildApp()` registra apenas `healthRoutes`. Fases 6+ registram seus `xRoutes` no corpo de `buildApp()`.
- **Env em runtime**: `env` é lazy; em produção/docker exige as variáveis presentes (compose já fornece). Sem `.env` versionado.
