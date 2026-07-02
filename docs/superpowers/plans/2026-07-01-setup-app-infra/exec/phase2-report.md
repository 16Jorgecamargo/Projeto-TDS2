# Phase 2 Execution Report — Docker/Infra

**Date:** 2026-07-01
**Branch:** feat/marketplace-implementation
**Status:** COMPLETE

## Commits

| Hash | Message |
|------|---------|
| d4098fd | chore: adiciona dockerignore da raiz |
| f6c599d | chore: adiciona dockerfile multi-stage do backend |
| 5939737 | chore: adiciona nginx e dockerfile multi-stage do frontend |
| b29dfe1 | chore: adiciona config de scrape do prometheus |
| 82cda55 | chore: adiciona docker compose da stack com healthchecks e volumes |

## Files Delivered

- `.dockerignore`
- `backend/.env` (copied from `.env.example`, not versioned)
- `backend/Dockerfile` (multi-stage builder→production)
- `frontend/nginx.conf`
- `frontend/Dockerfile` (multi-stage builder→production)
- `infra/prometheus/prometheus.yml`
- `docker-compose.yml`

## Verification Results

### Build

```
docker build -f backend/Dockerfile -t marketplace-backend .  → SUCCESS
docker build -f frontend/Dockerfile -t marketplace-frontend . → SUCCESS
```

Backend `dist/config/index.js` confirmed inside image via `docker run --rm marketplace-backend ls backend/dist/config`.
`dist/server.js` absent — expected (Phase 3 delivers Fastify boot).

### Compose Config

```
docker compose config >/dev/null && echo COMPOSE_VALID → COMPOSE_VALID
```

### Integration Stack (infra + frontend, excluding app)

```
SERVICE      STATUS
app          Restarting (0) — expected: no server.js yet
frontend     Up
grafana      Up
mysql        Up (healthy)
prometheus   Up
redis        Up (healthy)
```

```
curl http://localhost:8080/ → DELIVERABLE_OK (id="root" found)
curl http://localhost:9090/-/healthy → Prometheus Server is Healthy.
```

## Concerns / Notes

1. **nginx lazy DNS resolution:** The plan's `nginx.conf` used direct `proxy_pass http://app:3000` which causes nginx to crash at startup when `app` is not resolvable (even in standalone container). Fixed by adding `resolver 127.0.0.11 valid=30s` and routing through `set $backend http://app:3000` variable. This is the standard Docker pattern for deferred upstream resolution. In compose network, `127.0.0.11` is Docker's embedded DNS.

2. **`frontend` depends_on `app`:** The compose spec has `frontend: depends_on: - app`, so starting `frontend` always starts `app` too. The `app` container restarts loop (no server.js) but does not block `frontend` from running because `depends_on` without `condition: service_healthy` only waits for container start, not health. This is intentional — Phase 3 will make `app` healthy.

3. **`promtool` entrypoint:** `prom/prometheus:latest` entrypoint is `prometheus` binary, not `promtool`. Used `--entrypoint promtool` override to validate config. Result: `SUCCESS: /p.yml is valid prometheus config file syntax`.

4. **MySQL healthcheck interpolation:** The healthcheck uses `-p${MYSQL_ROOT_PASSWORD:-root}` inside a YAML list — Docker Compose passes this as a single string argument to mysqladmin and performs shell variable substitution. Standard pattern.

---

## FIX — Post-Review Corrections (2026-07-01)

### FIX 1 — `frontend/nginx.conf`: double-path em proxy_pass

`proxy_pass $backend/api/` + `location /api/` → nginx com variável não faz prefix stripping → URI `/api/foo` virava `/api/api/foo` no upstream.

Correção: `proxy_pass $backend;` em ambas as locations (`/api/` e `/socket.io/`). Nginx repassa URI completo incluindo prefixo. `resolver 127.0.0.11 valid=30s` e `set $backend` mantidos.

### FIX 2 — `docker-compose.yml`: healthcheck mysql CMD sem shell

`['CMD', 'mysqladmin', ..., '-p${MYSQL_ROOT_PASSWORD:-root}']` não expande variável (exec form, sem shell).

Correção:
```yaml
test: ["CMD-SHELL", "mysqladmin ping -h localhost -p$$MYSQL_ROOT_PASSWORD"]
```
`$$` escapa o `$` no Compose; shell dentro do container expande `$MYSQL_ROOT_PASSWORD`.

### Verificação

```
docker compose config
```

Saída confirmou:
- MySQL healthcheck: `CMD-SHELL` + `mysqladmin ping -h localhost -p$$MYSQL_ROOT_PASSWORD` ✓
- Compose config parseado sem erros ✓
