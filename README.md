# Services Marketplace

Marketplace full-stack de serviços (clientes, profissionais e admin): demandas, orçamentos, contratos, pagamentos com carteira interna, chat em tempo real, notificações assíncronas, avaliações, disputas e observabilidade completa.

Monorepo com dois workspaces npm:

- **`backend/`** — API Fastify 5 (monolito modular), TypeORM 0.3 + MySQL 8, Redis + BullMQ, Socket.IO, JWT, Zod como fonte única de validação/OpenAPI.
- **`frontend/`** — React 19 + Vite 6, React Router 6, TanStack Query 5, Zustand 5, Tailwind 3, Playwright.

Orquestração via Docker Compose: app, frontend (Nginx), MySQL, Redis, Prometheus, Grafana.

---

## Índice

1. [Arquitetura](#arquitetura)
2. [Instalação e execução local](#instalação-e-execução-local)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Scripts disponíveis](#scripts-disponíveis)
5. [Banco de dados e migrations](#banco-de-dados-e-migrations)
6. [Credenciais iniciais](#credenciais-iniciais)
7. [Testes](#testes)
8. [Pipelines CI/CD](#pipelines-cicd)
9. [Observabilidade: Prometheus + Grafana + Sentry](#observabilidade-prometheus--grafana--sentry)
10. [Segurança: Helmet, CORS, rate limit, JWT](#segurança-helmet-cors-rate-limit-jwt)
11. [Documentação da API (Swagger/OpenAPI)](#documentação-da-api-swaggeropenapi)
12. [Domínio funcional (módulos do backend)](#domínio-funcional-módulos-do-backend)
13. [Frontend](#frontend)
14. [Docker Compose e produção](#docker-compose-e-produção)

---

## Arquitetura

```
Projeto-TDS/
├── backend/            Fastify 5, TypeORM, Redis/BullMQ, Socket.IO
│   ├── src/modules/    ~26 módulos de domínio (auth, contract, wallet, chat...)
│   ├── src/infra/      data-source, migrations, entities, queues
│   ├── src/shared/     schemas Zod, security, middlewares
│   ├── src/observability/  Prometheus (prom-client) + Sentry
│   └── src/config/     validação de env com Zod
├── frontend/            React 19 + Vite, feature-sliced (auth, wallet, contracts...)
│   └── e2e/             Playwright (client/professional/admin/auth/flows)
├── infra/
│   ├── prometheus/      prometheus.yml (scrape config)
│   └── grafana/         provisioning + dashboard marketplace-overview.json
├── docker-compose.yml   app + frontend + mysql + redis + prometheus + grafana
└── .github/workflows/   ci.yml (lint/typecheck/test/openapi/build) + cd.yml (imagens ghcr)
```

Requisição HTTP em produção (via `docker-compose`): navegador → **Nginx** (`frontend`, porta 8080) → proxy `/api/*` e `/socket.io/*` → **app** (Fastify, porta 3000) → **MySQL**/**Redis**.

---

## Instalação e execução local

### Pré-requisitos

- Node.js `>= 20`
- Docker + Docker Compose (recomendado para banco/infra)
- npm (o projeto usa **npm workspaces**, não trocar por yarn/pnpm)

### Passo a passo (infra via Docker, app rodando local)

```bash
git clone <repo>
cd Projeto-TDS

# 1. instala dependências dos dois workspaces de uma vez
npm install

# 2. configura env do backend
cp backend/.env.example backend/.env
# edite backend/.env se necessário (segredos JWT, etc.)

# 3. sobe apenas infra (mysql, redis, prometheus, grafana)
docker compose up -d mysql redis prometheus grafana

# 4. roda as migrations
npm run migration:run --workspace @marketplace/backend

# 5. inicia a API em modo watch
npm run dev --workspace @marketplace/backend
# API em http://localhost:3000, docs em http://localhost:3000/docs

# 6. em outro terminal, inicia o frontend
npm run dev --workspace @marketplace/frontend
# frontend em http://localhost:5173
```

### Passo a passo (tudo em Docker)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Isso builda e sobe **todos** os serviços: `app` (backend), `frontend` (Nginx servindo o build estático + proxy reverso), `mysql`, `redis`, `prometheus`, `grafana`.

| Serviço    | URL                              |
|------------|-----------------------------------|
| Frontend   | http://localhost:8080             |
| Backend API| http://localhost:3000             |
| Swagger UI | http://localhost:3000/docs        |
| Métricas   | http://localhost:3000/metrics     |
| Prometheus | http://localhost:9090             |
| Grafana    | http://localhost:3001 (admin/admin por padrão) |
| MySQL      | localhost:3306                    |
| Redis      | localhost:6379                    |

O backend só sobe depois que os healthchecks de `mysql` e `redis` passam (`depends_on: condition: service_healthy`). O container `app` expõe seu próprio healthcheck em `GET /api/health`.

---

## Variáveis de ambiente

Arquivo `backend/.env` (baseado em `backend/.env.example`), validado por `src/config/env.ts` (Zod). Se algo estiver inválido ou faltando, a app **não sobe** — falha rápido com mensagem clara.

| Variável | Default | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | Porta HTTP do Fastify |
| `HOST` | `0.0.0.0` | Host de bind |
| `CORS_ORIGIN` | `*` | Origem permitida pelo `@fastify/cors` |
| `DATABASE_HOST` / `PORT` / `USER` / `PASSWORD` / `NAME` | — | Conexão MySQL (obrigatórios, sem default de host) |
| `REDIS_HOST` | `localhost` | Host do Redis (sessões de fila BullMQ) |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `JWT_ACCESS_SECRET` | — | **Obrigatório**, mínimo 32 chars |
| `JWT_REFRESH_SECRET` | — | **Obrigatório**, mínimo 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | TTL do access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | TTL do refresh token |
| `SENTRY_DSN` | — (opcional) | Se ausente, Sentry fica desativado sem erro |
| `SENTRY_ENVIRONMENT` | `development` | Tag de ambiente enviada ao Sentry |
| `RATE_LIMIT_MAX` | `100` | Requisições por janela, por IP (global) |
| `RATE_LIMIT_WINDOW` | `1 minute` | Janela do rate limit (sintaxe do `@fastify/rate-limit`) |
| `UPLOAD_DIR` | `./uploads` | Diretório onde imagens enviadas são salvas (resolvido a partir do cwd do processo; em Docker vira `/app/uploads`, montado no volume `uploads_data`) |
| `UPLOAD_MAX_SIZE_MB` | `5` | Tamanho máximo por arquivo, em MB |
| `UPLOAD_ALLOWED_MIME` | `image/jpeg,image/png,image/webp` | Tipos MIME aceitos, detectados pelos magic bytes reais do arquivo (nunca pelo `Content-Type` enviado pelo cliente) |

**Hardening de produção:** em `NODE_ENV=production`, o schema rejeita qualquer `JWT_*_SECRET` que contenha os padrões `change-me`, `placeholder` ou `secret` (regex `WEAK_SECRET_PATTERN`) — isso impede subir produção com o segredo de exemplo do `.env.example` por acidente.

---

## Scripts disponíveis

Raiz (roda nos dois workspaces via `--workspaces`):

```bash
npm run lint        # eslint em backend e frontend
npm run typecheck    # tsc --noEmit nos dois
npm run build        # build de produção dos dois
npm run test         # vitest run nos dois
```

Backend (`--workspace @marketplace/backend`):

```bash
npm run dev                # tsx watch src/server.ts
npm run build               # tsc -p tsconfig.json
npm run start                # node dist/server.js (produção)
npm run lint / lint:fix
npm run typecheck
npm run test / test:watch / test:coverage
npm run migration:run
npm run migration:revert
npm run migration:generate
npm run docs:export          # gera backend/openapi.json a partir do app real
```

Frontend (`--workspace @marketplace/frontend`):

```bash
npm run dev            # vite
npm run build           # tsc --noEmit && vite build
npm run preview
npm run test / test:coverage
npm run e2e             # playwright test (todos)
npm run e2e:clients / e2e:professionals / e2e:admins / e2e:auth / e2e:flows
npm run e2e:headed / e2e:ui
```

---

## Banco de dados e migrations

Versionamento de schema via **migrations do TypeORM 0.3** — equivalente ao papel do Flyway/Liquibase: cada mudança de schema é um arquivo versionado e ordenado (timestamp no nome + no `Migration` interface), com métodos `up()`/`down()` explícitos, aplicado/revertido via CLI, nunca por sincronização automática (`synchronize: false` sempre, em todo ambiente).

- `src/infra/database/data-source.ts` é o `DataSource` de runtime; `src/test/database.ts` tem um `TestDataSource` isolado para os testes de integração.
- Migrations em `backend/src/infra/database/migrations/*.ts`, nomeadas `<timestamp>-<Nome>.ts`, registradas em `migrations/index.ts` e executadas nessa ordem.
- **13 migrations** aplicadas em sequência, cobrindo todo o schema:

  | # | Migration | Escopo |
  |---|---|---|
  | 1 | `AuthAccount` | usuários, contas, autenticação |
  | 2 | `Addresses` | endereços |
  | 3 | `ProfessionalProfile` | perfil profissional |
  | 4 | `Catalog` | categorias/serviços |
  | 5 | `Demands` | demandas |
  | 6 | `Quotes` | orçamentos |
  | 7 | `Contracts` | contratos + disputas |
  | 8 | `WalletPayment` | carteira, pagamento, taxas, estornos, saques |
  | 9 | `Social` | avaliações, favoritos |
  | 10 | `Communication` | notificação, chat |
  | 11 | `AuditLogs` | auditoria/admin |
  | 12 | `UserPreferenceLocation` | preferências de localização do usuário |
  | 13 | `DemandAddress` | vínculo demanda ⇄ endereço |

- Cada migration só sobe/desce a própria mudança (`up`/`down` simétricos) — permite avançar ou reverter o schema uma versão de cada vez, sem depender de dump/restore.

```bash
npm run migration:generate --workspace @marketplace/backend  # gera a partir do diff de entities
npm run migration:run --workspace @marketplace/backend        # aplica todas as migrations pendentes, em ordem
npm run migration:revert --workspace @marketplace/backend      # reverte a última migration aplicada
```

Em produção/CI, `migration:run` é o único caminho pra atualizar o schema — nenhum ambiente usa `synchronize: true` ou aplica DDL manual.

Em teste, o banco (`marketplace_test`) é limpo entre suites com `TRUNCATE` de todas as tabelas (FK checks desligados temporariamente) — ver `truncateAll()` em `src/test/database.ts`.

---

## Credenciais iniciais

Não há usuário pré-cadastrado (seed) rodando automaticamente na inicialização — a base sobe vazia após as migrations.

- **Registro de usuário comum (cliente/profissional):** feito via `POST /api/auth/register` (tela de cadastro do frontend). Não existe usuário padrão.
- **Usuário admin:** criado manualmente com o script `backend/src/scripts/seed-e2e-admin.ts` (usado também pelos testes e2e):

  ```bash
  npx tsx backend/src/scripts/seed-e2e-admin.ts <email> <senha> "<nome>" <telefone>
  # ex.: npx tsx backend/src/scripts/seed-e2e-admin.ts admin@marketplace.local Admin123! "Admin" "11999999999"
  ```

  O script cria (ou recria, se já existir) um `User` com `role: 'admin'`, senha hasheada com bcrypt. Login pelo endpoint normal de auth (`POST /api/auth/login`) com o email/senha informados.
- **MySQL (`backend/.env`):** credenciais default de `.env.example` — usuário `app`, senha `secret`, banco `marketplace` (`DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME`). Trocar em produção.
- **Grafana:** `admin` / `admin` por padrão (`GRAFANA_ADMIN_PASSWORD`), ver seção [Observabilidade](#observabilidade-prometheus--grafana--sentry).

---

## Testes

- **Backend:** Vitest (`vitest.config.ts`), ambiente `node`, `fileParallelism: false` — os arquivos de teste rodam **em série** porque compartilham a mesma instância de MySQL/Redis de teste; rodar em paralelo causa corrida em `TRUNCATE`/inserts e falhas intermitentes de FK.
- **Frontend:** Vitest + Testing Library, ambiente `jsdom`.
- **E2E:** Playwright, specs separadas por perfil (`admins`, `clients`, `professionals`, `auth`, `flows`) mais smoke test.

Rodar tudo:

```bash
npm run test --workspaces
```

Cada workspace tem seu **próprio** `vitest.config.ts` (setup files, environment, include patterns diferentes). Não existe config de vitest na raiz — rodar `npx vitest run` direto na raiz do monorepo ignora as duas configs e quebra (sem jsdom no frontend, sem env de teste no backend). Sempre usar os scripts `npm run test` de cada workspace (ou `--workspaces` na raiz).

Coverage:

```bash
npm run test:coverage --workspace @marketplace/backend
npm run test:coverage --workspace @marketplace/frontend
```

---

## Pipelines CI/CD

### CI (`.github/workflows/ci.yml`) — em toda push/PR para `main`

Quatro jobs, com dependências:

1. **`quality`** — `npm ci` → `lint` → `typecheck` (roda primeiro, bloqueia o resto se falhar).
2. **`test`** (depende de `quality`) — sobe serviços `mysql:8.0` e `redis:7-alpine` como *service containers* do runner, roda migrations e depois `test` do backend e do frontend.
3. **`openapi`** (depende de `test`) — roda migrations de novo, executa `docs:export` e sobe `backend/openapi.json` como artifact do workflow (falha o job se o arquivo não for gerado).
4. **`build`** (depende de `quality`, em paralelo com `test`/`openapi`) — `npm run build --workspaces`, valida que o build de produção dos dois workspaces compila.

`concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true` — pushes novos na mesma branch cancelam o CI anterior em andamento.

### CD (`.github/workflows/cd.yml`) — dispara quando o CI termina com sucesso na `main`

- Trigger: `workflow_run` do workflow `CI`, `types: [completed]`, com guarda `if: conclusion == 'success'`.
- Build multi-plataforma via Buildx com cache do GitHub Actions (`cache-from/to: type=gha`).
- Publica duas imagens no GHCR:
  - `ghcr.io/<owner>/marketplace-backend`
  - `ghcr.io/<owner>/marketplace-frontend`
- Tags: `sha` (commit) + `latest`.
- Autenticação via `GITHUB_TOKEN` (permission `packages: write`), sem segredo externo.

Ou seja: **CI verde na main é o único gate para build/publish de imagem** — nada de imagem publicada de branch quebrada ou de PR.

---

## Observabilidade: Prometheus + Grafana + Sentry

### Métricas (Prometheus)

- `@fastify/` não expõe métricas nativamente — feito à mão em `src/observability/metrics.ts` com `prom-client`.
- `collectDefaultMetrics()` — métricas padrão de processo Node (event loop, heap, GC, etc).
- `http_request_duration_seconds` — histograma por `method`, `route`, `status_code` (buckets de 5ms a 5s), populado pelo `metricsPlugin` em toda requisição.
- Contadores de negócio (`marketplace_*_total`): `demandsCreated`, `quotesCreated`, `contractsSigned`, `paymentsProcessed`, `reviewsCreated`, `notificationsSent`.
- Endpoint: `GET /metrics` no próprio app Fastify (formato Prometheus text exposition).
- `infra/prometheus/prometheus.yml` faz scrape a cada 15s de dois targets: o próprio Prometheus (`localhost:9090`) e `app:3000/metrics` (nome de serviço do compose).

### Dashboards (Grafana)

- Provisionamento automático via `infra/grafana/provisioning/` — datasource Prometheus (`provisioning/datasources/prometheus.yml`) e o dashboard `marketplace-overview.json` (`provisioning/dashboards/dashboards.yml`) já aparecem prontos no primeiro boot, sem clique manual.
- Acesso: http://localhost:3001, login `admin` / senha em `GRAFANA_ADMIN_PASSWORD` (default `admin`, **trocar em produção**).
- O JSON do dashboard tem um teste próprio (`marketplace-overview.test.ts`) que garante que ele não corrompe/perde painéis entre edições.

### Erros (Sentry)

- `src/observability/sentry.ts`, inicializado em `initSentry()` no boot do `server.ts`.
- Totalmente opcional: sem `SENTRY_DSN` no env, a inicialização é no-op — não quebra o boot em dev/teste.
- Tag de ambiente configurável via `SENTRY_ENVIRONMENT`.

---

## Segurança: Helmet, CORS, rate limit, JWT

Tudo registrado em `src/app.ts`, nesta ordem, antes de qualquer rota:

1. **`@fastify/helmet`**
   - CSP restritiva: `default-src 'self'`; scripts/estilos inline liberados (necessário pro Swagger UI); imagens de `'self'`, `data:` e `validator.swagger.io`; `object-src 'none'`.
   - `upgradeInsecureRequests` habilitado.
   - HSTS: `max-age=15552000` (~180 dias), `includeSubDomains`, `preload`.
   - `frameguard: deny` (bloqueia embed em iframe — anti-clickjacking).
   - `referrerPolicy: no-referrer`.
   - `crossOriginEmbedderPolicy: false` (necessário para o Swagger UI carregar assets externos).

2. **`@fastify/cors`** — origem controlada por `CORS_ORIGIN` (env), `credentials: true` (permite cookies/Authorization cross-origin quando a origem é explícita).

3. **`@fastify/rate-limit`** — limite **global**, por IP (`keyGenerator: request.ip`), `max`/`timeWindow` vindos de `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW`. Não há limites diferenciados por rota — é um teto único (100 req/min por IP por padrão) aplicado a toda a API, incluindo login/registro. Em produção, ajustar via env conforme tráfego esperado.

4. **`@fastify/compress`** — compressão de resposta habilitada globalmente (`global: true`).

5. **Autenticação JWT** (`authPlugin`, `shared/security/token.ts`) — access + refresh token, `bcrypt` para hash de senha, secrets validados com mínimo de 32 caracteres e checagem anti-placeholder em produção (ver seção de env).

6. **`errorHandlerPlugin`** — envelope de erro padronizado para toda a API (nunca expõe stack trace/erro interno cru ao client).

7. **`requestIdPlugin`** — todo request recebe um ID de correlação, usado em logs e disponível para debug distribuído.

---

## Documentação da API (Swagger/OpenAPI)

- Especificação gerada dinamicamente a partir dos schemas Zod das rotas (`fastify-type-provider-zod` + `zod-openapi`), **não é escrita manualmente**.
- UI interativa: `GET /docs` (Swagger UI), montada pelo app em qualquer ambiente.
- Segurança documentada: `bearerAuth` (HTTP Bearer JWT) já configurado no `securitySchemes` do documento OpenAPI.
- Export estático para consumo externo (Postman, geração de client, etc.):

```bash
npm run docs:export --workspace @marketplace/backend
# gera backend/openapi.json
```

- O CI roda esse export a cada push na main e sobe o artifact — garante que o contrato de API nunca fica fora de sincronia com o código merged.
- Teste próprio (`src/test/openapi/*.test.ts`) faz auditoria do schema: nenhuma rota sem `.describe()`, sem exemplo, ou com `z.string()` solto onde deveria ser `z.enum()`.

### Coleção Postman/Insomnia

- `docs/postman_collection.json` — coleção Postman v2.1 com os 119 endpoints da API (pastas `health` e `api`, espelhando os módulos do backend), gerada automaticamente a partir do `openapi.json` via `openapi-to-postmanv2`.
- Importar no Postman: **Import → File → `docs/postman_collection.json`**.
- Importar no Insomnia: **Import → From File**, aceita tanto `docs/postman_collection.json` (formato Postman) quanto `backend/openapi.json` direto (Insomnia lê OpenAPI nativamente).
- Regenerar após mudar rotas/schemas:

  ```bash
  npm run docs:export --workspace @marketplace/backend   # gera backend/openapi.json
  npx openapi-to-postmanv2 -s backend/openapi.json -o docs/postman_collection.json -p
  ```

- Autenticação: a maioria das rotas exige `Authorization: Bearer <access_token>` — logar via `POST /api/auth/login` e setar o token manualmente (ou configurar uma variável de ambiente/collection na tool escolhida).

---

## Domínio funcional (módulos do backend)

Backend organizado em módulos verticais (`src/modules/<nome>/{*.routes,*.service,*.schemas,*.entity}.ts`), registrados sob prefixo `/api` em `app.ts`:

| Módulo | Responsabilidade |
|---|---|
| `auth` | Registro, login, refresh token, verificação de e-mail, reset de senha |
| `user` | Perfil autenticado (`/me`), atualização de dados |
| `address` | Endereços do usuário (CEP, geolocalização) |
| `account` | Configurações de conta, exclusão de conta (LGPD) |
| `catalog` | Categorias e serviços oferecidos na plataforma |
| `professional` | Perfil profissional (headline, bio, valor/hora, raio de atendimento) |
| `availability` | Agenda/disponibilidade do profissional |
| `portfolio` | Itens de portfólio do profissional |
| `search` | Busca de profissionais (filtros, geolocalização) |
| `demand` | Demandas abertas pelo cliente + convites a profissionais |
| `quote` | Orçamentos enviados por profissionais para uma demanda |
| `contract` | Ciclo de vida do contrato (aceite, início, progresso, cancelamento) |
| `dispute` | Abertura de disputa sobre contrato, moderação admin, resolução com outcome |
| `wallet` | Carteira interna de cada usuário (saldo) |
| `payment` | Processamento de pagamento (um por contrato) |
| `fees` | Cálculo de taxa da plataforma sobre pagamentos |
| `refunds` | Estorno de pagamento (total/parcial) |
| `withdrawals` | Saque de saldo da carteira para profissional |
| `review` | Avaliação mútua cliente ⇄ profissional pós-contrato |
| `social` | Favoritar profissionais |
| `upload` | Upload de imagens (multipart, autenticado) — salva em disco com nome UUID, valida tipo pelos magic bytes reais, retorna URL pública servida em `/uploads/*` |
| `notification` | Notificações assíncronas (fila BullMQ + worker dedicado) |
| `chat` | Mensagens em tempo real via Socket.IO (`chat.gateway.ts`) |
| `audit` | Trilha de auditoria de ações administrativas/moderação |
| `admin` | Moderação: suspender usuário, denúncias, disputas, auditoria |
| `health` | `/health` (liveness) e `/health/ready` (readiness) |

**Fila assíncrona (BullMQ + Redis):** notificações são enfileiradas (`notification.queue.ts`) e processadas por um worker dedicado (`notification.worker.ts`), iniciado junto do servidor HTTP em `server.ts` (`startNotificationWorker()`). Autenticação também consulta a fila para envio de e-mails transacionais.

**Tempo real:** `server.ts` monta um `Server` do Socket.IO sobre o mesmo servidor HTTP do Fastify, com o mesmo `CORS_ORIGIN`. O gateway de chat (`chat.gateway.ts`) autentica a conexão com o mesmo `verifyAccessToken` usado nas rotas HTTP — não é um mecanismo de auth paralelo.

---

## Frontend

- React 19 + Vite 6, roteamento com `react-router-dom` 6, estado de servidor via **TanStack Query 5**, estado de cliente via **Zustand 5**, formulários com `react-hook-form` + Zod, HTTP via `axios`, tempo real via `socket.io-client`, estilos com Tailwind 3.
- Organização por feature em `src/features/<nome>` (auth, wallet, contracts, demands, notifications, professional, landing, settings...), espelhando os módulos do backend.
- `ProtectedRoute` guarda rotas que exigem sessão autenticada.
- Testes unitários/componente: Vitest + Testing Library, ambiente `jsdom` (config própria em `frontend/vitest.config.ts` — **diferente** da config do backend).
- E2E com Playwright, split por perfil de usuário (`e2e/clients`, `e2e/professionals`, `e2e/admins`, `e2e/auth`) mais `flows.spec.ts` (fluxos ponta a ponta) e `smoke.spec.ts`.

---

## Docker Compose e produção

`docker-compose.yml` define 6 serviços:

- **`app`** — build de `backend/Dockerfile` (multi-stage: build TS → runtime `node:20-alpine` só com deps de produção). Recebe `DATABASE_HOST=mysql` e `REDIS_HOST=redis` via `environment` (sobrepõe o que estiver no `.env` local), espera `mysql`/`redis` saudáveis, expõe `3000`, healthcheck em `GET /api/health`. Monta o volume `uploads_data:/app/uploads` para persistir imagens enviadas entre restarts do container — armazenamento local; múltiplas réplicas do serviço `app` precisariam de um volume compartilhado (NFS/EFS) ou migração para storage externo (S3/MinIO) para escalar horizontalmente.
- **`frontend`** — build de `frontend/Dockerfile` (multi-stage: build Vite → `nginx:1.27-alpine` servindo estático). `nginx.conf` faz proxy reverso de `/api/*` e `/socket.io/*` (com upgrade de conexão para WebSocket) para `http://app:3000`; todo o resto cai em SPA fallback (`try_files ... /index.html`). Expõe `8080` externamente.
- **`mysql`** — MySQL 8.0, dados persistidos em volume `mysql_data`, healthcheck via `mysqladmin ping`.
- **`redis`** — Redis 7 alpine, volume `redis_data`, healthcheck via `redis-cli ping`.
- **`prometheus`** — monta `infra/prometheus/prometheus.yml` read-only, persiste séries em `prometheus_data`.
- **`grafana`** — provisionamento automático de datasource/dashboard, persiste config/estado em `grafana_data`, senha admin via `GRAFANA_ADMIN_PASSWORD`.

Todos os serviços com `restart: unless-stopped`, exceto `mysql`/`redis` (dependências de infra geridas pelo próprio healthcheck/orquestrador).

### Imagens publicadas

O CD já publica as imagens de produção no GHCR a cada merge verde na `main`:

```bash
docker pull ghcr.io/<owner>/marketplace-backend:latest
docker pull ghcr.io/<owner>/marketplace-frontend:latest
```

Rodar em produção sem buildar localmente: apontar o `docker-compose.yml` para essas imagens (`image:` em vez de `build:`) e fornecer os envs de produção (`JWT_*_SECRET` fortes, `CORS_ORIGIN` restrito ao domínio real, `GRAFANA_ADMIN_PASSWORD` forte, `SENTRY_DSN` configurado).
