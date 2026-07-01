# Services Marketplace — Design Spec

Data: 2026-07-01

## 1. Contexto de negócio

Marketplace de serviços gerais que conecta clientes que precisam de prestadores de serviço a profissionais. Três perfis de usuário:

- **Cliente**: publica demandas, recebe orçamentos, contrata, acompanha execução, paga, avalia.
- **Profissional**: perfil com portfólio, áreas de atuação, categorias/tags, disponibilidade (agenda + exceções), responde demandas com orçamentos, executa contratos, recebe pagamento via carteira interna.
- **Admin**: modera usuários, denúncias, disputas de contrato, audita ações da plataforma.

**Fluxo principal**: cliente publica demanda → profissionais enviam orçamentos → cliente aceita um → vira contrato → execução com atualizações de progresso → pagamento → avaliação mútua → carteira do profissional creditada (menos taxa) → saque.

**Recursos adicionais**: chat, notificações (push + in-app + e-mail), favoritos, bloqueio de usuários, denúncias, disputas de contrato, convites diretos, LGPD (consentimentos rastreados), exclusão de conta com carência.

## 2. Stack (fixa — sem trocar libs nem adicionar deps não listadas salvo necessidade explícita)

### Backend
Node.js 20+, TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, Redis (ioredis) + BullMQ, Zod + fastify-type-provider-zod + zod-openapi (fonte única de validação e Swagger), JWT (access+refresh) + bcrypt, socket.io, prom-client + Sentry, helmet/cors/rate-limit/compress, Vitest.

Dependencies: `@fastify/compress ^9`, `@fastify/cors ^11.2`, `@fastify/helmet ^13.0.2`, `@fastify/rate-limit ^11`, `@fastify/swagger ^9.7`, `@fastify/swagger-ui ^6`, `@sentry/node ^8.28`, `bcrypt ^5.1.1`, `bullmq ^5.12.12`, `dotenv ^16.4.5`, `fastify ^5`, `fastify-type-provider-zod ^4.0.1`, `ioredis ^5.4.1`, `jsonwebtoken ^9.0.2`, `mysql2 ^3.11`, `prom-client ^15.1.3`, `reflect-metadata ^0.2.2`, `socket.io ^4.7.5`, `typeorm ^0.3.20`, `zod ^3.23.8`, `zod-openapi ^3.1.2`.

DevDependencies: `@swc/core`, `@swc/helpers`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/node ^22`, `@typescript-eslint/* ^8.6`, `@vitest/coverage-v8 ^2.1.1`, `eslint ^9.10`, `eslint-config-prettier ^9.1`, `nodemon`, `prettier ^3.3.3`, `ts-node`, `tsconfig-paths`, `tsx`, `typescript ^5.6.2`, `unplugin-swc`, `vitest ^2.1.1`.

Scripts: dev, build, start, lint, lint:fix, typecheck, migration:run/revert/generate (TypeORM CLI, data source em `src/infra/database/data-source.ts`), test, test:watch, test:coverage, docs:export.

### Frontend
React 19 + Vite 6, TypeScript, react-router-dom 6, TanStack Query 5, Zustand 5, react-hook-form + Zod, axios, socket.io-client, Tailwind 3 + Heroicons + liquid-glass-react, Vitest + Testing Library, Playwright (specs por perfil).

Dependencies: `@heroicons/react ^2.2`, `@hookform/resolvers ^3.9`, `@tanstack/react-query ^5.62`, `axios ^1.7.9`, `liquid-glass-react ^1.1.1`, `react ^19`, `react-dom ^19`, `react-hook-form ^7.54`, `react-router-dom ^6.28`, `socket.io-client ^4.8`, `zod ^3.24`, `zustand ^5`.

DevDependencies: `@playwright/test ^1.60`, `@testing-library/* `, `@types/react ^19`, `@vitejs/plugin-react ^4.3`, `@vitest/coverage-v8 ^2.1`, `autoprefixer`, `eslint ^9`, `eslint-config-prettier ^10`, `eslint-plugin-react ^7.37`, `eslint-plugin-react-hooks ^5`, `jsdom`, `postcss`, `prettier ^3.4`, `tailwindcss ^3.4`, `typescript ^5.7`, `vite ^6`, `vitest ^2.1`.

Scripts: dev, build (`tsc --noEmit && vite build`), preview, lint, typecheck, test, test:coverage, e2e + e2e:clients/professionals/admins/auth/flows/headed/ui/report.

### Infra
Docker Compose: app (backend), frontend (Nginx), mysql:8.0, redis:7-alpine, prometheus, grafana. Build multi-stage builder→production nos dois. Nginx serve frontend + proxy reverso pra API (incl. socket.io). CI (GitHub Actions): lint+typecheck → testes (MySQL+Redis de serviço) → export OpenAPI artifact → build+push imagem Docker (branch main).

## 3. Modelo de dados (~50 tabelas MySQL)

- **Auth/conta**: users, refresh_tokens, password_reset_tokens, email_verification_tokens, phone_verification_tokens, user_oauth_accounts, user_preferences, account_deletion_requests, user_consents (LGPD), push_device_tokens
- **Endereço**: addresses
- **Perfil profissional**: professional_profiles, professional_documents, professional_experiences, professional_education, professional_certifications, professional_service_areas, availability_slots, availability_exceptions, portfolio_items, portfolio_images
- **Catálogo**: service_categories, service_tags, professional_categories, professional_tags
- **Demandas**: service_demands, demand_images, demand_tags, demand_invitations
- **Orçamentos**: quotes, quote_items
- **Carteira/pagamento**: wallets, wallet_transactions, payments, platform_fees, refunds, withdrawals
- **Contratos**: contracts, schedules, contract_progress_updates, contract_progress_images, contract_disputes
- **Social**: reviews, favorites, reports, user_blocks
- **Comunicação**: chat_rooms, messages, notifications
- **Auditoria**: audit_logs

**Regras de dados**:
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable.
- `notifications.channel` e `withdrawals.payment_method` são ENUM.
- `audit_logs.user_id` nullable.
- DECIMAL do MySQL2 chega como string — sempre `Number()` antes de aritmética.

## 4. Arquitetura de pastas

**Monorepo** (raiz com `backend/` + `frontend/`, docker-compose na raiz).

Backend: `config/` (env/config global) · `infra/` (data source, migrations, Redis, filas) · `modules/` (um por domínio: rotas+controllers+services+schemas) · `shared/` (erros/middlewares/tipos comuns) · `test/` (helpers/factories).

Módulos backend (`src/modules/`): account, address, admin, audit, auth, chat, contract, demand, health, notification, payment, professional, quote, review, search, social, user, wallet.

Frontend: `components/` (UI reutilizável) · `features/` (um por domínio) · `hooks/` (genéricos) · `lib/` (HTTP client, utils) · `pages/` (rotas top-level fora de feature) · `router/` · `stores/` (Zustand) · `types/`.

Features frontend (`src/features/`): admin, auth, chat, contracts, demands, landing, notifications, professional, settings, wallet.

## 5. Convenções obrigatórias

1. Sem comentários no código.
2. Inglês em variáveis/funções/arquivos.
3. TypeScript strict nos dois projetos.
4. ESLint + Prettier antes de commit.
5. Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`; valores fixos = `z.enum([...])`, nunca `z.string()`.
6. Test infra (Vitest) antes de código de negócio; testes unit logo após cada módulo; integração usa banco real via `buildTestApp()`; unit mocka repos/Redis/BullMQ.
7. Ordem de construção: setup → Docker → Fastify+Swagger → schemas Zod compartilhados → infra de testes → entidades TypeORM (todas tabelas) + migrations → módulos de negócio um a um (com testes) → observabilidade (Prometheus/Sentry/Grafana) → integração/E2E → auditoria Swagger → hardening+CI/CD.
8. Commit: nunca marcar IA; conventional commits em português brasileiro.

## 6. Decomposição em fases (um arquivo de plano por fase)

Projeto grande demais para um plano único. Frontend fatiado por feature junto do módulo backend correspondente. Planos em `docs/superpowers/plans/`.

| # | Arquivo | Backend | Frontend |
|---|---------|---------|----------|
| 0 | `plan_index.md` | ordem de execução + convenções globais | — |
| 1 | `plan_phase1_setup.md` | monorepo, TS strict, ESLint/Prettier, env/config, scripts | scaffold Vite/TS, Tailwind, scripts |
| 2 | `plan_phase2_docker_infra.md` | Docker Compose (mysql/redis/prometheus/grafana), multi-stage | Nginx (serve + proxy API/socket.io), multi-stage |
| 3 | `plan_phase3_foundation.md` | Fastify 5 boot, plugins (helmet/cors/rate-limit/compress), zod-openapi, Swagger, health module | app shell, router, HTTP client (axios), TanStack Query, Zustand base, layout |
| 4 | `plan_phase4_shared.md` | schemas Zod compartilhados, padrão describe/openapi, erros, middlewares | tipos e lib compartilhados |
| 5 | `plan_phase5_test_infra.md` | Vitest, `buildTestApp()`, factories, mocks Redis/BullMQ | Vitest + Testing Library, Playwright base + specs por perfil |
| 6 | `plan_phase6_data.md` | todas ~50 entidades TypeORM + migrations, data-source | — |
| 7 | `plan_phase7_auth_account.md` | auth (JWT access+refresh, bcrypt), account, user, address, LGPD/consents, exclusão com carência | features auth, settings |
| 8 | `plan_phase8_professional.md` | professional (perfil/documentos/experiências/educação/certificações), service areas, availability, portfolio, catálogo (categories/tags), search | features professional, landing |
| 9 | `plan_phase9_demand_contract.md` | demand (+images/tags/invitations), quote (+items), contract (schedules/progress/images), disputes | features demands, contracts |
| 10 | `plan_phase10_wallet_payment.md` | wallet (+transactions), payment, platform_fees, refunds, withdrawals | feature wallet |
| 11 | `plan_phase11_social_comm.md` | review, social (favorites/reports/user_blocks), chat (socket.io, rooms/messages), notification (push/in-app/email via BullMQ), audit, admin | features chat, notifications, admin |
| 12 | `plan_phase12_observability.md` | prom-client (métricas), Sentry, Grafana dashboards, Prometheus scrape | — |
| 13 | `plan_phase13_integration_e2e.md` | testes de integração (banco real), auditoria completa do Swagger/OpenAPI | E2E Playwright por perfil (clients/professionals/admins/auth/flows) |
| 14 | `plan_phase14_hardening_cicd.md` | hardening (rate-limit, headers, secrets), GitHub Actions CI/CD | build de produção, deploy imagem |

**Ordem** segue o item 7 da spec: test infra antes de negócio; módulos um a um com testes; observabilidade → integração/E2E → auditoria Swagger → hardening/CI por último.

## 7. Estratégia de testes

- **Unit**: logo após cada módulo; mocka repositórios/Redis/BullMQ; roda sem infra.
- **Integração**: via `buildTestApp()` com banco MySQL real + Redis (fase 13, e incremental por módulo).
- **E2E**: Playwright com specs separadas por perfil (cliente/profissional/admin/auth/fluxos).
- Coverage via `@vitest/coverage-v8` nos dois projetos.

## 8. Não-objetivos (YAGNI)

- Sem gateway de pagamento externo real: carteira interna + saques são simulados/mock na primeira versão (integração real fora de escopo salvo pedido explícito).
- Sem app mobile nativo; push via `push_device_tokens` mas provider concreto abstraído.
- Sem microserviços: monolito modular Fastify.
- Sem trocar nem adicionar libs fora das listadas salvo necessidade explícita documentada.

## 9. Riscos / pontos de atenção

- DECIMAL como string (MySQL2): aritmética errada se esquecer `Number()` — cobrir em wallet/payment.
- ENUMs de banco (`notifications.channel`, `withdrawals.payment_method`) devem casar com `z.enum` dos schemas.
- FKs nullable (`contracts.cancelled_by`, `audit_logs.user_id`) precisam de tratamento explícito em migrations e schemas.
- Swagger como fonte única: divergência entre Zod e OpenAPI quebra auditoria da fase 13.
- Ordem de migrations com ~50 tabelas: respeitar dependências de FK.
