# Fase 12 — Observabilidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Instrumentar o backend com métricas Prometheus (prom-client, HTTP + negócio, endpoint `/metrics`), captura de erros no Sentry integrada ao error handler global, e dashboards Grafana provisionados (datasource + JSON), reutilizando o scrape Prometheus já declarado no compose da fase 2.

**Architecture:** Um plugin Fastify (`metricsPlugin`) registra um `Registry` prom-client global, coleta métricas default e um histograma de duração HTTP via hooks `onRequest`/`onResponse`, e expõe `/metrics`. Contadores de negócio são incrementados pelos módulos existentes via helpers. Sentry é inicializado antes do `buildApp` e o error handler global (fase 4) passa a chamar `captureException` para erros não-operacionais. Grafana recebe datasource Prometheus e dashboards provisionados por arquivos montados no container.

**Tech Stack:** Fastify 5, prom-client `^15.1.3`, @sentry/node `^8.28`, Prometheus + Grafana (Docker Compose fase 2), Vitest.

## Global Constraints

- Node.js `>=20`. TypeScript strict.
- **Sem comentários no código.**
- **Inglês** em variáveis/funções/arquivos. Docs/commits em pt-BR.
- Não adicionar deps fora da spec §2 (prom-client e @sentry/node já listados).
- ESLint + Prettier antes de commit.
- Campos Zod expostos via API: `.describe()` + `.openapi()`; ENUM via `z.enum`.
- Commits: conventional commits pt-BR, nunca marcar IA.
- Test infra antes do código; unit sem infra externa.

---

## Contratos consumidos (fases 2-11, não redefinir)

- `buildApp(): FastifyInstance` (fase 3) — ponto de registro de plugins.
- Error handler global (fase 4) em `backend/src/shared/error-handler.ts` — serializa `AppError` para `{ error: { code, message, details? } }`.
- `AppError` e subclasses (fase 4).
- `env` tipado (fase 1) em `backend/src/config/env.ts` — acrescentaremos `SENTRY_DSN`, `SENTRY_ENVIRONMENT`.
- Docker Compose (fase 2) com serviços `prometheus` e `grafana`; `infra/prometheus/prometheus.yml` já faz scrape de `app:3000/metrics`.
- `server.ts` (fase 3) — bootstrap onde Sentry inicializa antes de tudo.

### Contratos produzidos nesta fase

- `metricsPlugin(app: FastifyInstance)` — registra `/metrics` e hooks HTTP.
- `metricsRegistry: Registry` e `businessMetrics` (contadores nomeados) em `backend/src/observability/metrics.ts`.
- `initSentry(): void` e `captureError(err: unknown): void` em `backend/src/observability/sentry.ts`.

---

## Estrutura de arquivos

```
backend/src/observability/
  metrics.ts              registry + métricas HTTP/negócio
  metrics.plugin.ts       plugin Fastify (/metrics + hooks)
  metrics.plugin.test.ts
  metrics.test.ts
  sentry.ts               init + captureError
  sentry.test.ts
backend/src/config/env.ts (modificar)
backend/src/shared/error-handler.ts (modificar)
backend/src/server.ts (modificar)
infra/prometheus/prometheus.yml (referência fase 2)
infra/grafana/provisioning/datasources/prometheus.yml
infra/grafana/provisioning/dashboards/dashboards.yml
infra/grafana/dashboards/marketplace-overview.json
docker-compose.yml (modificar: montar provisioning do Grafana)
```

---

## Task 1: Registry prom-client + métricas HTTP e de negócio

**Files:**
- Create: `backend/src/observability/metrics.ts`
- Test: `backend/src/observability/metrics.test.ts`

**Interfaces:**
- Consumes: `prom-client` (`Registry`, `Histogram`, `Counter`, `collectDefaultMetrics`).
- Produces: `metricsRegistry: Registry`; `httpRequestDuration: Histogram`; `businessMetrics = { demandsCreated, quotesCreated, contractsSigned, paymentsProcessed, reviewsCreated, notificationsSent }` (todos `Counter`); `observeHttp(method, route, statusCode, durationSeconds): void`.

- [ ] **Step 1: Escrever teste unit falhando**

`backend/src/observability/metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { metricsRegistry, businessMetrics, observeHttp } from './metrics';

describe('metrics registry', () => {
  it('expõe métricas default e o histograma HTTP', async () => {
    observeHttp('GET', '/health', 200, 0.01);
    const output = await metricsRegistry.metrics();
    expect(output).toContain('http_request_duration_seconds');
    expect(output).toContain('process_cpu_user_seconds_total');
  });

  it('incrementa contador de negócio', async () => {
    businessMetrics.demandsCreated.inc();
    const output = await metricsRegistry.metrics();
    expect(output).toMatch(/marketplace_demands_created_total \d+/);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/observability/metrics.test.ts`
Expected: FAIL — `Cannot find module './metrics'`.

- [ ] **Step 3: Implementar o registry e as métricas**

`backend/src/observability/metrics.ts`:
```ts
import { Registry, Histogram, Counter, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

function counter(name: string, help: string): Counter {
  return new Counter({ name, help, registers: [metricsRegistry] });
}

export const businessMetrics = {
  demandsCreated: counter('marketplace_demands_created_total', 'Demandas criadas'),
  quotesCreated: counter('marketplace_quotes_created_total', 'Orçamentos enviados'),
  contractsSigned: counter('marketplace_contracts_signed_total', 'Contratos assinados'),
  paymentsProcessed: counter('marketplace_payments_processed_total', 'Pagamentos processados'),
  reviewsCreated: counter('marketplace_reviews_created_total', 'Avaliações criadas'),
  notificationsSent: counter('marketplace_notifications_sent_total', 'Notificações entregues'),
};

export function observeHttp(method: string, route: string, statusCode: number, durationSeconds: number): void {
  httpRequestDuration.observe({ method, route, status_code: String(statusCode) }, durationSeconds);
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/observability/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Instrumentar módulos de negócio existentes**

Adicionar `businessMetrics.demandsCreated.inc()` ao final do sucesso em `demand.service.ts`, `businessMetrics.quotesCreated.inc()` em `quote.service.ts`, `businessMetrics.contractsSigned.inc()` em `contract.service.ts` (na assinatura), `businessMetrics.paymentsProcessed.inc()` em `payment.service.ts`, `businessMetrics.reviewsCreated.inc()` em `review.service.ts` (após `save`), e `businessMetrics.notificationsSent.inc()` no `processNotificationJob` do `notification.worker.ts` após persistir. Cada incremento é uma linha antes do `return`, importando `businessMetrics` de `../../observability/metrics`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/observability/metrics.ts backend/src/modules
git commit -m "feat(observability): registry prom-client com métricas HTTP e de negócio"
```

---

## Task 2: Plugin Fastify de métricas (/metrics + hooks HTTP)

**Files:**
- Create: `backend/src/observability/metrics.plugin.ts`
- Test: `backend/src/observability/metrics.plugin.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `metricsRegistry`, `observeHttp` (Task 1); Fastify hooks.
- Produces: `metricsPlugin(app: FastifyInstance): Promise<void>` — expõe `GET /metrics` (content-type `text/plain`) e mede duração via `onRequest`/`onResponse`.

- [ ] **Step 1: Escrever teste de integração falhando**

`backend/src/observability/metrics.plugin.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { metricsPlugin } from './metrics.plugin';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(metricsPlugin);
  app.get('/ping', async () => ({ ok: true }));
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('metricsPlugin', () => {
  it('expõe /metrics em texto Prometheus', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('http_request_duration_seconds');
  });

  it('registra duração após servir uma rota', async () => {
    await app.inject({ method: 'GET', url: '/ping' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toContain('route="/ping"');
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/observability/metrics.plugin.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar o plugin**

`backend/src/observability/metrics.plugin.ts`:
```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { metricsRegistry, observeHttp } from './metrics';

const START_KEY = 'metricsStart';

export async function metricsPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as FastifyRequest & { [START_KEY]?: bigint })[START_KEY] = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const start = (request as FastifyRequest & { [START_KEY]?: bigint })[START_KEY];
    if (start === undefined) {
      return;
    }
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = request.routeOptions?.url ?? request.url;
    observeHttp(request.method, route, reply.statusCode, durationSeconds);
  });

  app.get('/metrics', { schema: { hide: true } }, async (_request, reply) => {
    reply.header('content-type', metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/observability/metrics.plugin.test.ts`
Expected: PASS.

- [ ] **Step 5: Registrar o plugin no app**

Em `backend/src/app.ts`, dentro de `buildApp`, registrar antes das rotas de módulo: `await app.register(metricsPlugin)`. Importar `metricsPlugin` de `./observability/metrics.plugin`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/observability/metrics.plugin.ts backend/src/app.ts
git commit -m "feat(observability): plugin /metrics com histograma de duração HTTP"
```

---

## Task 3: Sentry — init + captura integrada ao error handler

**Files:**
- Create: `backend/src/observability/sentry.ts`
- Test: `backend/src/observability/sentry.test.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/shared/error-handler.ts`
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `@sentry/node`; `env` (fase 1); error handler global (fase 4); `AppError` (fase 4).
- Produces: `initSentry(): void`; `captureError(err: unknown): void` (só captura erros não-operacionais / statusCode >= 500).

- [ ] **Step 1: Adicionar variáveis de ambiente**

Em `backend/src/config/env.ts`, acrescentar ao schema Zod de env:
```ts
SENTRY_DSN: z.string().url().optional(),
SENTRY_ENVIRONMENT: z.string().default('development'),
```

- [ ] **Step 2: Escrever teste unit falhando**

`backend/src/observability/sentry.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureException = vi.fn();
const init = vi.fn();
vi.mock('@sentry/node', () => ({ init: (...a: unknown[]) => init(...a), captureException: (...a: unknown[]) => captureException(...a) }));

import { captureError } from './sentry';
import { NotFoundError } from '../shared/errors';

describe('captureError', () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it('não captura AppError operacional (4xx)', () => {
    captureError(new NotFoundError('x'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('captura erro inesperado', () => {
    captureError(new Error('boom'));
    expect(captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/observability/sentry.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar sentry.ts**

`backend/src/observability/sentry.ts`:
```ts
import * as Sentry from '@sentry/node';
import { env } from '../config/env';
import { AppError } from '../shared/errors';

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
  });
}

export function captureError(err: unknown): void {
  if (err instanceof AppError && err.statusCode < 500) {
    return;
  }
  Sentry.captureException(err);
}
```

- [ ] **Step 5: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/observability/sentry.test.ts`
Expected: PASS.

- [ ] **Step 6: Integrar ao error handler global**

Em `backend/src/shared/error-handler.ts`, dentro da função de tratamento, antes de serializar a resposta, adicionar `captureError(error)`. Importar `captureError` de `../observability/sentry`. Manter a serialização existente `{ error: { code, message, details? } }` intacta.

- [ ] **Step 7: Inicializar no bootstrap**

Em `backend/src/server.ts`, como primeira instrução de `main()` (antes de `buildApp`), chamar `initSentry()`. Importar de `./observability/sentry`.

- [ ] **Step 8: Escrever teste de integração do handler (erro 500 é capturado)**

Adicionar em `backend/src/shared/error-handler.test.ts` (arquivo criado na fase 4) um caso:
```ts
import { describe, it, expect, vi } from 'vitest';

const captureError = vi.fn();
vi.mock('../observability/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

import { buildApp } from '../app';

describe('error handler + sentry', () => {
  it('captura erro 500 e responde envelope padrão', async () => {
    const app = await buildApp();
    app.get('/boom', async () => {
      throw new Error('boom');
    });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toHaveProperty('error');
    expect(captureError).toHaveBeenCalled();
    await app.close();
  });
});
```

- [ ] **Step 9: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/shared/error-handler.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/observability/sentry.ts backend/src/config/env.ts backend/src/shared/error-handler.ts backend/src/server.ts backend/src/shared/error-handler.test.ts
git commit -m "feat(observability): captura de erros no Sentry integrada ao error handler"
```

---

## Task 4: Prometheus scrape + provisionamento de Grafana (datasource + dashboard)

Prometheus e Grafana já existem no compose da fase 2. Aqui garantimos o scrape de `/metrics` e provisionamos datasource + dashboard JSON no Grafana.

**Files:**
- Modify: `infra/prometheus/prometheus.yml` (confirmar/ajustar job `app`)
- Create: `infra/grafana/provisioning/datasources/prometheus.yml`
- Create: `infra/grafana/provisioning/dashboards/dashboards.yml`
- Create: `infra/grafana/dashboards/marketplace-overview.json`
- Modify: `docker-compose.yml` (montar volumes de provisioning)
- Test: `infra/grafana/dashboards/marketplace-overview.test.ts` (validação de JSON)

**Interfaces:**
- Consumes: métricas expostas em `app:3000/metrics` (Tasks 1-2).
- Produces: dashboard "Marketplace Overview" provisionado; datasource Prometheus default.

- [ ] **Step 1: Confirmar o scrape do Prometheus**

Garantir que `infra/prometheus/prometheus.yml` contém:
```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: marketplace-app
    metrics_path: /metrics
    static_configs:
      - targets: ['app:3000']
```

- [ ] **Step 2: Criar o datasource do Grafana**

`infra/grafana/provisioning/datasources/prometheus.yml`:
```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

- [ ] **Step 3: Criar o provider de dashboards**

`infra/grafana/provisioning/dashboards/dashboards.yml`:
```yaml
apiVersion: 1
providers:
  - name: marketplace
    orgId: 1
    folder: Marketplace
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

- [ ] **Step 4: Escrever teste de validação do dashboard JSON**

`infra/grafana/dashboards/marketplace-overview.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('marketplace-overview dashboard', () => {
  it('é JSON válido com os painéis esperados', () => {
    const raw = readFileSync(join(__dirname, 'marketplace-overview.json'), 'utf-8');
    const dashboard = JSON.parse(raw);
    expect(dashboard.title).toBe('Marketplace Overview');
    const titles = dashboard.panels.map((p: { title: string }) => p.title);
    expect(titles).toContain('HTTP p95 latency');
    expect(titles).toContain('Demands created');
    const exprs = dashboard.panels.flatMap((p: { targets?: { expr: string }[] }) => (p.targets ?? []).map((t) => t.expr));
    expect(exprs.join(' ')).toContain('http_request_duration_seconds_bucket');
    expect(exprs.join(' ')).toContain('marketplace_demands_created_total');
  });
});
```

- [ ] **Step 5: Rodar e confirmar falha**

Run: `cd backend && npx vitest run ../infra/grafana/dashboards/marketplace-overview.test.ts`
Expected: FAIL — arquivo JSON inexistente.

- [ ] **Step 6: Criar o dashboard JSON**

`infra/grafana/dashboards/marketplace-overview.json`:
```json
{
  "uid": "marketplace-overview",
  "title": "Marketplace Overview",
  "schemaVersion": 39,
  "version": 1,
  "refresh": "30s",
  "time": { "from": "now-6h", "to": "now" },
  "panels": [
    {
      "id": 1,
      "title": "HTTP p95 latency",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "refId": "A",
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))"
        }
      ]
    },
    {
      "id": 2,
      "title": "HTTP request rate",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "refId": "A",
          "expr": "sum(rate(http_request_duration_seconds_count[5m])) by (status_code)"
        }
      ]
    },
    {
      "id": 3,
      "title": "Demands created",
      "type": "stat",
      "gridPos": { "h": 8, "w": 6, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [{ "refId": "A", "expr": "sum(marketplace_demands_created_total)" }]
    },
    {
      "id": 4,
      "title": "Contracts signed",
      "type": "stat",
      "gridPos": { "h": 8, "w": 6, "x": 6, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [{ "refId": "A", "expr": "sum(marketplace_contracts_signed_total)" }]
    },
    {
      "id": 5,
      "title": "Payments processed",
      "type": "stat",
      "gridPos": { "h": 8, "w": 6, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [{ "refId": "A", "expr": "sum(marketplace_payments_processed_total)" }]
    },
    {
      "id": 6,
      "title": "Notifications sent",
      "type": "stat",
      "gridPos": { "h": 8, "w": 6, "x": 18, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [{ "refId": "A", "expr": "sum(marketplace_notifications_sent_total)" }]
    }
  ]
}
```

- [ ] **Step 7: Rodar e confirmar verde**

Run: `cd backend && npx vitest run ../infra/grafana/dashboards/marketplace-overview.test.ts`
Expected: PASS.

- [ ] **Step 8: Montar o provisioning no compose**

Em `docker-compose.yml`, no serviço `grafana`, acrescentar volumes:
```yaml
    volumes:
      - ./infra/grafana/provisioning:/etc/grafana/provisioning
      - ./infra/grafana/dashboards:/var/lib/grafana/dashboards
```

- [ ] **Step 9: Validar o compose e o boot do Grafana**

Run: `docker compose config`
Expected: sem erros de sintaxe; volumes do Grafana presentes.

- [ ] **Step 10: Commit**

```bash
git add infra/prometheus/prometheus.yml infra/grafana docker-compose.yml
git commit -m "feat(observability): provisiona datasource e dashboard Grafana do marketplace"
```

---

## Self-Review

**Spec coverage (§fase 12):**
- prom-client (métricas HTTP + negócio + /metrics) → Tasks 1-2. ✅
- Sentry (@sentry/node init + captura no error handler) → Task 3. ✅
- Prometheus scrape (compose fase 2, referenciado/confirmado) → Task 4 Step 1. ✅
- Dashboards Grafana provisionados (JSON + datasource) → Task 4. ✅

**Placeholder scan:** Sem TBD/TODO. Todo passo de código traz código completo; YAML e JSON completos.

**Type consistency:** Nomes de métricas idênticos entre `metrics.ts` (`marketplace_demands_created_total`, `http_request_duration_seconds`) e as queries PromQL do dashboard e do teste de validação. `captureError` recebe `unknown` e é usado assim no error handler. `env.SENTRY_DSN` opcional casa com o guard em `initSentry`.

**Dependência com fase 11:** `businessMetrics.reviewsCreated`/`notificationsSent` incrementados em módulos entregues na fase 11 (Task 1 Step 5) — ordem respeitada (fase 12 após 11).
