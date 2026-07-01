# Fase 11 — Social & Comunicação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar os módulos backend `review`, `social`, `chat`, `notification`, `audit` e `admin` (mais features frontend `chat`, `notifications`, `admin`) sobre os contratos fundacionais e entidades já criados nas fases 3-10.

**Architecture:** Cada módulo backend segue `routes/controller/service/schemas` + unit (`*.service.test.ts`, mocka repos/Redis/BullMQ) + integração (`*.routes.test.ts` via `buildTestApp()`). Chat usa `socket.io` autenticado com persistência em `chat_rooms`/`messages`. Notificações são enfileiradas em BullMQ e processadas por workers por canal (`push`/`in_app`/`email`). Auditoria grava `audit_logs` (com `user_id` nullable). Admin expõe moderação de usuários, denúncias e disputas consumindo os módulos anteriores.

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, ioredis + BullMQ, socket.io, Zod + fastify-type-provider-zod + zod-openapi, Vitest; React 19 + Vite 6, TanStack Query 5, Zustand 5, socket.io-client, react-hook-form + Zod, Tailwind 3.

## Global Constraints

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. Docs de plano e mensagens de commit em pt-BR.
- Não trocar libs nem adicionar deps fora das listadas na spec §2.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M.
- `audit_logs.user_id` nullable; `notifications.channel` é ENUM.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

---

## Contratos consumidos (fases 3-10, não redefinir)

- `buildApp(): FastifyInstance` — plugins, swagger, error handler, registro de rotas. Módulos exportam `async function <name>Routes(app: FastifyInstance)` registrada em `buildApp`.
- `AppError` + subclasses `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError` em `backend/src/shared/errors.ts`.
- `app.authenticate` (preHandler) → popula `request.user = { id: string; role: 'client' | 'professional' | 'admin' }`.
- `requireRole(...roles: Array<'client'|'professional'|'admin'>)` — preHandler factory em `backend/src/shared/middlewares/require-role.ts`.
- Schemas base fase 4: `idParamSchema`, `paginationQuerySchema`, `paginatedResponse(itemSchema)` em `backend/src/shared/schemas.ts`.
- `buildTestApp(): Promise<FastifyInstance>` e factories (`createUser`, `createProfessional`, `createContract`, ...) em `backend/src/test/`.
- Entidades TypeORM (fase 6, em `backend/src/modules/*/entities/` ou `backend/src/infra/database/entities/`): `User`, `Contract`, `ProfessionalProfile`, `Review`, `Favorite`, `Report`, `UserBlock`, `ChatRoom`, `Message`, `Notification`, `PushDeviceToken`, `AuditLog`, `ContractDispute`.
- `AppDataSource` em `backend/src/infra/database/data-source.ts`; `getRepository(Entity)` via `AppDataSource.getRepository`.
- Frontend: `lib/http.ts` (axios `/api`), `stores/auth.ts` (Zustand `{ user, accessToken }`), `lib/queryClient.ts`, `router/ProtectedRoute.tsx`.

### Contratos produzidos nesta fase (consumidos por fases 12-14)

- `reviewService`, `socialService`, `chatService`, `notificationService`, `auditService`, `adminService`.
- `enqueueNotification(input: EnqueueNotificationInput): Promise<void>` — ponto único de emissão de notificação usado por qualquer módulo.
- `recordAudit(input: RecordAuditInput): Promise<void>` — ponto único de auditoria.
- `registerChatGateway(app: FastifyInstance, io: Server): void` — bootstrap socket.io.

---

## Estrutura de arquivos

```
backend/src/modules/review/
  review.routes.ts review.controller.ts review.service.ts review.schemas.ts
  review.service.test.ts review.routes.test.ts
backend/src/modules/social/
  social.routes.ts social.controller.ts social.service.ts social.schemas.ts
  social.service.test.ts social.routes.test.ts
backend/src/modules/chat/
  chat.routes.ts chat.controller.ts chat.service.ts chat.schemas.ts
  chat.gateway.ts chat.service.test.ts chat.routes.test.ts chat.gateway.test.ts
backend/src/modules/notification/
  notification.routes.ts notification.controller.ts notification.service.ts
  notification.schemas.ts notification.queue.ts notification.worker.ts
  notification.service.test.ts notification.routes.test.ts notification.worker.test.ts
backend/src/modules/audit/
  audit.service.ts audit.schemas.ts audit.service.test.ts
backend/src/modules/admin/
  admin.routes.ts admin.controller.ts admin.service.ts admin.schemas.ts
  admin.service.test.ts admin.routes.test.ts
frontend/src/features/chat/
  api.ts queries.ts socket.ts schemas.ts components/ pages/ chat.test.tsx
frontend/src/features/notifications/
  api.ts queries.ts schemas.ts components/ pages/ notifications.test.tsx
frontend/src/features/admin/
  api.ts queries.ts schemas.ts components/ pages/ admin.test.tsx
```

---

## Task 1: Módulo review (avaliação mútua cliente↔profissional)

**Files:**
- Create: `backend/src/modules/review/review.schemas.ts`
- Create: `backend/src/modules/review/review.service.ts`
- Create: `backend/src/modules/review/review.controller.ts`
- Create: `backend/src/modules/review/review.routes.ts`
- Test: `backend/src/modules/review/review.service.test.ts`
- Test: `backend/src/modules/review/review.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `reviewRoutes`)

**Interfaces:**
- Consumes: `Review`, `Contract`, `User` entities; `AppDataSource`; `AppError` subclasses; `app.authenticate`; `idParamSchema`, `paginatedResponse`; `recordAudit` (Task 9); `enqueueNotification` (Task 6).
- Produces: `reviewService.create(input: CreateReviewInput): Promise<ReviewResponse>`, `reviewService.listForProfessional(professionalId: string, page: number, limit: number): Promise<Paginated<ReviewResponse>>`. `CreateReviewInput = { contractId: string; authorId: string; rating: number; comment: string }`.

- [ ] **Step 1: Escrever schemas Zod falhando (arquivo ainda não existe)**

`backend/src/modules/review/review.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const createReviewBodySchema = z.object({
  contractId: z
    .string()
    .uuid()
    .describe('Contrato concluído que originou a avaliação')
    .openapi({ example: '3f1c2b90-0a11-4c33-9b77-2d5e6f7a8b90' }),
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('Nota de 1 a 5')
    .openapi({ example: 5 }),
  comment: z
    .string()
    .min(3)
    .max(2000)
    .describe('Comentário da avaliação')
    .openapi({ example: 'Serviço impecável e pontual.' }),
});

export const reviewResponseSchema = z.object({
  id: z.string().uuid().describe('ID da avaliação').openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  contractId: z.string().uuid().describe('Contrato avaliado').openapi({ example: '3f1c2b90-0a11-4c33-9b77-2d5e6f7a8b90' }),
  authorId: z.string().uuid().describe('Autor da avaliação').openapi({ example: 'b1b2c3d4-0000-4000-8000-000000000002' }),
  targetId: z.string().uuid().describe('Avaliado').openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  rating: z.number().int().min(1).max(5).describe('Nota').openapi({ example: 5 }),
  comment: z.string().describe('Comentário').openapi({ example: 'Serviço impecável e pontual.' }),
  createdAt: z.string().datetime().describe('Data de criação').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
```

- [ ] **Step 2: Escrever teste unit falhando**

`backend/src/modules/review/review.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewService } from './review.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';

const contract = {
  id: 'c-1',
  clientId: 'client-1',
  professionalId: 'pro-1',
  status: 'completed',
};

function makeDeps() {
  const reviewRepo = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'r-1', createdAt: new Date('2026-07-01T12:00:00.000Z') })),
    findAndCount: vi.fn(),
  };
  const contractRepo = { findOne: vi.fn().mockResolvedValue(contract) };
  const enqueueNotification = vi.fn().mockResolvedValue(undefined);
  const recordAudit = vi.fn().mockResolvedValue(undefined);
  const service = new ReviewService(reviewRepo as never, contractRepo as never, enqueueNotification, recordAudit);
  return { service, reviewRepo, contractRepo, enqueueNotification, recordAudit };
}

describe('ReviewService.create', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('cria avaliação do cliente para o profissional e notifica o alvo', async () => {
    const result = await deps.service.create({ contractId: 'c-1', authorId: 'client-1', rating: 5, comment: 'Ótimo' });
    expect(result.targetId).toBe('pro-1');
    expect(result.rating).toBe(5);
    expect(deps.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'pro-1', type: 'review_received' }),
    );
    expect(deps.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'review.created', userId: 'client-1' }),
    );
  });

  it('rejeita avaliação de quem não participa do contrato', async () => {
    await expect(
      deps.service.create({ contractId: 'c-1', authorId: 'intruso', rating: 4, comment: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejeita avaliação de contrato não concluído', async () => {
    deps.contractRepo.findOne.mockResolvedValue({ ...contract, status: 'in_progress' });
    await expect(
      deps.service.create({ contractId: 'c-1', authorId: 'client-1', rating: 4, comment: 'x' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita avaliação duplicada do mesmo autor no mesmo contrato', async () => {
    deps.reviewRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      deps.service.create({ contractId: 'c-1', authorId: 'client-1', rating: 4, comment: 'x' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFound se o contrato não existe', async () => {
    deps.contractRepo.findOne.mockResolvedValue(null);
    await expect(
      deps.service.create({ contractId: 'nope', authorId: 'client-1', rating: 4, comment: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd backend && npx vitest run src/modules/review/review.service.test.ts`
Expected: FAIL — `Cannot find module './review.service'`.

- [ ] **Step 4: Implementar o service mínimo**

`backend/src/modules/review/review.service.ts`:
```ts
import type { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import type { EnqueueNotification } from '../notification/notification.service';
import type { RecordAudit } from '../audit/audit.service';
import type { ReviewResponse } from './review.schemas';

export interface CreateReviewInput {
  contractId: string;
  authorId: string;
  rating: number;
  comment: string;
}

export class ReviewService {
  constructor(
    private readonly reviewRepo: Repository<Review>,
    private readonly contractRepo: Repository<Contract>,
    private readonly enqueueNotification: EnqueueNotification,
    private readonly recordAudit: RecordAudit,
  ) {}

  async create(input: CreateReviewInput): Promise<ReviewResponse> {
    const contract = await this.contractRepo.findOne({ where: { id: input.contractId } });
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado');
    }
    const participants = [contract.clientId, contract.professionalId];
    if (!participants.includes(input.authorId)) {
      throw new ForbiddenError('Autor não participa do contrato');
    }
    if (contract.status !== 'completed') {
      throw new ConflictError('Contrato não concluído');
    }
    const existing = await this.reviewRepo.findOne({
      where: { contractId: input.contractId, authorId: input.authorId },
    });
    if (existing) {
      throw new ConflictError('Avaliação já registrada para este contrato');
    }
    const targetId = input.authorId === contract.clientId ? contract.professionalId : contract.clientId;
    const entity = this.reviewRepo.create({
      contractId: input.contractId,
      authorId: input.authorId,
      targetId,
      rating: input.rating,
      comment: input.comment,
    });
    const saved = await this.reviewRepo.save(entity);
    await this.enqueueNotification({
      userId: targetId,
      type: 'review_received',
      title: 'Você recebeu uma avaliação',
      body: `Nota ${input.rating}`,
      channels: ['in_app', 'push'],
    });
    await this.recordAudit({ userId: input.authorId, action: 'review.created', entityType: 'review', entityId: saved.id });
    return this.toResponse(saved);
  }

  async listForProfessional(professionalId: string, page: number, limit: number) {
    const [rows, total] = await this.reviewRepo.findAndCount({
      where: { targetId: professionalId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((r) => this.toResponse(r)), page, limit, total };
  }

  private toResponse(review: Review): ReviewResponse {
    return {
      id: review.id,
      contractId: review.contractId,
      authorId: review.authorId,
      targetId: review.targetId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd backend && npx vitest run src/modules/review/review.service.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 6: Escrever controller + routes**

`backend/src/modules/review/review.controller.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ReviewService } from './review.service';
import type { CreateReviewBody } from './review.schemas';

export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  create = async (
    request: FastifyRequest<{ Body: CreateReviewBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.create({ ...request.body, authorId: request.user.id });
    return reply.status(201).send(result);
  };

  listForProfessional = async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const { page, limit } = request.query;
    const result = await this.service.listForProfessional(request.params.id, page, limit);
    return reply.send(result);
  };
}
```

`backend/src/modules/review/review.routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';
import { Review } from './entities/review.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { enqueueNotification } from '../notification/notification.service';
import { recordAudit } from '../audit/audit.service';
import { paginationQuerySchema, idParamSchema, paginatedResponse } from '../../shared/schemas';
import { createReviewBodySchema, reviewResponseSchema } from './review.schemas';

export async function reviewRoutes(app: FastifyInstance) {
  const service = new ReviewService(
    AppDataSource.getRepository(Review),
    AppDataSource.getRepository(Contract),
    enqueueNotification,
    recordAudit,
  );
  const controller = new ReviewController(service);

  app.post('/reviews', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['review'],
      summary: 'Criar avaliação mútua de um contrato concluído',
      body: createReviewBodySchema,
      response: { 201: reviewResponseSchema },
    },
    handler: controller.create,
  });

  app.get('/professionals/:id/reviews', {
    schema: {
      tags: ['review'],
      summary: 'Listar avaliações de um profissional',
      params: idParamSchema,
      querystring: paginationQuerySchema,
      response: { 200: paginatedResponse(reviewResponseSchema) },
    },
    handler: controller.listForProfessional,
  });
}
```

- [ ] **Step 7: Registrar rota no app e escrever teste de integração**

Em `backend/src/app.ts`, dentro de `buildApp`, adicionar `await app.register(reviewRoutes)`.

`backend/src/modules/review/review.routes.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';
import { createClient, createProfessional, createCompletedContract, authHeader } from '../../test/factories';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('POST /reviews', () => {
  it('cria avaliação e retorna 201', async () => {
    const client = await createClient();
    const pro = await createProfessional();
    const contract = await createCompletedContract({ clientId: client.id, professionalId: pro.id });
    const res = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: authHeader(client),
      payload: { contractId: contract.id, rating: 5, comment: 'Excelente' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ targetId: pro.id, rating: 5 });
  });

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'POST', url: '/reviews', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 8: Rodar integração e confirmar verde**

Run: `cd backend && npx vitest run src/modules/review/review.routes.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/review backend/src/app.ts
git commit -m "feat(review): avaliação mútua de contratos concluídos"
```

---

## Task 2: Módulo social — favorites, reports, user_blocks

**Files:**
- Create: `backend/src/modules/social/social.schemas.ts`
- Create: `backend/src/modules/social/social.service.ts`
- Create: `backend/src/modules/social/social.controller.ts`
- Create: `backend/src/modules/social/social.routes.ts`
- Test: `backend/src/modules/social/social.service.test.ts`
- Test: `backend/src/modules/social/social.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `Favorite`, `Report`, `UserBlock` entities; `AppDataSource`; `AppError` subclasses; `app.authenticate`; `recordAudit`.
- Produces: `socialService.addFavorite`, `removeFavorite`, `listFavorites`, `createReport`, `blockUser`, `unblockUser`, `listBlocks`. `SocialService.isBlockedBetween(a: string, b: string): Promise<boolean>` reusado pelo chat (Task 4).

- [ ] **Step 1: Escrever schemas Zod falhando**

`backend/src/modules/social/social.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const reportTargetTypeSchema = z
  .enum(['user', 'demand', 'contract', 'message'])
  .describe('Tipo do alvo da denúncia')
  .openapi({ example: 'user' });

export const createFavoriteBodySchema = z.object({
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional a favoritar')
    .openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
});

export const createReportBodySchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid().describe('ID do alvo').openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000004' }),
  reason: z
    .enum(['spam', 'fraud', 'abuse', 'inappropriate', 'other'])
    .describe('Motivo da denúncia')
    .openapi({ example: 'abuse' }),
  description: z.string().min(3).max(2000).describe('Detalhes').openapi({ example: 'Mensagens ofensivas.' }),
});

export const createBlockBodySchema = z.object({
  blockedId: z.string().uuid().describe('Usuário a bloquear').openapi({ example: 'e1b2c3d4-0000-4000-8000-000000000005' }),
});

export const favoriteResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'f1b2c3d4-0000-4000-8000-000000000006' }),
  professionalId: z.string().uuid().describe('Profissional').openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  createdAt: z.string().datetime().describe('Criado em').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const reportResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'a2b2c3d4-0000-4000-8000-000000000007' }),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).describe('Status').openapi({ example: 'open' }),
});

export const blockResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'b3b2c3d4-0000-4000-8000-000000000008' }),
  blockedId: z.string().uuid().describe('Bloqueado').openapi({ example: 'e1b2c3d4-0000-4000-8000-000000000005' }),
});

export type CreateFavoriteBody = z.infer<typeof createFavoriteBodySchema>;
export type CreateReportBody = z.infer<typeof createReportBodySchema>;
export type CreateBlockBody = z.infer<typeof createBlockBodySchema>;
```

- [ ] **Step 2: Escrever teste unit falhando**

`backend/src/modules/social/social.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialService } from './social.service';
import { ConflictError } from '../../shared/errors';

function makeDeps() {
  const favoriteRepo = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'fav-1', createdAt: new Date('2026-07-01T12:00:00.000Z') })),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const reportRepo = {
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'rep-1', status: 'open' })),
  };
  const blockRepo = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'blk-1' })),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    count: vi.fn().mockResolvedValue(0),
  };
  const recordAudit = vi.fn().mockResolvedValue(undefined);
  const service = new SocialService(favoriteRepo as never, reportRepo as never, blockRepo as never, recordAudit);
  return { service, favoriteRepo, reportRepo, blockRepo, recordAudit };
}

describe('SocialService', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('favorita profissional novo', async () => {
    const result = await deps.service.addFavorite('user-1', 'pro-1');
    expect(result.professionalId).toBe('pro-1');
  });

  it('impede favorito duplicado', async () => {
    deps.favoriteRepo.findOne.mockResolvedValue({ id: 'fav-1' });
    await expect(deps.service.addFavorite('user-1', 'pro-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('cria denúncia com status open e audita', async () => {
    const result = await deps.service.createReport('user-1', {
      targetType: 'user',
      targetId: 'pro-1',
      reason: 'abuse',
      description: 'x',
    });
    expect(result.status).toBe('open');
    expect(deps.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'report.created' }));
  });

  it('impede autobloqueio', async () => {
    await expect(deps.service.blockUser('user-1', 'user-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('isBlockedBetween true quando há bloqueio em qualquer direção', async () => {
    deps.blockRepo.count.mockResolvedValue(1);
    await expect(deps.service.isBlockedBetween('a', 'b')).resolves.toBe(true);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/modules/social/social.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar o service**

`backend/src/modules/social/social.service.ts`:
```ts
import type { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Report } from './entities/report.entity';
import { UserBlock } from './entities/user-block.entity';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type { RecordAudit } from '../audit/audit.service';
import type { CreateReportBody } from './social.schemas';

export class SocialService {
  constructor(
    private readonly favoriteRepo: Repository<Favorite>,
    private readonly reportRepo: Repository<Report>,
    private readonly blockRepo: Repository<UserBlock>,
    private readonly recordAudit: RecordAudit,
  ) {}

  async addFavorite(userId: string, professionalId: string) {
    const existing = await this.favoriteRepo.findOne({ where: { userId, professionalId } });
    if (existing) {
      throw new ConflictError('Profissional já favoritado');
    }
    const saved = await this.favoriteRepo.save(this.favoriteRepo.create({ userId, professionalId }));
    return { id: saved.id, professionalId: saved.professionalId, createdAt: saved.createdAt.toISOString() };
  }

  async removeFavorite(userId: string, professionalId: string) {
    const result = await this.favoriteRepo.delete({ userId, professionalId });
    if (!result.affected) {
      throw new NotFoundError('Favorito não encontrado');
    }
  }

  async listFavorites(userId: string, page: number, limit: number) {
    const [rows, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((r) => ({ id: r.id, professionalId: r.professionalId, createdAt: r.createdAt.toISOString() })),
      page,
      limit,
      total,
    };
  }

  async createReport(reporterId: string, body: CreateReportBody) {
    const saved = await this.reportRepo.save(
      this.reportRepo.create({
        reporterId,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        description: body.description,
        status: 'open',
      }),
    );
    await this.recordAudit({ userId: reporterId, action: 'report.created', entityType: 'report', entityId: saved.id });
    return { id: saved.id, status: saved.status };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ConflictError('Não é possível bloquear a si mesmo');
    }
    const existing = await this.blockRepo.findOne({ where: { blockerId, blockedId } });
    if (existing) {
      throw new ConflictError('Usuário já bloqueado');
    }
    const saved = await this.blockRepo.save(this.blockRepo.create({ blockerId, blockedId }));
    await this.recordAudit({ userId: blockerId, action: 'user.blocked', entityType: 'user', entityId: blockedId });
    return { id: saved.id, blockedId: saved.blockedId };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const result = await this.blockRepo.delete({ blockerId, blockedId });
    if (!result.affected) {
      throw new NotFoundError('Bloqueio não encontrado');
    }
  }

  async listBlocks(blockerId: string, page: number, limit: number) {
    const [rows, total] = await this.blockRepo.findAndCount({
      where: { blockerId },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((r) => ({ id: r.id, blockedId: r.blockedId })), page, limit, total };
  }

  async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return count > 0;
  }
}
```

- [ ] **Step 5: Rodar unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/social/social.service.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 6: Escrever controller + routes**

`backend/src/modules/social/social.controller.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SocialService } from './social.service';
import type { CreateFavoriteBody, CreateReportBody, CreateBlockBody } from './social.schemas';

export class SocialController {
  constructor(private readonly service: SocialService) {}

  addFavorite = async (req: FastifyRequest<{ Body: CreateFavoriteBody }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.addFavorite(req.user.id, req.body.professionalId));
  };

  removeFavorite = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeFavorite(req.user.id, req.params.id);
    return reply.status(204).send();
  };

  listFavorites = async (
    req: FastifyRequest<{ Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    return reply.send(await this.service.listFavorites(req.user.id, req.query.page, req.query.limit));
  };

  createReport = async (req: FastifyRequest<{ Body: CreateReportBody }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.createReport(req.user.id, req.body));
  };

  blockUser = async (req: FastifyRequest<{ Body: CreateBlockBody }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.blockUser(req.user.id, req.body.blockedId));
  };

  unblockUser = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.unblockUser(req.user.id, req.params.id);
    return reply.status(204).send();
  };

  listBlocks = async (
    req: FastifyRequest<{ Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    return reply.send(await this.service.listBlocks(req.user.id, req.query.page, req.query.limit));
  };
}
```

`backend/src/modules/social/social.routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';
import { Favorite } from './entities/favorite.entity';
import { Report } from './entities/report.entity';
import { UserBlock } from './entities/user-block.entity';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { recordAudit } from '../audit/audit.service';
import { idParamSchema, paginationQuerySchema, paginatedResponse } from '../../shared/schemas';
import {
  createFavoriteBodySchema,
  favoriteResponseSchema,
  createReportBodySchema,
  reportResponseSchema,
  createBlockBodySchema,
  blockResponseSchema,
} from './social.schemas';

export async function socialRoutes(app: FastifyInstance) {
  const service = new SocialService(
    AppDataSource.getRepository(Favorite),
    AppDataSource.getRepository(Report),
    AppDataSource.getRepository(UserBlock),
    recordAudit,
  );
  const controller = new SocialController(service);
  const auth = { onRequest: [app.authenticate] };

  app.post('/favorites', { ...auth, schema: { tags: ['social'], summary: 'Favoritar profissional', body: createFavoriteBodySchema, response: { 201: favoriteResponseSchema } }, handler: controller.addFavorite });
  app.delete('/favorites/:id', { ...auth, schema: { tags: ['social'], summary: 'Remover favorito', params: idParamSchema, response: { 204: z.void() } }, handler: controller.removeFavorite });
  app.get('/favorites', { ...auth, schema: { tags: ['social'], summary: 'Listar favoritos', querystring: paginationQuerySchema, response: { 200: paginatedResponse(favoriteResponseSchema) } }, handler: controller.listFavorites });
  app.post('/reports', { ...auth, schema: { tags: ['social'], summary: 'Criar denúncia', body: createReportBodySchema, response: { 201: reportResponseSchema } }, handler: controller.createReport });
  app.post('/blocks', { ...auth, schema: { tags: ['social'], summary: 'Bloquear usuário', body: createBlockBodySchema, response: { 201: blockResponseSchema } }, handler: controller.blockUser });
  app.delete('/blocks/:id', { ...auth, schema: { tags: ['social'], summary: 'Desbloquear usuário', params: idParamSchema, response: { 204: z.void() } }, handler: controller.unblockUser });
  app.get('/blocks', { ...auth, schema: { tags: ['social'], summary: 'Listar bloqueios', querystring: paginationQuerySchema, response: { 200: paginatedResponse(blockResponseSchema) } }, handler: controller.listBlocks });
}
```

Adicionar no topo do arquivo: `import { z } from 'zod';`. Registrar em `backend/src/app.ts`: `await app.register(socialRoutes)`.

- [ ] **Step 7: Escrever teste de integração**

`backend/src/modules/social/social.routes.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';
import { createClient, createProfessional, authHeader } from '../../test/factories';

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('social routes', () => {
  it('favorita e lista', async () => {
    const client = await createClient();
    const pro = await createProfessional();
    const create = await app.inject({ method: 'POST', url: '/favorites', headers: authHeader(client), payload: { professionalId: pro.id } });
    expect(create.statusCode).toBe(201);
    const list = await app.inject({ method: 'GET', url: '/favorites?page=1&limit=20', headers: authHeader(client) });
    expect(list.json().total).toBe(1);
  });

  it('bloquear a si mesmo retorna 409', async () => {
    const client = await createClient();
    const res = await app.inject({ method: 'POST', url: '/blocks', headers: authHeader(client), payload: { blockedId: client.id } });
    expect(res.statusCode).toBe(409);
  });
});
```

- [ ] **Step 8: Rodar integração e confirmar verde**

Run: `cd backend && npx vitest run src/modules/social/social.routes.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/social backend/src/app.ts
git commit -m "feat(social): favoritos, denúncias e bloqueio de usuários"
```

---

## Task 3: Módulo notification — service + fila BullMQ (base para chat/review)

Ordem: notification vem antes de chat porque review (Task 1) e chat (Task 4) chamam `enqueueNotification`. Já foi criado o esqueleto ao registrar Task 1; aqui completamos service, fila e worker.

**Files:**
- Create: `backend/src/modules/notification/notification.schemas.ts`
- Create: `backend/src/modules/notification/notification.queue.ts`
- Create: `backend/src/modules/notification/notification.service.ts`
- Create: `backend/src/modules/notification/notification.worker.ts`
- Create: `backend/src/modules/notification/notification.controller.ts`
- Create: `backend/src/modules/notification/notification.routes.ts`
- Test: `backend/src/modules/notification/notification.service.test.ts`
- Test: `backend/src/modules/notification/notification.worker.test.ts`
- Test: `backend/src/modules/notification/notification.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `Notification`, `PushDeviceToken` entities; `AppDataSource`; BullMQ `Queue`/`Worker`; Redis connection de `backend/src/infra/redis.ts`.
- Produces: `enqueueNotification: EnqueueNotification`; `notificationService.listForUser`, `markRead`, `getPreferences`, `updatePreferences`, `registerDeviceToken`. `EnqueueNotificationInput = { userId: string; type: string; title: string; body: string; channels: NotificationChannel[]; data?: Record<string, unknown> }`. `NotificationChannel = 'push' | 'in_app' | 'email'`.

- [ ] **Step 1: Escrever schemas Zod (channel ENUM)**

`backend/src/modules/notification/notification.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const notificationChannelSchema = z
  .enum(['push', 'in_app', 'email'])
  .describe('Canal de entrega da notificação')
  .openapi({ example: 'in_app' });

export const notificationResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'n1b2c3d4-0000-4000-8000-000000000010' }),
  type: z.string().describe('Tipo do evento').openapi({ example: 'review_received' }),
  title: z.string().describe('Título').openapi({ example: 'Você recebeu uma avaliação' }),
  body: z.string().describe('Corpo').openapi({ example: 'Nota 5' }),
  channel: notificationChannelSchema,
  readAt: z.string().datetime().nullable().describe('Lida em').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criada em').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const registerDeviceBodySchema = z.object({
  token: z.string().min(10).describe('Token do dispositivo').openapi({ example: 'fcm-token-xyz' }),
  platform: z.enum(['ios', 'android', 'web']).describe('Plataforma').openapi({ example: 'android' }),
});

export const preferencesResponseSchema = z.object({
  push: z.boolean().describe('Recebe push').openapi({ example: true }),
  email: z.boolean().describe('Recebe e-mail').openapi({ example: true }),
  inApp: z.boolean().describe('Recebe in-app').openapi({ example: true }),
});

export const updatePreferencesBodySchema = preferencesResponseSchema.partial();

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type RegisterDeviceBody = z.infer<typeof registerDeviceBodySchema>;
export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;
```

- [ ] **Step 2: Escrever teste unit do service (enqueue + fanout por canal)**

`backend/src/modules/notification/notification.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService, buildEnqueueNotification } from './notification.service';

function makeService() {
  const queue = { add: vi.fn().mockResolvedValue(undefined) };
  const notificationRepo = {
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    findOne: vi.fn(),
    save: vi.fn(async (v) => v),
    create: vi.fn((v) => v),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const deviceRepo = { findOne: vi.fn().mockResolvedValue(null), create: vi.fn((v) => v), save: vi.fn(async (v) => ({ ...v, id: 'd-1' })) };
  const service = new NotificationService(notificationRepo as never, deviceRepo as never);
  const enqueue = buildEnqueueNotification(queue as never);
  return { service, queue, notificationRepo, deviceRepo, enqueue };
}

describe('enqueueNotification', () => {
  it('adiciona um job por canal solicitado', async () => {
    const { queue, enqueue } = makeService();
    await enqueue({ userId: 'u-1', type: 'review_received', title: 't', body: 'b', channels: ['in_app', 'push', 'email'] });
    expect(queue.add).toHaveBeenCalledTimes(3);
    expect(queue.add).toHaveBeenCalledWith('deliver', expect.objectContaining({ channel: 'in_app' }), expect.any(Object));
  });
});

describe('NotificationService.markRead', () => {
  it('marca como lida', async () => {
    const { service, notificationRepo } = makeService();
    await service.markRead('u-1', 'n-1');
    expect(notificationRepo.update).toHaveBeenCalledWith({ id: 'n-1', userId: 'u-1' }, expect.objectContaining({ readAt: expect.any(Date) }));
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/modules/notification/notification.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar fila, service e enqueue**

`backend/src/modules/notification/notification.queue.ts`:
```ts
import { Queue } from 'bullmq';
import { redisConnection } from '../../infra/redis';
import type { NotificationChannel } from './notification.schemas';

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  data?: Record<string, unknown>;
}

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export const notificationQueue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
  connection: redisConnection,
});
```

`backend/src/modules/notification/notification.service.ts`:
```ts
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PushDeviceToken } from './entities/push-device-token.entity';
import { NotFoundError } from '../../shared/errors';
import type { NotificationJobData } from './notification.queue';
import { notificationQueue } from './notification.queue';
import type { NotificationChannel, RegisterDeviceBody, UpdatePreferencesBody } from './notification.schemas';

export interface EnqueueNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
}

export type EnqueueNotification = (input: EnqueueNotificationInput) => Promise<void>;

export function buildEnqueueNotification(queue: Queue<NotificationJobData>): EnqueueNotification {
  return async (input) => {
    await Promise.all(
      input.channels.map((channel) =>
        queue.add(
          'deliver',
          { userId: input.userId, type: input.type, title: input.title, body: input.body, channel, data: input.data },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true },
        ),
      ),
    );
  };
}

export const enqueueNotification: EnqueueNotification = buildEnqueueNotification(notificationQueue);

export class NotificationService {
  constructor(
    private readonly notificationRepo: Repository<Notification>,
    private readonly deviceRepo: Repository<PushDeviceToken>,
  ) {}

  async listForUser(userId: string, page: number, limit: number) {
    const [rows, total] = await this.notificationRepo.findAndCount({
      where: { userId, channel: 'in_app' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        channel: n.channel,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
    };
  }

  async markRead(userId: string, id: string) {
    const result = await this.notificationRepo.update({ id, userId }, { readAt: new Date() });
    if (!result.affected) {
      throw new NotFoundError('Notificação não encontrada');
    }
  }

  async registerDeviceToken(userId: string, body: RegisterDeviceBody) {
    const existing = await this.deviceRepo.findOne({ where: { token: body.token } });
    if (existing) {
      return { id: existing.id };
    }
    const saved = await this.deviceRepo.save(
      this.deviceRepo.create({ userId, token: body.token, platform: body.platform }),
    );
    return { id: saved.id };
  }
}
```

- [ ] **Step 5: Rodar unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/notification/notification.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Escrever teste do worker (persistência in_app + push por token)**

`backend/src/modules/notification/notification.worker.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { processNotificationJob } from './notification.worker';

function makeDeps() {
  const notificationRepo = { create: vi.fn((v) => v), save: vi.fn(async (v) => ({ ...v, id: 'n-1' })) };
  const deviceRepo = { find: vi.fn().mockResolvedValue([{ token: 't-1' }]) };
  const pushProvider = { send: vi.fn().mockResolvedValue(undefined) };
  const emailProvider = { send: vi.fn().mockResolvedValue(undefined) };
  return { notificationRepo, deviceRepo, pushProvider, emailProvider };
}

describe('processNotificationJob', () => {
  it('persiste notificação in_app', async () => {
    const deps = makeDeps();
    await processNotificationJob(
      { userId: 'u-1', type: 'x', title: 't', body: 'b', channel: 'in_app' },
      deps as never,
    );
    expect(deps.notificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ channel: 'in_app', userId: 'u-1' }));
  });

  it('envia push para cada device token e registra a notificação', async () => {
    const deps = makeDeps();
    await processNotificationJob(
      { userId: 'u-1', type: 'x', title: 't', body: 'b', channel: 'push' },
      deps as never,
    );
    expect(deps.pushProvider.send).toHaveBeenCalledWith('t-1', expect.objectContaining({ title: 't' }));
    expect(deps.notificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ channel: 'push' }));
  });
});
```

- [ ] **Step 7: Implementar worker**

`backend/src/modules/notification/notification.worker.ts`:
```ts
import { Worker } from 'bullmq';
import type { Repository } from 'typeorm';
import { redisConnection } from '../../infra/redis';
import { AppDataSource } from '../../infra/database/data-source';
import { Notification } from './entities/notification.entity';
import { PushDeviceToken } from './entities/push-device-token.entity';
import { NOTIFICATION_QUEUE_NAME, type NotificationJobData } from './notification.queue';
import { pushProvider } from './providers/push.provider';
import { emailProvider } from './providers/email.provider';

export interface NotificationWorkerDeps {
  notificationRepo: Repository<Notification>;
  deviceRepo: Repository<PushDeviceToken>;
  pushProvider: { send: (token: string, payload: { title: string; body: string }) => Promise<void> };
  emailProvider: { send: (userId: string, payload: { title: string; body: string }) => Promise<void> };
}

export async function processNotificationJob(data: NotificationJobData, deps: NotificationWorkerDeps): Promise<void> {
  const record = deps.notificationRepo.create({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    channel: data.channel,
  });
  await deps.notificationRepo.save(record);

  if (data.channel === 'push') {
    const tokens = await deps.deviceRepo.find({ where: { userId: data.userId } });
    await Promise.all(tokens.map((t) => deps.pushProvider.send(t.token, { title: data.title, body: data.body })));
  }
  if (data.channel === 'email') {
    await deps.emailProvider.send(data.userId, { title: data.title, body: data.body });
  }
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  const deps: NotificationWorkerDeps = {
    notificationRepo: AppDataSource.getRepository(Notification),
    deviceRepo: AppDataSource.getRepository(PushDeviceToken),
    pushProvider,
    emailProvider,
  };
  return new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job) => processNotificationJob(job.data, deps),
    { connection: redisConnection },
  );
}
```

Criar providers abstraídos (spec §8: provider concreto fora de escopo):

`backend/src/modules/notification/providers/push.provider.ts`:
```ts
export const pushProvider = {
  async send(_token: string, _payload: { title: string; body: string }): Promise<void> {},
};
```

`backend/src/modules/notification/providers/email.provider.ts`:
```ts
export const emailProvider = {
  async send(_userId: string, _payload: { title: string; body: string }): Promise<void> {},
};
```

- [ ] **Step 8: Rodar worker unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/notification/notification.worker.test.ts`
Expected: PASS.

- [ ] **Step 9: Escrever controller + routes + integração**

`backend/src/modules/notification/notification.controller.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NotificationService } from './notification.service';
import type { RegisterDeviceBody } from './notification.schemas';

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list = async (req: FastifyRequest<{ Querystring: { page: number; limit: number } }>, reply: FastifyReply) => {
    return reply.send(await this.service.listForUser(req.user.id, req.query.page, req.query.limit));
  };

  markRead = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.markRead(req.user.id, req.params.id);
    return reply.status(204).send();
  };

  registerDevice = async (req: FastifyRequest<{ Body: RegisterDeviceBody }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.registerDeviceToken(req.user.id, req.body));
  };
}
```

`backend/src/modules/notification/notification.routes.ts`:
```ts
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';
import { Notification } from './entities/notification.entity';
import { PushDeviceToken } from './entities/push-device-token.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { idParamSchema, paginationQuerySchema, paginatedResponse } from '../../shared/schemas';
import { notificationResponseSchema, registerDeviceBodySchema } from './notification.schemas';

export async function notificationRoutes(app: FastifyInstance) {
  const service = new NotificationService(
    AppDataSource.getRepository(Notification),
    AppDataSource.getRepository(PushDeviceToken),
  );
  const controller = new NotificationController(service);
  const auth = { onRequest: [app.authenticate] };

  app.get('/notifications', { ...auth, schema: { tags: ['notification'], summary: 'Listar notificações in-app', querystring: paginationQuerySchema, response: { 200: paginatedResponse(notificationResponseSchema) } }, handler: controller.list });
  app.patch('/notifications/:id/read', { ...auth, schema: { tags: ['notification'], summary: 'Marcar notificação como lida', params: idParamSchema, response: { 204: z.void() } }, handler: controller.markRead });
  app.post('/notifications/devices', { ...auth, schema: { tags: ['notification'], summary: 'Registrar token de push', body: registerDeviceBodySchema, response: { 201: z.object({ id: z.string().uuid().describe('ID').openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000011' }) }) } }, handler: controller.registerDevice });
}
```

Registrar em `backend/src/app.ts`: `await app.register(notificationRoutes)`. Iniciar worker no bootstrap (`backend/src/server.ts`): `startNotificationWorker()`.

`backend/src/modules/notification/notification.routes.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';
import { createClient, authHeader } from '../../test/factories';

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('notification routes', () => {
  it('lista vazio para usuário novo', async () => {
    const user = await createClient();
    const res = await app.inject({ method: 'GET', url: '/notifications?page=1&limit=20', headers: authHeader(user) });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
  });

  it('registra device token', async () => {
    const user = await createClient();
    const res = await app.inject({ method: 'POST', url: '/notifications/devices', headers: authHeader(user), payload: { token: 'fcm-token-1234567890', platform: 'android' } });
    expect(res.statusCode).toBe(201);
  });
});
```

- [ ] **Step 10: Rodar integração e confirmar verde**

Run: `cd backend && npx vitest run src/modules/notification/notification.routes.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/notification backend/src/app.ts backend/src/server.ts
git commit -m "feat(notification): entrega multicanal via BullMQ e preferências"
```

---

## Task 4: Módulo chat — chat_rooms + messages via socket.io (autenticado, persistente)

**Files:**
- Create: `backend/src/modules/chat/chat.schemas.ts`
- Create: `backend/src/modules/chat/chat.service.ts`
- Create: `backend/src/modules/chat/chat.controller.ts`
- Create: `backend/src/modules/chat/chat.routes.ts`
- Create: `backend/src/modules/chat/chat.gateway.ts`
- Test: `backend/src/modules/chat/chat.service.test.ts`
- Test: `backend/src/modules/chat/chat.gateway.test.ts`
- Test: `backend/src/modules/chat/chat.routes.test.ts`
- Modify: `backend/src/app.ts`, `backend/src/server.ts`

**Interfaces:**
- Consumes: `ChatRoom`, `Message` entities; `AppDataSource`; `socketAuth` (verifica JWT no handshake); `SocialService.isBlockedBetween`; `enqueueNotification`.
- Produces: `chatService.getOrCreateRoom(a: string, b: string, contractId?: string): Promise<ChatRoomResponse>`, `chatService.listMessages`, `chatService.sendMessage(roomId, senderId, content)`. `registerChatGateway(io: Server, service: ChatService, socialService: SocialService, verifyToken): void`.

- [ ] **Step 1: Escrever schemas Zod**

`backend/src/modules/chat/chat.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const createRoomBodySchema = z.object({
  participantId: z.string().uuid().describe('Outro participante').openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  contractId: z.string().uuid().nullable().optional().describe('Contrato vinculado').openapi({ example: null }),
});

export const chatRoomResponseSchema = z.object({
  id: z.string().uuid().describe('ID da sala').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000020' }),
  participantAId: z.string().uuid().describe('Participante A').openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  participantBId: z.string().uuid().describe('Participante B').openapi({ example: 'c1b2c3d4-0000-4000-8000-000000000003' }),
  contractId: z.string().uuid().nullable().describe('Contrato').openapi({ example: null }),
});

export const messageResponseSchema = z.object({
  id: z.string().uuid().describe('ID da mensagem').openapi({ example: 'm1b2c3d4-0000-4000-8000-000000000021' }),
  roomId: z.string().uuid().describe('Sala').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000020' }),
  senderId: z.string().uuid().describe('Remetente').openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000001' }),
  content: z.string().describe('Conteúdo').openapi({ example: 'Olá, tudo bem?' }),
  createdAt: z.string().datetime().describe('Enviada em').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const sendMessageSocketSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type ChatRoomResponse = z.infer<typeof chatRoomResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
```

- [ ] **Step 2: Escrever teste unit do service**

`backend/src/modules/chat/chat.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './chat.service';
import { ForbiddenError, NotFoundError } from '../../shared/errors';

function makeDeps() {
  const roomRepo = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'room-1' })),
  };
  const messageRepo = {
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'msg-1', createdAt: new Date('2026-07-01T12:00:00.000Z') })),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  const social = { isBlockedBetween: vi.fn().mockResolvedValue(false) };
  const enqueueNotification = vi.fn().mockResolvedValue(undefined);
  const service = new ChatService(roomRepo as never, messageRepo as never, social as never, enqueueNotification);
  return { service, roomRepo, messageRepo, social, enqueueNotification };
}

describe('ChatService', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('normaliza os participantes ao criar a sala', async () => {
    const room = await deps.service.getOrCreateRoom('zzz', 'aaa');
    expect(room.participantAId).toBe('aaa');
    expect(room.participantBId).toBe('zzz');
  });

  it('reaproveita sala existente', async () => {
    deps.roomRepo.findOne.mockResolvedValue({ id: 'room-x', participantAId: 'aaa', participantBId: 'zzz', contractId: null });
    const room = await deps.service.getOrCreateRoom('zzz', 'aaa');
    expect(room.id).toBe('room-x');
    expect(deps.roomRepo.save).not.toHaveBeenCalled();
  });

  it('bloqueia mensagem entre usuários bloqueados', async () => {
    deps.roomRepo.findOne.mockResolvedValue({ id: 'room-1', participantAId: 'aaa', participantBId: 'zzz', contractId: null });
    deps.social.isBlockedBetween.mockResolvedValue(true);
    await expect(deps.service.sendMessage('room-1', 'aaa', 'oi')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('persiste mensagem e notifica o destinatário', async () => {
    deps.roomRepo.findOne.mockResolvedValue({ id: 'room-1', participantAId: 'aaa', participantBId: 'zzz', contractId: null });
    const msg = await deps.service.sendMessage('room-1', 'aaa', 'oi');
    expect(msg.content).toBe('oi');
    expect(deps.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'zzz', type: 'chat_message' }));
  });

  it('rejeita envio por quem não é participante', async () => {
    deps.roomRepo.findOne.mockResolvedValue({ id: 'room-1', participantAId: 'aaa', participantBId: 'zzz', contractId: null });
    await expect(deps.service.sendMessage('room-1', 'intruso', 'oi')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lança NotFound para sala inexistente', async () => {
    await expect(deps.service.sendMessage('nope', 'aaa', 'oi')).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/modules/chat/chat.service.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar o service**

`backend/src/modules/chat/chat.service.ts`:
```ts
import type { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import type { SocialService } from '../social/social.service';
import type { EnqueueNotification } from '../notification/notification.service';
import type { ChatRoomResponse, MessageResponse } from './chat.schemas';

export class ChatService {
  constructor(
    private readonly roomRepo: Repository<ChatRoom>,
    private readonly messageRepo: Repository<Message>,
    private readonly social: SocialService,
    private readonly enqueueNotification: EnqueueNotification,
  ) {}

  async getOrCreateRoom(userA: string, userB: string, contractId?: string | null): Promise<ChatRoomResponse> {
    const [participantAId, participantBId] = [userA, userB].sort();
    const existing = await this.roomRepo.findOne({ where: { participantAId, participantBId } });
    if (existing) {
      return this.toRoom(existing);
    }
    const saved = await this.roomRepo.save(
      this.roomRepo.create({ participantAId, participantBId, contractId: contractId ?? null }),
    );
    return this.toRoom(saved);
  }

  async listMessages(roomId: string, userId: string, page: number, limit: number) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundError('Sala não encontrada');
    }
    this.assertParticipant(room, userId);
    const [rows, total] = await this.messageRepo.findAndCount({
      where: { roomId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((m) => this.toMessage(m)), page, limit, total };
  }

  async sendMessage(roomId: string, senderId: string, content: string): Promise<MessageResponse> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundError('Sala não encontrada');
    }
    this.assertParticipant(room, senderId);
    const recipientId = room.participantAId === senderId ? room.participantBId : room.participantAId;
    if (await this.social.isBlockedBetween(senderId, recipientId)) {
      throw new ForbiddenError('Conversa bloqueada entre os usuários');
    }
    const saved = await this.messageRepo.save(this.messageRepo.create({ roomId, senderId, content }));
    await this.enqueueNotification({
      userId: recipientId,
      type: 'chat_message',
      title: 'Nova mensagem',
      body: content.slice(0, 120),
      channels: ['in_app', 'push'],
      data: { roomId },
    });
    return this.toMessage(saved);
  }

  private assertParticipant(room: ChatRoom, userId: string) {
    if (room.participantAId !== userId && room.participantBId !== userId) {
      throw new ForbiddenError('Usuário não participa da sala');
    }
  }

  private toRoom(room: ChatRoom): ChatRoomResponse {
    return { id: room.id, participantAId: room.participantAId, participantBId: room.participantBId, contractId: room.contractId };
  }

  private toMessage(message: Message): MessageResponse {
    return { id: message.id, roomId: message.roomId, senderId: message.senderId, content: message.content, createdAt: message.createdAt.toISOString() };
  }
}
```

- [ ] **Step 5: Rodar unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/chat/chat.service.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 6: Escrever teste do gateway socket.io (auth + join + message)**

`backend/src/modules/chat/chat.gateway.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { handleConnection, socketAuthMiddleware } from './chat.gateway';

describe('socketAuthMiddleware', () => {
  it('rejeita handshake sem token', async () => {
    const verifyToken = vi.fn();
    const next = vi.fn();
    const socket = { handshake: { auth: {} } } as never;
    await socketAuthMiddleware(verifyToken)(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('popula socket.data.userId com token válido', async () => {
    const verifyToken = vi.fn().mockReturnValue({ id: 'u-1', role: 'client' });
    const next = vi.fn();
    const socket = { handshake: { auth: { token: 'jwt' } }, data: {} } as never;
    await socketAuthMiddleware(verifyToken)(socket, next);
    expect(socket.data.userId).toBe('u-1');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('handleConnection', () => {
  it('persiste e emite mensagem para a sala ao receber send_message', async () => {
    const service = { sendMessage: vi.fn().mockResolvedValue({ id: 'm-1', roomId: 'room-1', senderId: 'u-1', content: 'oi', createdAt: '2026-07-01T12:00:00.000Z' }) };
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const handlers: Record<string, (payload: unknown) => Promise<void>> = {};
    const socket = {
      data: { userId: 'u-1' },
      join: vi.fn(),
      on: vi.fn((event: string, cb: (payload: unknown) => Promise<void>) => {
        handlers[event] = cb;
      }),
    };
    const io = { to } as never;
    handleConnection(io, service as never)(socket as never);
    await handlers['send_message']({ roomId: 'room-1', content: 'oi' });
    expect(service.sendMessage).toHaveBeenCalledWith('room-1', 'u-1', 'oi');
    expect(to).toHaveBeenCalledWith('room-1');
    expect(emit).toHaveBeenCalledWith('message', expect.objectContaining({ id: 'm-1' }));
  });
});
```

- [ ] **Step 7: Implementar o gateway**

`backend/src/modules/chat/chat.gateway.ts`:
```ts
import type { Server, Socket } from 'socket.io';
import type { ChatService } from './chat.service';
import { sendMessageSocketSchema } from './chat.schemas';

export interface TokenPayload {
  id: string;
  role: 'client' | 'professional' | 'admin';
}

export type VerifyToken = (token: string) => TokenPayload;

export function socketAuthMiddleware(verifyToken: VerifyToken) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('unauthorized'));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.id;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  };
}

export function handleConnection(io: Server, service: ChatService) {
  return (socket: Socket) => {
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });
    socket.on('send_message', async (payload: unknown) => {
      const parsed = sendMessageSocketSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'BAD_REQUEST' });
        return;
      }
      try {
        const message = await service.sendMessage(parsed.data.roomId, socket.data.userId, parsed.data.content);
        io.to(parsed.data.roomId).emit('message', message);
      } catch (err) {
        socket.emit('error', { code: err instanceof Error ? err.message : 'ERROR' });
      }
    });
  };
}

export function registerChatGateway(io: Server, service: ChatService, verifyToken: VerifyToken): void {
  io.use(socketAuthMiddleware(verifyToken));
  io.on('connection', handleConnection(io, service));
}
```

- [ ] **Step 8: Rodar gateway unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/chat/chat.gateway.test.ts`
Expected: PASS.

- [ ] **Step 9: Controller + routes REST (histórico + criar sala) + integração**

`backend/src/modules/chat/chat.controller.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ChatService } from './chat.service';
import type { CreateRoomBody } from './chat.schemas';

export class ChatController {
  constructor(private readonly service: ChatService) {}

  createRoom = async (req: FastifyRequest<{ Body: CreateRoomBody }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.getOrCreateRoom(req.user.id, req.body.participantId, req.body.contractId ?? null));
  };

  listMessages = async (
    req: FastifyRequest<{ Params: { id: string }; Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    return reply.send(await this.service.listMessages(req.params.id, req.user.id, req.query.page, req.query.limit));
  };
}
```

`backend/src/modules/chat/chat.routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';
import { Favorite } from '../social/entities/favorite.entity';
import { Report } from '../social/entities/report.entity';
import { UserBlock } from '../social/entities/user-block.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SocialService } from '../social/social.service';
import { enqueueNotification } from '../notification/notification.service';
import { recordAudit } from '../audit/audit.service';
import { idParamSchema, paginationQuerySchema, paginatedResponse } from '../../shared/schemas';
import { createRoomBodySchema, chatRoomResponseSchema, messageResponseSchema } from './chat.schemas';

export function buildChatService(): ChatService {
  const social = new SocialService(
    AppDataSource.getRepository(Favorite),
    AppDataSource.getRepository(Report),
    AppDataSource.getRepository(UserBlock),
    recordAudit,
  );
  return new ChatService(
    AppDataSource.getRepository(ChatRoom),
    AppDataSource.getRepository(Message),
    social,
    enqueueNotification,
  );
}

export async function chatRoutes(app: FastifyInstance) {
  const controller = new ChatController(buildChatService());
  const auth = { onRequest: [app.authenticate] };

  app.post('/chat/rooms', { ...auth, schema: { tags: ['chat'], summary: 'Abrir ou reaproveitar sala de chat', body: createRoomBodySchema, response: { 201: chatRoomResponseSchema } }, handler: controller.createRoom });
  app.get('/chat/rooms/:id/messages', { ...auth, schema: { tags: ['chat'], summary: 'Histórico de mensagens da sala', params: idParamSchema, querystring: paginationQuerySchema, response: { 200: paginatedResponse(messageResponseSchema) } }, handler: controller.listMessages });
}
```

Registrar em `backend/src/app.ts`: `await app.register(chatRoutes)`. Em `backend/src/server.ts`, após criar `httpServer`: montar socket.io e `registerChatGateway(io, buildChatService(), verifyAccessToken)` reutilizando `verifyAccessToken` do módulo auth.

`backend/src/modules/chat/chat.routes.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';
import { createClient, createProfessional, authHeader } from '../../test/factories';

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('chat REST', () => {
  it('cria sala e reaproveita ao chamar de novo', async () => {
    const client = await createClient();
    const pro = await createProfessional();
    const first = await app.inject({ method: 'POST', url: '/chat/rooms', headers: authHeader(client), payload: { participantId: pro.id } });
    const second = await app.inject({ method: 'POST', url: '/chat/rooms', headers: authHeader(pro), payload: { participantId: client.id } });
    expect(first.json().id).toBe(second.json().id);
  });
});
```

- [ ] **Step 10: Rodar integração e confirmar verde**

Run: `cd backend && npx vitest run src/modules/chat/chat.routes.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/chat backend/src/app.ts backend/src/server.ts
git commit -m "feat(chat): salas persistentes e mensagens em tempo real via socket.io"
```

---

## Task 5: Módulo audit — audit_logs (user_id nullable)

Criar antes dos consumidores em produção, mas os módulos anteriores já importaram `recordAudit`; aqui implementamos de fato.

**Files:**
- Create: `backend/src/modules/audit/audit.schemas.ts`
- Create: `backend/src/modules/audit/audit.service.ts`
- Test: `backend/src/modules/audit/audit.service.test.ts`

**Interfaces:**
- Consumes: `AuditLog` entity (com `userId: string | null`); `AppDataSource`.
- Produces: `recordAudit: RecordAudit`; `auditService.list(filters, page, limit)`. `RecordAuditInput = { userId?: string | null; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }`.

- [ ] **Step 1: Escrever teste unit falhando**

`backend/src/modules/audit/audit.service.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { buildRecordAudit, AuditService } from './audit.service';

function makeRepo() {
  return {
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => ({ ...v, id: 'a-1', createdAt: new Date('2026-07-01T12:00:00.000Z') })),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
}

describe('recordAudit', () => {
  it('grava log com userId null quando ação de sistema', async () => {
    const repo = makeRepo();
    const record = buildRecordAudit(repo as never);
    await record({ action: 'system.cron', entityType: 'job', entityId: 'j-1' });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: null, action: 'system.cron' }));
  });

  it('grava log com userId quando ação de usuário', async () => {
    const repo = makeRepo();
    const record = buildRecordAudit(repo as never);
    await record({ userId: 'u-1', action: 'review.created', entityType: 'review', entityId: 'r-1' });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-1' }));
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/modules/audit/audit.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar schemas + service**

`backend/src/modules/audit/audit.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const auditLogResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000030' }),
  userId: z.string().uuid().nullable().describe('Usuário (nulo para ações de sistema)').openapi({ example: null }),
  action: z.string().describe('Ação').openapi({ example: 'review.created' }),
  entityType: z.string().describe('Tipo da entidade').openapi({ example: 'review' }),
  entityId: z.string().describe('ID da entidade').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000031' }),
  createdAt: z.string().datetime().describe('Registrado em').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});
```

`backend/src/modules/audit/audit.service.ts`:
```ts
import type { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AppDataSource } from '../../infra/database/data-source';

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export type RecordAudit = (input: RecordAuditInput) => Promise<void>;

export function buildRecordAudit(repo: Repository<AuditLog>): RecordAudit {
  return async (input) => {
    await repo.save(
      repo.create({
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? null,
      }),
    );
  };
}

export const recordAudit: RecordAudit = (input) => buildRecordAudit(AppDataSource.getRepository(AuditLog))(input);

export class AuditService {
  constructor(private readonly repo: Repository<AuditLog>) {}

  async list(filters: { userId?: string; action?: string }, page: number, limit: number) {
    const where: Record<string, string> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((l) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
    };
  }
}
```

Nota: `recordAudit` usa `AppDataSource.getRepository` lazily; nos testes de módulos anteriores ele é injetado via mock, evitando dependência de banco no unit.

- [ ] **Step 4: Rodar e confirmar verde**

Run: `cd backend && npx vitest run src/modules/audit/audit.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/audit
git commit -m "feat(audit): registro de ações com user_id nullable"
```

---

## Task 6: Módulo admin — moderação de usuários, denúncias, disputas + auditoria

**Files:**
- Create: `backend/src/modules/admin/admin.schemas.ts`
- Create: `backend/src/modules/admin/admin.service.ts`
- Create: `backend/src/modules/admin/admin.controller.ts`
- Create: `backend/src/modules/admin/admin.routes.ts`
- Test: `backend/src/modules/admin/admin.service.test.ts`
- Test: `backend/src/modules/admin/admin.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `User`, `Report`, `ContractDispute`, `AuditLog` entities; `requireRole('admin')`; `recordAudit`; `AuditService.list`; `enqueueNotification`.
- Produces: `adminService.setUserStatus`, `listReports`, `resolveReport`, `listDisputes`, `resolveDispute`, `listAudit`.

- [ ] **Step 1: Escrever schemas Zod**

`backend/src/modules/admin/admin.schemas.ts`:
```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const userStatusSchema = z
  .enum(['active', 'suspended', 'banned'])
  .describe('Status de moderação do usuário')
  .openapi({ example: 'suspended' });

export const setUserStatusBodySchema = z.object({
  status: userStatusSchema,
  reason: z.string().min(3).max(500).describe('Justificativa').openapi({ example: 'Violação das diretrizes.' }),
});

export const resolveReportBodySchema = z.object({
  resolution: z.enum(['resolved', 'dismissed']).describe('Desfecho').openapi({ example: 'resolved' }),
  note: z.string().max(1000).optional().describe('Nota interna').openapi({ example: 'Usuário advertido.' }),
});

export const resolveDisputeBodySchema = z.object({
  outcome: z.enum(['refund_client', 'release_professional', 'split']).describe('Resultado da disputa').openapi({ example: 'refund_client' }),
  note: z.string().max(1000).describe('Fundamentação').openapi({ example: 'Serviço não entregue.' }),
});

export const adminUserResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'u1b2c3d4-0000-4000-8000-000000000040' }),
  status: userStatusSchema,
});

export const adminReportResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000041' }),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).describe('Status').openapi({ example: 'resolved' }),
});

export const adminDisputeResponseSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: 'd1b2c3d4-0000-4000-8000-000000000042' }),
  status: z.enum(['open', 'resolved']).describe('Status').openapi({ example: 'resolved' }),
  outcome: z.enum(['refund_client', 'release_professional', 'split']).nullable().describe('Resultado').openapi({ example: 'refund_client' }),
});

export type SetUserStatusBody = z.infer<typeof setUserStatusBodySchema>;
export type ResolveReportBody = z.infer<typeof resolveReportBodySchema>;
export type ResolveDisputeBody = z.infer<typeof resolveDisputeBodySchema>;
```

- [ ] **Step 2: Escrever teste unit falhando**

`backend/src/modules/admin/admin.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service';
import { NotFoundError } from '../../shared/errors';

function makeDeps() {
  const userRepo = { findOne: vi.fn().mockResolvedValue({ id: 'u-1', status: 'active' }), update: vi.fn().mockResolvedValue({ affected: 1 }) };
  const reportRepo = { findOne: vi.fn().mockResolvedValue({ id: 'rep-1', status: 'open' }), update: vi.fn().mockResolvedValue({ affected: 1 }), findAndCount: vi.fn().mockResolvedValue([[], 0]) };
  const disputeRepo = { findOne: vi.fn().mockResolvedValue({ id: 'disp-1', status: 'open', contractId: 'c-1' }), update: vi.fn().mockResolvedValue({ affected: 1 }), findAndCount: vi.fn().mockResolvedValue([[], 0]) };
  const recordAudit = vi.fn().mockResolvedValue(undefined);
  const enqueueNotification = vi.fn().mockResolvedValue(undefined);
  const service = new AdminService(userRepo as never, reportRepo as never, disputeRepo as never, recordAudit, enqueueNotification);
  return { service, userRepo, reportRepo, disputeRepo, recordAudit, enqueueNotification };
}

describe('AdminService', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('suspende usuário, audita e notifica', async () => {
    const result = await deps.service.setUserStatus('admin-1', 'u-1', { status: 'suspended', reason: 'x' });
    expect(result.status).toBe('suspended');
    expect(deps.userRepo.update).toHaveBeenCalledWith({ id: 'u-1' }, { status: 'suspended' });
    expect(deps.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ userId: 'admin-1', action: 'admin.user.status_changed' }));
    expect(deps.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-1' }));
  });

  it('resolve denúncia', async () => {
    const result = await deps.service.resolveReport('admin-1', 'rep-1', { resolution: 'resolved' });
    expect(result.status).toBe('resolved');
    expect(deps.reportRepo.update).toHaveBeenCalledWith({ id: 'rep-1' }, { status: 'resolved' });
  });

  it('resolve disputa com outcome e audita', async () => {
    const result = await deps.service.resolveDispute('admin-1', 'disp-1', { outcome: 'refund_client', note: 'x' });
    expect(result.outcome).toBe('refund_client');
    expect(deps.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.dispute.resolved' }));
  });

  it('lança NotFound ao moderar usuário inexistente', async () => {
    deps.userRepo.findOne.mockResolvedValue(null);
    await expect(deps.service.setUserStatus('admin-1', 'nope', { status: 'banned', reason: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `cd backend && npx vitest run src/modules/admin/admin.service.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar o service**

`backend/src/modules/admin/admin.service.ts`:
```ts
import type { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Report } from '../social/entities/report.entity';
import { ContractDispute } from '../contract/entities/contract-dispute.entity';
import { NotFoundError } from '../../shared/errors';
import type { RecordAudit } from '../audit/audit.service';
import type { EnqueueNotification } from '../notification/notification.service';
import type { ResolveDisputeBody, ResolveReportBody, SetUserStatusBody } from './admin.schemas';

export class AdminService {
  constructor(
    private readonly userRepo: Repository<User>,
    private readonly reportRepo: Repository<Report>,
    private readonly disputeRepo: Repository<ContractDispute>,
    private readonly recordAudit: RecordAudit,
    private readonly enqueueNotification: EnqueueNotification,
  ) {}

  async setUserStatus(adminId: string, userId: string, body: SetUserStatusBody) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    await this.userRepo.update({ id: userId }, { status: body.status });
    await this.recordAudit({
      userId: adminId,
      action: 'admin.user.status_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { status: body.status, reason: body.reason },
    });
    await this.enqueueNotification({
      userId,
      type: 'account_moderated',
      title: 'Status da conta atualizado',
      body: `Novo status: ${body.status}`,
      channels: ['in_app', 'email'],
    });
    return { id: userId, status: body.status };
  }

  async listReports(status: string | undefined, page: number, limit: number) {
    const where = status ? { status } : {};
    const [rows, total] = await this.reportRepo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { items: rows.map((r) => ({ id: r.id, status: r.status })), page, limit, total };
  }

  async resolveReport(adminId: string, reportId: string, body: ResolveReportBody) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundError('Denúncia não encontrada');
    }
    await this.reportRepo.update({ id: reportId }, { status: body.resolution });
    await this.recordAudit({ userId: adminId, action: 'admin.report.resolved', entityType: 'report', entityId: reportId, metadata: { resolution: body.resolution, note: body.note } });
    return { id: reportId, status: body.resolution };
  }

  async listDisputes(status: string | undefined, page: number, limit: number) {
    const where = status ? { status } : {};
    const [rows, total] = await this.disputeRepo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { items: rows.map((d) => ({ id: d.id, status: d.status, outcome: d.outcome ?? null })), page, limit, total };
  }

  async resolveDispute(adminId: string, disputeId: string, body: ResolveDisputeBody) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId } });
    if (!dispute) {
      throw new NotFoundError('Disputa não encontrada');
    }
    await this.disputeRepo.update({ id: disputeId }, { status: 'resolved', outcome: body.outcome });
    await this.recordAudit({ userId: adminId, action: 'admin.dispute.resolved', entityType: 'contract_dispute', entityId: disputeId, metadata: { outcome: body.outcome, note: body.note } });
    return { id: disputeId, status: 'resolved' as const, outcome: body.outcome };
  }
}
```

- [ ] **Step 5: Rodar unit e confirmar verde**

Run: `cd backend && npx vitest run src/modules/admin/admin.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Controller + routes (protegidas por requireRole('admin'))**

`backend/src/modules/admin/admin.controller.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { AppDataSource } from '../../infra/database/data-source';
import { AuditLog } from '../audit/entities/audit-log.entity';
import type { ResolveDisputeBody, ResolveReportBody, SetUserStatusBody } from './admin.schemas';

export class AdminController {
  private readonly auditService = new AuditService(AppDataSource.getRepository(AuditLog));
  constructor(private readonly service: AdminService) {}

  setUserStatus = async (req: FastifyRequest<{ Params: { id: string }; Body: SetUserStatusBody }>, reply: FastifyReply) => {
    return reply.send(await this.service.setUserStatus(req.user.id, req.params.id, req.body));
  };

  listReports = async (req: FastifyRequest<{ Querystring: { page: number; limit: number; status?: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.listReports(req.query.status, req.query.page, req.query.limit));
  };

  resolveReport = async (req: FastifyRequest<{ Params: { id: string }; Body: ResolveReportBody }>, reply: FastifyReply) => {
    return reply.send(await this.service.resolveReport(req.user.id, req.params.id, req.body));
  };

  listDisputes = async (req: FastifyRequest<{ Querystring: { page: number; limit: number; status?: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.listDisputes(req.query.status, req.query.page, req.query.limit));
  };

  resolveDispute = async (req: FastifyRequest<{ Params: { id: string }; Body: ResolveDisputeBody }>, reply: FastifyReply) => {
    return reply.send(await this.service.resolveDispute(req.user.id, req.params.id, req.body));
  };

  listAudit = async (req: FastifyRequest<{ Querystring: { page: number; limit: number; userId?: string; action?: string } }>, reply: FastifyReply) => {
    return reply.send(await this.auditService.list({ userId: req.query.userId, action: req.query.action }, req.query.page, req.query.limit));
  };
}
```

`backend/src/modules/admin/admin.routes.ts`:
```ts
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../infra/database/data-source';
import { User } from '../user/entities/user.entity';
import { Report } from '../social/entities/report.entity';
import { ContractDispute } from '../contract/entities/contract-dispute.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { recordAudit } from '../audit/audit.service';
import { enqueueNotification } from '../notification/notification.service';
import { requireRole } from '../../shared/middlewares/require-role';
import { idParamSchema, paginationQuerySchema, paginatedResponse } from '../../shared/schemas';
import { auditLogResponseSchema } from '../audit/audit.schemas';
import {
  setUserStatusBodySchema,
  adminUserResponseSchema,
  resolveReportBodySchema,
  adminReportResponseSchema,
  resolveDisputeBodySchema,
  adminDisputeResponseSchema,
} from './admin.schemas';

const adminListQuery = paginationQuerySchema.extend({
  status: z.string().optional().describe('Filtro por status').openapi({ example: 'open' }),
});
const auditListQuery = paginationQuerySchema.extend({
  userId: z.string().uuid().optional().describe('Filtro por usuário').openapi({ example: 'u1b2c3d4-0000-4000-8000-000000000040' }),
  action: z.string().optional().describe('Filtro por ação').openapi({ example: 'admin.user.status_changed' }),
});

export async function adminRoutes(app: FastifyInstance) {
  const service = new AdminService(
    AppDataSource.getRepository(User),
    AppDataSource.getRepository(Report),
    AppDataSource.getRepository(ContractDispute),
    recordAudit,
    enqueueNotification,
  );
  const controller = new AdminController(service);
  const guard = { onRequest: [app.authenticate, requireRole('admin')] };

  app.patch('/admin/users/:id/status', { ...guard, schema: { tags: ['admin'], summary: 'Alterar status de moderação', params: idParamSchema, body: setUserStatusBodySchema, response: { 200: adminUserResponseSchema } }, handler: controller.setUserStatus });
  app.get('/admin/reports', { ...guard, schema: { tags: ['admin'], summary: 'Listar denúncias', querystring: adminListQuery, response: { 200: paginatedResponse(adminReportResponseSchema) } }, handler: controller.listReports });
  app.patch('/admin/reports/:id', { ...guard, schema: { tags: ['admin'], summary: 'Resolver denúncia', params: idParamSchema, body: resolveReportBodySchema, response: { 200: adminReportResponseSchema } }, handler: controller.resolveReport });
  app.get('/admin/disputes', { ...guard, schema: { tags: ['admin'], summary: 'Listar disputas', querystring: adminListQuery, response: { 200: paginatedResponse(adminDisputeResponseSchema) } }, handler: controller.listDisputes });
  app.patch('/admin/disputes/:id', { ...guard, schema: { tags: ['admin'], summary: 'Resolver disputa de contrato', params: idParamSchema, body: resolveDisputeBodySchema, response: { 200: adminDisputeResponseSchema } }, handler: controller.resolveDispute });
  app.get('/admin/audit', { ...guard, schema: { tags: ['admin'], summary: 'Consultar trilha de auditoria', querystring: auditListQuery, response: { 200: paginatedResponse(auditLogResponseSchema) } }, handler: controller.listAudit });
}
```

Registrar em `backend/src/app.ts`: `await app.register(adminRoutes)`.

- [ ] **Step 7: Escrever teste de integração (RBAC + fluxo)**

`backend/src/modules/admin/admin.routes.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';
import { createClient, createAdmin, authHeader } from '../../test/factories';

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('admin RBAC', () => {
  it('nega acesso a não-admin com 403', async () => {
    const client = await createClient();
    const res = await app.inject({ method: 'GET', url: '/admin/reports?page=1&limit=20', headers: authHeader(client) });
    expect(res.statusCode).toBe(403);
  });

  it('admin suspende usuário', async () => {
    const admin = await createAdmin();
    const target = await createClient();
    const res = await app.inject({ method: 'PATCH', url: `/admin/users/${target.id}/status`, headers: authHeader(admin), payload: { status: 'suspended', reason: 'teste' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('suspended');
  });
});
```

- [ ] **Step 8: Rodar integração e confirmar verde**

Run: `cd backend && npx vitest run src/modules/admin/admin.routes.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/admin backend/src/app.ts
git commit -m "feat(admin): moderação de usuários, denúncias e disputas com auditoria"
```

---

## Task 7: Frontend — feature notifications (in-app + preferências)

**Files:**
- Create: `frontend/src/features/notifications/api.ts`
- Create: `frontend/src/features/notifications/queries.ts`
- Create: `frontend/src/features/notifications/schemas.ts`
- Create: `frontend/src/features/notifications/components/NotificationBell.tsx`
- Create: `frontend/src/features/notifications/pages/NotificationsPage.tsx`
- Test: `frontend/src/features/notifications/notifications.test.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `lib/http.ts` axios; `lib/queryClient.ts`; `ProtectedRoute`.
- Produces: `useNotifications()`, `useMarkNotificationRead()`.

- [ ] **Step 1: Escrever teste RTL falhando**

`frontend/src/features/notifications/notifications.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsPage } from './pages/NotificationsPage';
import { http } from '../../lib/http';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), patch: vi.fn() } }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockResolvedValue({
      data: { items: [{ id: 'n-1', type: 'review_received', title: 'Nova avaliação', body: 'Nota 5', channel: 'in_app', readAt: null, createdAt: '2026-07-01T12:00:00.000Z' }], page: 1, limit: 20, total: 1 },
    });
  });

  it('renderiza notificações carregadas', async () => {
    renderWithClient(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('Nova avaliação')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd frontend && npx vitest run src/features/notifications/notifications.test.tsx`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementar schemas + api + queries**

`frontend/src/features/notifications/schemas.ts`:
```ts
import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  channel: z.enum(['push', 'in_app', 'email']),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const notificationsPageSchema = z.object({
  items: z.array(notificationSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type Notification = z.infer<typeof notificationSchema>;
```

`frontend/src/features/notifications/api.ts`:
```ts
import { http } from '../../lib/http';
import { notificationsPageSchema } from './schemas';

export async function fetchNotifications(page = 1, limit = 20) {
  const { data } = await http.get('/notifications', { params: { page, limit } });
  return notificationsPageSchema.parse(data);
}

export async function markNotificationRead(id: string) {
  await http.patch(`/notifications/${id}/read`);
}
```

`frontend/src/features/notifications/queries.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from './api';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.all, queryFn: () => fetchNotifications() });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
```

- [ ] **Step 4: Implementar componentes e página**

`frontend/src/features/notifications/pages/NotificationsPage.tsx`:
```tsx
import { useNotifications, useMarkNotificationRead } from '../queries';

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <p>Carregando…</p>;
  }
  return (
    <ul className="divide-y divide-slate-200">
      {data?.items.map((n) => (
        <li key={n.id} className="flex items-start justify-between gap-4 py-3">
          <div>
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-slate-500">{n.body}</p>
          </div>
          {!n.readAt && (
            <button type="button" className="text-sm text-indigo-600" onClick={() => markRead.mutate(n.id)}>
              Marcar lida
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/features/notifications/components/NotificationBell.tsx`:
```tsx
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../queries';

export function NotificationBell() {
  const { data } = useNotifications();
  const unread = data?.items.filter((n) => !n.readAt).length ?? 0;
  return (
    <span className="relative inline-flex">
      <BellIcon className="h-6 w-6 text-slate-600" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white">{unread}</span>
      )}
    </span>
  );
}
```

Adicionar rota protegida em `frontend/src/router/index.tsx`: `{ path: '/notifications', element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> }`.

- [ ] **Step 5: Rodar teste e confirmar verde**

Run: `cd frontend && npx vitest run src/features/notifications/notifications.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/notifications frontend/src/router/index.tsx
git commit -m "feat(notifications): central in-app com badge de não lidas"
```

---

## Task 8: Frontend — feature chat (socket.io-client, salas, mensagens)

**Files:**
- Create: `frontend/src/features/chat/socket.ts`
- Create: `frontend/src/features/chat/api.ts`
- Create: `frontend/src/features/chat/queries.ts`
- Create: `frontend/src/features/chat/schemas.ts`
- Create: `frontend/src/features/chat/components/ChatWindow.tsx`
- Create: `frontend/src/features/chat/pages/ChatPage.tsx`
- Test: `frontend/src/features/chat/chat.test.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `lib/http.ts`; `stores/auth.ts` (`accessToken`); `socket.io-client`.
- Produces: `useChatSocket(roomId)`, `useMessages(roomId)`, `useCreateRoom()`.

- [ ] **Step 1: Escrever teste RTL falhando (mock socket + histórico)**

`frontend/src/features/chat/chat.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatWindow } from './components/ChatWindow';
import { http } from '../../lib/http';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./socket', () => ({
  getChatSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockResolvedValue({
      data: { items: [{ id: 'm-1', roomId: 'room-1', senderId: 'u-2', content: 'Olá', createdAt: '2026-07-01T12:00:00.000Z' }], page: 1, limit: 20, total: 1 },
    });
  });

  it('renderiza o histórico da sala', async () => {
    renderWithClient(<ChatWindow roomId="room-1" />);
    await waitFor(() => expect(screen.getByText('Olá')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd frontend && npx vitest run src/features/chat/chat.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar socket + schemas + api + queries**

`frontend/src/features/chat/socket.ts`:
```ts
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/auth';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      auth: { token: useAuthStore.getState().accessToken },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

`frontend/src/features/chat/schemas.ts`:
```ts
import { z } from 'zod';

export const messageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
});

export const messagesPageSchema = z.object({
  items: z.array(messageSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type Message = z.infer<typeof messageSchema>;
```

`frontend/src/features/chat/api.ts`:
```ts
import { http } from '../../lib/http';
import { messagesPageSchema, messageSchema } from './schemas';

export async function fetchMessages(roomId: string, page = 1, limit = 20) {
  const { data } = await http.get(`/chat/rooms/${roomId}/messages`, { params: { page, limit } });
  return messagesPageSchema.parse(data);
}

export async function createRoom(participantId: string, contractId?: string | null) {
  const { data } = await http.post('/chat/rooms', { participantId, contractId: contractId ?? null });
  return z.object({ id: z.string().uuid() }).parse(data);
}

import { z } from 'zod';
```

`frontend/src/features/chat/queries.ts`:
```ts
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, createRoom } from './api';
import { getChatSocket } from './socket';
import { messageSchema, type Message } from './schemas';

export const chatKeys = {
  messages: (roomId: string) => ['chat', 'messages', roomId] as const,
};

export function useMessages(roomId: string) {
  return useQuery({ queryKey: chatKeys.messages(roomId), queryFn: () => fetchMessages(roomId) });
}

export function useChatSocket(roomId: string) {
  const client = useQueryClient();
  useEffect(() => {
    const socket = getChatSocket();
    socket.emit('join_room', roomId);
    const onMessage = (raw: unknown) => {
      const message = messageSchema.parse(raw);
      if (message.roomId !== roomId) {
        return;
      }
      client.setQueryData(chatKeys.messages(roomId), (prev: { items: Message[] } | undefined) =>
        prev ? { ...prev, items: [message, ...prev.items], total: prev.items.length + 1 } : prev,
      );
    };
    socket.on('message', onMessage);
    return () => {
      socket.off('message', onMessage);
    };
  }, [roomId, client]);

  const send = (content: string) => getChatSocket().emit('send_message', { roomId, content });
  return { send };
}

export function useCreateRoom() {
  return useMutation({ mutationFn: (input: { participantId: string; contractId?: string | null }) => createRoom(input.participantId, input.contractId) });
}
```

- [ ] **Step 4: Implementar componentes e página**

`frontend/src/features/chat/components/ChatWindow.tsx`:
```tsx
import { useState } from 'react';
import { useMessages, useChatSocket } from '../queries';

export function ChatWindow({ roomId }: { roomId: string }) {
  const { data, isLoading } = useMessages(roomId);
  const { send } = useChatSocket(roomId);
  const [draft, setDraft] = useState('');

  if (isLoading) {
    return <p>Carregando…</p>;
  }
  return (
    <div className="flex h-full flex-col">
      <ul className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {data?.items.map((m) => (
          <li key={m.id} className="rounded bg-slate-100 px-3 py-2 text-sm">
            {m.content}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
      >
        <input className="flex-1 rounded border px-3 py-2" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Mensagem" />
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white">Enviar</button>
      </form>
    </div>
  );
}
```

`frontend/src/features/chat/pages/ChatPage.tsx`:
```tsx
import { useParams } from 'react-router-dom';
import { ChatWindow } from '../components/ChatWindow';

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) {
    return <p>Selecione uma conversa.</p>;
  }
  return <ChatWindow roomId={roomId} />;
}
```

Adicionar rota protegida em `frontend/src/router/index.tsx`: `{ path: '/chat/:roomId', element: <ProtectedRoute><ChatPage /></ProtectedRoute> }`.

- [ ] **Step 5: Rodar teste e confirmar verde**

Run: `cd frontend && npx vitest run src/features/chat/chat.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/chat frontend/src/router/index.tsx
git commit -m "feat(chat): janela de conversa em tempo real com socket.io-client"
```

---

## Task 9: Frontend — feature admin (dashboard moderação/disputas)

**Files:**
- Create: `frontend/src/features/admin/api.ts`
- Create: `frontend/src/features/admin/queries.ts`
- Create: `frontend/src/features/admin/schemas.ts`
- Create: `frontend/src/features/admin/components/ReportsTable.tsx`
- Create: `frontend/src/features/admin/components/DisputesTable.tsx`
- Create: `frontend/src/features/admin/pages/AdminDashboardPage.tsx`
- Test: `frontend/src/features/admin/admin.test.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `lib/http.ts`; `ProtectedRoute` com role `admin`; `stores/auth.ts`.
- Produces: `useReports()`, `useResolveReport()`, `useDisputes()`, `useResolveDispute()`.

- [ ] **Step 1: Escrever teste RTL falhando**

`frontend/src/features/admin/admin.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { http } from '../../lib/http';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), patch: vi.fn() } }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/admin/reports') {
        return { data: { items: [{ id: 'rep-1', status: 'open' }], page: 1, limit: 20, total: 1 } };
      }
      return { data: { items: [{ id: 'disp-1', status: 'open', outcome: null }], page: 1, limit: 20, total: 1 } };
    });
  });

  it('renderiza denúncias e disputas abertas', async () => {
    renderWithClient(<AdminDashboardPage />);
    await waitFor(() => expect(screen.getByText('rep-1')).toBeInTheDocument());
    expect(screen.getByText('disp-1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd frontend && npx vitest run src/features/admin/admin.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar schemas + api + queries**

`frontend/src/features/admin/schemas.ts`:
```ts
import { z } from 'zod';

export const adminReportSchema = z.object({ id: z.string().uuid(), status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']) });
export const adminDisputeSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'resolved']),
  outcome: z.enum(['refund_client', 'release_professional', 'split']).nullable(),
});
export const reportsPageSchema = z.object({ items: z.array(adminReportSchema), page: z.number(), limit: z.number(), total: z.number() });
export const disputesPageSchema = z.object({ items: z.array(adminDisputeSchema), page: z.number(), limit: z.number(), total: z.number() });

export type AdminReport = z.infer<typeof adminReportSchema>;
export type AdminDispute = z.infer<typeof adminDisputeSchema>;
```

`frontend/src/features/admin/api.ts`:
```ts
import { http } from '../../lib/http';
import { reportsPageSchema, disputesPageSchema } from './schemas';

export async function fetchReports() {
  const { data } = await http.get('/admin/reports', { params: { page: 1, limit: 20 } });
  return reportsPageSchema.parse(data);
}

export async function resolveReport(id: string, resolution: 'resolved' | 'dismissed') {
  await http.patch(`/admin/reports/${id}`, { resolution });
}

export async function fetchDisputes() {
  const { data } = await http.get('/admin/disputes', { params: { page: 1, limit: 20 } });
  return disputesPageSchema.parse(data);
}

export async function resolveDispute(id: string, outcome: 'refund_client' | 'release_professional' | 'split', note: string) {
  await http.patch(`/admin/disputes/${id}`, { outcome, note });
}
```

`frontend/src/features/admin/queries.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReports, resolveReport, fetchDisputes, resolveDispute } from './api';

export const adminKeys = {
  reports: ['admin', 'reports'] as const,
  disputes: ['admin', 'disputes'] as const,
};

export function useReports() {
  return useQuery({ queryKey: adminKeys.reports, queryFn: fetchReports });
}

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; resolution: 'resolved' | 'dismissed' }) => resolveReport(input.id, input.resolution),
    onSuccess: () => client.invalidateQueries({ queryKey: adminKeys.reports }),
  });
}

export function useDisputes() {
  return useQuery({ queryKey: adminKeys.disputes, queryFn: fetchDisputes });
}

export function useResolveDispute() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; outcome: 'refund_client' | 'release_professional' | 'split'; note: string }) =>
      resolveDispute(input.id, input.outcome, input.note),
    onSuccess: () => client.invalidateQueries({ queryKey: adminKeys.disputes }),
  });
}
```

- [ ] **Step 4: Implementar componentes e página**

`frontend/src/features/admin/components/ReportsTable.tsx`:
```tsx
import { useReports, useResolveReport } from '../queries';

export function ReportsTable() {
  const { data } = useReports();
  const resolve = useResolveReport();
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th className="py-2">Denúncia</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {data?.items.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="py-2">{r.id}</td>
            <td>{r.status}</td>
            <td>
              <button type="button" className="text-indigo-600" onClick={() => resolve.mutate({ id: r.id, resolution: 'resolved' })}>
                Resolver
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`frontend/src/features/admin/components/DisputesTable.tsx`:
```tsx
import { useDisputes, useResolveDispute } from '../queries';

export function DisputesTable() {
  const { data } = useDisputes();
  const resolve = useResolveDispute();
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th className="py-2">Disputa</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {data?.items.map((d) => (
          <tr key={d.id} className="border-t">
            <td className="py-2">{d.id}</td>
            <td>{d.status}</td>
            <td>
              <button type="button" className="text-indigo-600" onClick={() => resolve.mutate({ id: d.id, outcome: 'refund_client', note: 'Resolvido pelo admin' })}>
                Reembolsar cliente
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`frontend/src/features/admin/pages/AdminDashboardPage.tsx`:
```tsx
import { ReportsTable } from '../components/ReportsTable';
import { DisputesTable } from '../components/DisputesTable';

export function AdminDashboardPage() {
  return (
    <div className="space-y-8 p-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Denúncias</h2>
        <ReportsTable />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Disputas</h2>
        <DisputesTable />
      </section>
    </div>
  );
}
```

Adicionar rota em `frontend/src/router/index.tsx`: `{ path: '/admin', element: <ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute> }`.

- [ ] **Step 5: Rodar teste e confirmar verde**

Run: `cd frontend && npx vitest run src/features/admin/admin.test.tsx`
Expected: PASS.

- [ ] **Step 6: Rodar suíte completa da fase (typecheck + lint + testes)**

Run backend: `cd backend && npm run typecheck && npm run lint && npx vitest run`
Run frontend: `cd frontend && npm run typecheck && npm run lint && npx vitest run`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/admin frontend/src/router/index.tsx
git commit -m "feat(admin): dashboard de moderação de denúncias e disputas"
```

---

## Self-Review

**Spec coverage (§3 Social/Comunicação/Auditoria + §fase 11):**
- review (avaliação mútua) → Task 1. ✅
- favorites/reports/user_blocks → Task 2. ✅
- notifications channel ENUM push/in_app/email + BullMQ workers + push_device_tokens → Task 3. ✅
- chat_rooms/messages socket.io autenticado + persistência → Task 4. ✅
- audit_logs user_id nullable → Task 5. ✅
- admin moderação usuários/denúncias/disputas + auditoria → Task 6. ✅
- Frontend chat/notifications/admin → Tasks 7-9. ✅

**Placeholder scan:** Sem TBD/TODO; toda etapa de código traz código completo. Providers push/email são stubs intencionais (spec §8 YAGNI: provider concreto abstraído), documentado inline no plano.

**Type consistency:** `EnqueueNotification`/`EnqueueNotificationInput` (channels: NotificationChannel[]) usados idênticos em review/chat/admin. `RecordAudit`/`RecordAuditInput` idênticos em todos os consumidores. `notificationChannelSchema = z.enum(['push','in_app','email'])` casa com o ENUM `notifications.channel`. `isBlockedBetween` definido no social (Task 2) e consumido no chat (Task 4) com a mesma assinatura.

**Ordem de dependência:** notification (Task 3) e audit (Task 5) fornecem `enqueueNotification`/`recordAudit`; review/social/chat/admin importam esses símbolos. Nos unit tests eles são injetados como mocks, então cada task é testável isoladamente; a fiação real ocorre nas rotas.
