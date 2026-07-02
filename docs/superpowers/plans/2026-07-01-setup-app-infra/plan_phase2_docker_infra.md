# Fase 2 — Docker e Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`) syntax para tracking.

**Goal:** Empacotar backend e frontend em imagens Docker multi-stage (builder→production) e orquestrar toda a stack (app, frontend/Nginx, MySQL 8, Redis 7, Prometheus, Grafana) via `docker compose`, com volumes, healthchecks, proxy reverso Nginx (`/api` e `/socket.io`) e scrape do Prometheus.

**Architecture:** Contexto de build é a raiz do monorepo (para respeitar npm workspaces). Backend: `node:20-alpine` builder que roda `tsc`, produção com deps de produção + `dist`. Frontend: builder Vite → `nginx:1.27-alpine` servindo `dist` e fazendo proxy reverso para o serviço `app`. `docker-compose.yml` na raiz sobe infra (MySQL/Redis/Prometheus/Grafana) com healthchecks e volumes nomeados. Prometheus faz scrape de `/api/metrics` do backend.

**Tech Stack:** Docker multi-stage, `node:20-alpine`, `nginx:1.27-alpine`, `mysql:8.0`, `redis:7-alpine`, `prom/prometheus`, `grafana/grafana`, Docker Compose v2.

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

**Nota de ordenação (spec §5 item 7):** o boot do Fastify e o módulo `health` (endpoint `/api/health` e `/api/metrics`) são entregues na **Fase 3**. Portanto nesta fase o serviço `app` compila e a imagem é construída, mas o container `app` só fica *healthy* a partir da Fase 3. A verificação desta fase cobre: build das duas imagens, infra (MySQL/Redis/Prometheus/Grafana) *healthy* e o frontend/Nginx servindo o SPA. O `depends_on` e o `healthcheck` do `app` já ficam definidos para a Fase 3 ligar automaticamente.

---

## File Structure

Raiz:
- `docker-compose.yml` — orquestra `app`, `frontend`, `mysql`, `redis`, `prometheus`, `grafana` + volumes.
- `.dockerignore` — evita copiar `node_modules`/artefatos para o contexto de build.
- `infra/prometheus/prometheus.yml` — config de scrape.

Backend (`backend/`):
- `Dockerfile` — multi-stage builder→production (Node).

Frontend (`frontend/`):
- `Dockerfile` — multi-stage builder(Vite)→production(Nginx).
- `nginx.conf` — serve SPA + proxy reverso `/api` e `/socket.io`.

---

### Task 1: `.dockerignore` e `.env` de execução do backend

**Files:**
- Create: `.dockerignore`
- Create: `backend/.env` (a partir de `backend/.env.example`, não versionado)

**Interfaces:**
- Consumes: `backend/.env.example` (Fase 1, Task 4).
- Produces: contexto de build enxuto; `backend/.env` consumido por `env_file` do serviço `app` no compose.

- [ ] **Step 1: Escrever verificação que falha**

Run: `test -f .dockerignore && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `.dockerignore` na raiz**

```gitignore
**/node_modules
**/dist
**/coverage
.git
.gitignore
**/.env
**/.env.local
*.log
playwright-report
test-results
docs
.overclock-app
```

- [ ] **Step 3: Gerar `backend/.env` a partir do exemplo**

Run: `cp backend/.env.example backend/.env`
Expected: cria `backend/.env` (ignorado pelo git conforme `.gitignore` da Fase 1).

- [ ] **Step 4: Verificar que `.env` existe e não será versionado**

Run: `test -f backend/.env && git check-ignore backend/.env`
Expected: imprime `backend/.env` (confirmando que está ignorado).

- [ ] **Step 5: Commit**

```bash
git add .dockerignore
git commit -m "chore: adiciona dockerignore da raiz"
```

---

### Task 2: Dockerfile multi-stage do backend

**Files:**
- Create: `backend/Dockerfile`

**Interfaces:**
- Consumes: `package.json`/`package-lock.json` da raiz + `backend/package.json` (Fase 1); script `build` do backend (`tsc -p tsconfig.json`).
- Produces: imagem `marketplace-backend` com `backend/dist` e deps de produção; `CMD ["node", "backend/dist/server.js"]` (server.js chega na Fase 3).

- [ ] **Step 1: Escrever verificação que falha**

Run: `docker build -f backend/Dockerfile -t marketplace-backend . 2>&1 | tail -1 || echo NO_DOCKERFILE`
Expected: FAIL — `failed to read dockerfile` / `NO_DOCKERFILE`.

- [ ] **Step 2: Criar `backend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @marketplace/backend
COPY backend ./backend
RUN npm run build --workspace @marketplace/backend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @marketplace/backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
```

- [ ] **Step 3: Buildar a imagem do backend**

Run: `docker build -f backend/Dockerfile -t marketplace-backend .`
Expected: PASS — o stage `builder` roda `tsc` e o stage `production` gera a imagem. `dist/config/index.js` existe; `dist/server.js` ainda não (esperado antes da Fase 3).

- [ ] **Step 4: Confirmar o conteúdo compilado dentro da imagem**

Run: `docker run --rm marketplace-backend ls backend/dist/config`
Expected: lista `index.js` (evidência de que o build multi-stage funcionou).

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore: adiciona dockerfile multi-stage do backend"
```

---

### Task 3: Nginx + Dockerfile multi-stage do frontend

**Files:**
- Create: `frontend/nginx.conf`
- Create: `frontend/Dockerfile`

**Interfaces:**
- Consumes: script `build` do frontend (`tsc --noEmit && vite build` → `frontend/dist`); serviço `app` (nome DNS `app` na rede do compose).
- Produces: imagem `marketplace-frontend` (Nginx servindo SPA na porta 80); proxy reverso `/api/` e `/socket.io/` → `http://app:3000`.

- [ ] **Step 1: Escrever verificação que falha**

Run: `test -f frontend/Dockerfile && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://app:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://app:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Criar `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace @marketplace/frontend
COPY frontend ./frontend
RUN npm run build --workspace @marketplace/frontend

FROM nginx:1.27-alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Buildar a imagem do frontend**

Run: `docker build -f frontend/Dockerfile -t marketplace-frontend .`
Expected: PASS — Vite gera `dist` no builder e o Nginx recebe o `dist` + `nginx.conf`.

- [ ] **Step 5: Validar a config do Nginx dentro da imagem**

Run: `docker run --rm marketplace-frontend nginx -t`
Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

- [ ] **Step 6: Servir o SPA isoladamente e checar resposta**

Run:
```bash
docker run --rm -d --name fe-check -p 8080:80 marketplace-frontend
sleep 2
curl -sf http://localhost:8080/ | grep -q 'id="root"' && echo FRONTEND_OK
docker rm -f fe-check
```
Expected: imprime `FRONTEND_OK`.

- [ ] **Step 7: Commit**

```bash
git add frontend/nginx.conf frontend/Dockerfile
git commit -m "chore: adiciona nginx e dockerfile multi-stage do frontend"
```

---

### Task 4: Config de scrape do Prometheus

**Files:**
- Create: `infra/prometheus/prometheus.yml`

**Interfaces:**
- Consumes: nada (arquivo estático).
- Produces: job `backend` fazendo scrape de `http://app:3000/api/metrics` (endpoint chega na Fase 12); job `prometheus` de auto-monitoração.

- [ ] **Step 1: Escrever verificação que falha**

Run: `test -f infra/prometheus/prometheus.yml && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `infra/prometheus/prometheus.yml`**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ['localhost:9090']

  - job_name: backend
    metrics_path: /api/metrics
    static_configs:
      - targets: ['app:3000']
```

- [ ] **Step 3: Validar sintaxe YAML**

Run: `docker run --rm -v "$PWD/infra/prometheus/prometheus.yml:/p.yml:ro" prom/prometheus:latest promtool check config /p.yml`
Expected: `SUCCESS: /p.yml is valid prometheus config file`.

- [ ] **Step 4: Commit**

```bash
git add infra/prometheus/prometheus.yml
git commit -m "chore: adiciona config de scrape do prometheus"
```

---

### Task 5: docker-compose.yml da stack

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile` (Task 2), `frontend/Dockerfile` (Task 3), `infra/prometheus/prometheus.yml` (Task 4), `backend/.env` (Task 1).
- Produces: serviços `app`, `frontend`, `mysql`, `redis`, `prometheus`, `grafana`; volumes `mysql_data`, `redis_data`, `prometheus_data`, `grafana_data`; healthchecks e `depends_on` por condição.

- [ ] **Step 1: Escrever verificação que falha**

Run: `docker compose config 2>&1 | tail -1 || echo NO_COMPOSE`
Expected: FAIL — `no configuration file provided` / `NO_COMPOSE`.

- [ ] **Step 2: Criar `docker-compose.yml` na raiz**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: backend/Dockerfile
    env_file:
      - ./backend/.env
    environment:
      DATABASE_HOST: mysql
      REDIS_HOST: redis
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - '3000:3000'
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/api/health']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    depends_on:
      - app
    ports:
      - '8080:80'
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: ${DATABASE_NAME:-marketplace}
      MYSQL_USER: ${DATABASE_USER:-app}
      MYSQL_PASSWORD: ${DATABASE_PASSWORD:-secret}
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-p${MYSQL_ROOT_PASSWORD:-root}']
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 10

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - '9090:9090'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    depends_on:
      - prometheus
    ports:
      - '3001:3000'
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

- [ ] **Step 3: Validar a composição**

Run: `docker compose config`
Expected: PASS — imprime a config resolvida (portas, volumes e healthchecks) sem erro de sintaxe.

- [ ] **Step 4: Subir a infra e o frontend e checar saúde**

Run:
```bash
docker compose up -d mysql redis prometheus grafana frontend
sleep 40
docker compose ps
```
Expected: `mysql` e `redis` com status `healthy`; `prometheus`, `grafana` e `frontend` `running`.

- [ ] **Step 5: Confirmar o SPA servido pelo Nginx via compose**

Run: `curl -sf http://localhost:8080/ | grep -q 'id="root"' && echo STACK_FRONTEND_OK`
Expected: imprime `STACK_FRONTEND_OK`.

- [ ] **Step 6: Confirmar o Prometheus no ar**

Run: `curl -sf http://localhost:9090/-/healthy && echo PROM_OK`
Expected: imprime `Prometheus Server is Healthy.` seguido de `PROM_OK`.

- [ ] **Step 7: Derrubar a stack**

Run: `docker compose down`
Expected: containers removidos; volumes nomeados preservados.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: adiciona docker compose da stack com healthchecks e volumes"
```

---

### Task 6: Verificação integrada da fase

**Files:**
- Nenhum arquivo novo — valida o deliverable da fase inteira.

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: evidência de que as imagens buildam, a infra sobe *healthy* e o frontend é servido.

- [ ] **Step 1: Build de ambas as imagens**

Run: `docker build -f backend/Dockerfile -t marketplace-backend . && docker build -f frontend/Dockerfile -t marketplace-frontend .`
Expected: PASS — as duas imagens buildam sem erro.

- [ ] **Step 2: Validar toda a composição**

Run: `docker compose config >/dev/null && echo COMPOSE_VALID`
Expected: imprime `COMPOSE_VALID`.

- [ ] **Step 3: Subir infra + frontend e conferir status**

Run:
```bash
docker compose up -d mysql redis prometheus grafana frontend
sleep 40
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
curl -sf http://localhost:8080/ | grep -q 'id="root"' && echo DELIVERABLE_OK
docker compose down
```
Expected: `mysql`/`redis` `healthy`, demais `running`, e imprime `DELIVERABLE_OK`.

- [ ] **Step 4: Commit (se houver ajustes)**

```bash
git add -A
git commit -m "chore: valida fase 2 com build de imagens e stack docker" || echo "nada a commitar"
```
