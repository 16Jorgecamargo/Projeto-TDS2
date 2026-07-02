# Fase 11 — Social / Comunicação / Auditoria / Admin: Relatório de Execução

**Data:** 2026-07-02
**Branch:** feat/marketplace-implementation
**Status:** CONCLUÍDA

---

## Fluxo de execução

9 tasks, ordem do plano: `review` (1) → `social` (2) → `notification` (3) → `chat` (4) → `audit` (5) → `admin` (6) → frontend `notifications` (7) → frontend `chat` (8) → frontend `admin` (9). Cada task: 1 agente implementador novo (Sonnet), verificado e corrigido inline pelo próprio agente antes do relato final; supervisão e correções pontuais feitas na thread principal.

## Commits entregues

```
7f296c0d feat(review): avaliacao mutua de contratos concluidos
8caf3ac3 feat(social): favoritos, denuncias e bloqueio de usuarios
ab38a4e0 feat(notification): entrega multicanal via BullMQ
c755add5 feat(chat): salas persistentes e mensagens em tempo real via socket.io
95d4eeaf feat(audit): adiciona registro de acoes com user_id nullable
fdf2844f feat(admin): moderacao de usuarios, denuncias e disputas com auditoria
bb087c4c feat(notifications): adiciona central de notificacoes in-app no frontend
c239fb01 feat(chat): adiciona janela de chat em tempo real com socket.io-client
175f8e69 feat(admin): dashboard de moderacao de denuncias e disputas
```

9 commits `feat`, um por task. Nenhum bug real exigiu commit `fix` separado — todas as correções (bugs de mapeamento de FK, testes inválidos, wiring de DI) foram resolvidas **dentro** do próprio commit de implementação da task, antes do commit.

---

## O padrão de espaço de IDs (ProfessionalProfile.id vs users.id) se repetiu de novo

Já havia custado commits de correção separados nas fases 9 e sido evitado corretamente na fase 10. Nesta fase reapareceu na Task 1 (`review`):

- **Task 1 (review.service.ts)** — o código herdado de uma sessão anterior tratava `Contract.professional_id` como se já fosse `users.id`. Na realidade é FK para `professional_profiles.id`. Causava `QueryFailedError` de violação de FK ao criar avaliação. Corrigido adicionando dependência `professionalProfiles: Repository<ProfessionalProfile>` ao `ReviewService`, resolvendo `contract.professional_id → professionalProfile.user_id` antes da checagem de participante e do cálculo do alvo da avaliação. Mesmo padrão aplicado em `listForProfessional` (rota usa profile id, como `professional.service.ts`).

## Ordem de dependência real vs. ordem do plano

O plano manda implementar `review` (Task 1) e `social` (Task 2) antes de `notification` (Task 3) e `audit` (Task 5), mas os services de review/social já importam os tipos `EnqueueNotification`/`RecordAudit`. Como esses módulos não existiam ainda, os agentes das Tasks 1 e 2 declararam os tipos localmente e wiraram stubs no-op nas rotas — exatamente como o próprio plano previa ("nos unit tests eles são injetados como mocks... a fiação real ocorre nas rotas"). Ao chegar nas Tasks 3 e 5, os módulos reais de notification/audit foram construídos exportando os tipos canônicos, mas **retrofitar review/social para consumir os singletons reais foi deliberadamente deixado fora de escopo** (instrução explícita passada a cada agente, para não estourar o escopo de cada task). `chat` (Task 4) e `admin` (Task 6), construídos depois, já consomem os singletons reais de `enqueueNotification`/`recordAudit` diretamente.

**Débito técnico registrado:** `review.routes.ts` e `social.routes.ts` ainda usam stubs no-op para `recordAudit`/`enqueueNotification` — avaliações e denúncias/bloqueios não geram notificação nem trilha de auditoria de fato hoje, apesar dos módulos reais já existirem. Recomendado retrofit em fase de hardening (14) ou task avulsa: trocar os stubs por `buildRecordAudit(app.dataSource.getRepository(AuditLog))` e o `enqueueNotification` real do módulo notification, seguindo o padrão já usado em `chat.routes.ts` e `admin.routes.ts`.

## Bugs reais encontrados e corrigidos (dentro do próprio commit de implementação)

### 1. FK inválida em review.service.ts (Task 1)
Ver seção acima — `professional_id` do contrato tratado como `users.id` em vez de `professional_profiles.id`.

### 2. Enums fictícios do plano vs. enums reais do schema (Tasks 2, 6, 9)
O pseudocódigo do plano inventou valores de enum que não existem nas entidades reais:
- `Report.status`: plano assumia `open|reviewing|resolved|dismissed`; real é `pending|reviewed|dismissed|actioned`.
- `Report.targetType`: plano assumia `user|demand|contract|message`; real é `user|demand|review|message`.
- `User.status`: plano assumia `active|suspended|banned`; real é `active|suspended|deleted`.
- `ContractDispute`: plano assumia coluna `outcome`; a entidade real só tem `status`/`resolution` (texto livre), sem coluna de outcome estruturado.

Todos os agentes leram as entidades reais antes de escrever os schemas Zod e usaram os valores corretos — nenhum enum fictício vazou para o código final.

### 3. Delegação de resolução de disputa em vez de bypass (Task 6)
O `AdminService.resolveDispute` poderia ter escrito diretamente no repositório de disputas, ignorando a lógica de negócio já existente em `DisputeService.resolve()` (que move o contrato de volta de `disputed` para `active`). O agente investigou o módulo `dispute` existente (fase 9) antes de implementar e optou por **delegar** para `DisputeService.resolve(disputeId, 'resolved', note)` em vez de duplicar/bypassar. O `outcome` (sem coluna própria no schema real) é registrado apenas nos metadados do log de auditoria e no corpo da resposta, não persistido — limitação documentada do schema real, não mascarada com hack.

### 4. Fila BullMQ sem conexão Redis real (Task 3)
`backend/src/infra/queues/index.ts` só tinha um stub falso (`mailQueue = { add: async()=>{} }`), apesar de `bullmq`/`ioredis` já serem dependências instaladas — nenhuma fiação real de fila existia no repositório antes desta fase. Adicionado `redisConnection: ConnectionOptions` compartilhado (usa `env.REDIS_HOST`/`REDIS_PORT`, já existentes na config). `startNotificationWorker()` só é chamado no bootstrap real (`server.ts`, path `isEntrypoint`), nunca durante `buildTestApp()`.

## Infraestrutura: Redis precisou ser subida manualmente

A partir da Task 6 (admin, que usa `enqueueNotification` real de verdade em teste de integração), a suíte de integração passou a depender de Redis rodando (a fila real trava/timeout sem ele). Redis e MySQL foram subidos via `docker compose up -d redis mysql` na thread principal antes das Tasks 7-9. **Recomendado para fase 14:** documentar essa dependência no README/CI e garantir que o pipeline sobe `redis` antes de rodar a suíte de integração do backend.

## Gap de plano preenchido: roteamento frontend

Confirmando o padrão já visto nas fases 8-10, o plano nunca especifica o `roles` prop de `ProtectedRoute`. As Tasks 7/8 adicionaram `/notifications` e `/chat/:roomId` sem restrição de role (mesmo grupo de `/wallet`); a Task 9 adicionou `/admin` com `roles={['admin']}`, seguindo o padrão já usado em `/demands/new` (`roles={['client']}`).

## Outras correções de convenção (não-bugs, adaptação real-vs-plano)

- Todo módulo backend usou `app.dataSource.getRepository(...)` + service com **deps object** no construtor (não posicional), em vez do `AppDataSource` estático por request do plano.
- `ChatRoom`/`Message` reais usam `client_id`/`professional_id` (não um par genérico `participantA/B`); `chat.service.ts` normaliza a dupla ordenando os dois ids e mapeando para essas colunas.
- Testes de integração usaram fluxo real via HTTP (`POST /api/auth/register` + helpers locais tipo `registerUser`/`registerAdmin`), nunca os factories inexistentes (`createClient`/`authHeader`) assumidos pelo plano — mesmo padrão já estabelecido nas fases 9-10.
- Frontend: todos os testes (`notifications.test.tsx`, `chat.test.tsx`, `admin.test.tsx`) mockam `./queries` diretamente em vez de mockar `http`/`socket` cru, como já era o padrão real do `wallet.test.tsx`.

---

## Resultados dos testes (fim de fase)

### Backend
```
Suíte completa: 391 passed, 9 failed (isolados: todos passam)
```
As 9 falhas ocorrem só quando toda a suíte roda em paralelo (`contract.routes.test.ts`, `payment.routes.test.ts`, `refunds.routes.test.ts`, `social.routes.test.ts`) — reproduzido e confirmado como a mesma flakiness pré-existente de `truncateAll()` concorrente já registrada no relatório da fase 10, não uma regressão desta fase. Módulos desta fase individualmente: `review`, `social`, `notification`, `chat`, `audit`, `admin` — todos os arquivos de teste passam 100% isolados e em conjunto entre si.

`npm run typecheck` e `npm run lint` limpos.

### Frontend
```
Test Files  21 passed (21)
     Tests  50 passed (50)
```
`npm run typecheck` e `npm run lint` limpos.

---

## Nota de infraestrutura de teste (recorrente desde a fase 8, ainda não corrigida)

Mesma causa raiz já documentada nas fases 8-10: `truncateAll()` chamado de forma independente por múltiplos arquivos de teste de rota contra o mesmo banco MySQL real, sem serialização, com Vitest rodando arquivos em paralelo. Ainda não corrigido — recomendado para a fase 14 (hardening/CI), junto com a subida automática de Redis no pipeline (ver seção acima).

## Interfaces produzidas (consumidas pelas fases 12+)

- Backend: módulos `review`, `social`, `notification`, `chat`, `audit`, `admin` completos, rotas em `/api/reviews`, `/api/professionals/:id/reviews`, `/api/favorites`, `/api/reports`, `/api/blocks`, `/api/notifications`, `/api/notifications/devices`, `/api/chat/rooms`, `/api/admin/*`.
- `enqueueNotification`/`EnqueueNotificationInput` (canônico, `backend/src/modules/notification/notification.service.ts`) e `recordAudit`/`buildRecordAudit` (canônico, `backend/src/modules/audit/audit.service.ts`) — consumidos de verdade por `chat` e `admin`; `review`/`social` ainda usam stubs no-op (débito técnico registrado acima).
- `SocialService.isBlockedBetween(a,b)` — consumido por `chat.service.ts` para bloquear mensagens entre usuários bloqueados.
- `registerChatGateway(io, service, verifyToken)` — bootstrap socket.io real em `server.ts`, autenticado via `verifyAccessToken` (`shared/security/token.ts`), gated para não rodar em `buildTestApp()`.
- Frontend: `features/{notifications,chat,admin}/{api,queries,schemas}.ts` + páginas `/notifications`, `/chat/:roomId`, `/admin` (role `admin`).
