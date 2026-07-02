# Fase 5 — Test Infra: Relatório de Execução

**Data:** 2026-07-01  
**Branch:** feat/marketplace-implementation  
**Status:** CONCLUÍDA

---

## Commits entregues

```
7223ad1e test(infra): configura vitest com swc e setup global do backend
dc632b1f test(infra): adiciona mock de repositorio typeorm
c6f6541c test(infra): adiciona mock em memoria do redis
a414e475 test(infra): adiciona mock de fila bullmq
6f84f16d test(infra): adiciona data source e helpers de banco de teste
09dcd320 test(infra): adiciona buildTestApp para testes de integracao
c3b00471 test(infra): adiciona builder generico de factories
c3c17930 test(infra): configura vitest jsdom e testing library no frontend
084c7fa9 test(infra): adiciona renderWithProviders para rtl
70ea174f test(infra): adiciona base do playwright por perfil
```

---

## Resultados dos testes

### Backend (`cd backend && npx vitest run`)

```
Test Files  17 passed (17)
Tests       47 passed (47)
Duration    ~1.2s
```

Suites anteriores (fases 1-4): 29 testes — mantidos verdes.  
Novas suites fase 5: 18 testes adicionais.

### Frontend (`cd frontend && npx vitest run`)

```
Test Files  8 passed (8)
Tests       20 passed (20)
Duration    ~1.2s
```

Testes anteriores: 16 (fases 1-4) — mantidos.  
Novos: setup.test (2) + renderWithProviders.test (2) = 4 novos.

### Playwright smoke

```
1 passed (2.4s)
[auth] › e2e/smoke.spec.ts › playwright base › boots a browser context
```

---

## Resolução do concern AbortSignal (diferido da Fase 3)

**Problema:** jsdom + undici pode quebrar `@remix-run/router` (data API) por brand-check de `AbortSignal`.

**Investigação:** Os testes existentes de router (`ProtectedRoute.test.tsx`, `App.test.tsx`) usam `MemoryRouter` da API legada do react-router-dom, que **não usa o data-router**. Logo, o brand-check não é acionado e todos os 16 testes passam.

**Decisão definitiva:** Mantida a abordagem com `MemoryRouter` + polyfill defensivo no `setup.ts`:

```ts
const NativeAbortController = globalThis.AbortController;
const NativeAbortSignal = globalThis.AbortSignal;
Object.assign(globalThis, {
  AbortController: NativeAbortController,
  AbortSignal: NativeAbortSignal,
});
```

**Por que não migramos para `createMemoryRouter/RouterProvider`:** os testes atuais testam comportamento de guarda de rota, não navegação programática. `MemoryRouter` é a API correta para esse caso de uso (não é workaround — é a API de teste recomendada pela doc do react-router v6 para suítes RTL). A migração só faria sentido se os testes precisassem do contexto de dados (loaders, actions) que o data-router provê. Isso não é o caso até a Fase 13.

O polyfill defensivo garante que, se algum teste futuro usar `createMemoryRouter`, o `AbortSignal` nativo (não o do undici) será usado, evitando o brand-check error.

---

## Estado de `buildTestApp` quanto a migrations

`TestDataSource` é configurado com globs:
```ts
entities: ['src/infra/database/entities/**/*.{ts,js}'],
migrations: ['src/infra/database/migrations/**/*.{ts,js}'],
```

Com as pastas ainda **vazias** (entidades/migrations chegam na Fase 6), `setupTestDatabase()` conecta em schema vazio, `runMigrations()` é no-op, e retorna `DataSource` inicializado. O `buildTestApp()` sobe o app real (`/health` respondeu 200).

Quando a Fase 6 adicionar entidades e migrations, `TestDataSource` as descobrirá automaticamente via glob — **sem edição posterior do código de test infra**.

---

## Concern para fases seguintes

**MySQL local (Homebrew) vs Docker:** na máquina de dev, o MySQL local (Homebrew, PID 1524) estava na porta 3306 (IPv4), interceptando conexões de `127.0.0.1:3306` antes do Docker. Solução: `TEST_DB_HOST` default mudado para `::1` (IPv6 loopback), que o Docker captura. Em CI/Linux onde não há MySQL local, `127.0.0.1` funciona; `::1` também funciona se IPv6 habilitado (padrão).

Variáveis de ambiente para integração local:
```
TEST_DB_HOST=::1  (default)
TEST_DB_USER=app
TEST_DB_PASSWORD=secret
TEST_DB_NAME=marketplace_test
```

Requer `docker compose up -d mysql` antes de rodar testes de integração.
