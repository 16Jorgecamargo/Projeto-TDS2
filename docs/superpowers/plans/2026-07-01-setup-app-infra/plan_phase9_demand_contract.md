# Fase 9 — Demand / Quote / Contract / Disputes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar o core transacional do fluxo de serviço — cliente publica demanda, profissionais enviam orçamentos, cliente aceita um orçamento que vira contrato, execução acompanhada por atualizações de progresso, com disputa quando necessário — mais as features frontend `demands` e `contracts`.

**Architecture:** Quatro módulos backend Fastify (`demand`, `quote`, `contract`, `dispute`) seguindo o padrão routes/controller/service/schemas + testes unit (mocka repos) e integração (`buildTestApp()` com banco real). Cada módulo consome os contratos fundacionais das fases 3-5 e as entidades TypeORM da fase 6. Frontend em React 19/Vite com TanStack Query + react-hook-form/Zod, features `demands` e `contracts`.

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, Zod + fastify-type-provider-zod + zod-openapi, Vitest; React 19 + Vite 6, TanStack Query 5, react-hook-form + Zod, axios, Tailwind 3, Vitest + Testing Library.

## Global Constraints

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. Docs de plano e mensagens de commit em pt-BR.
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M (`demand_tags`, `demand_invitations`).
- `contracts.cancelled_by` FK **nullable**.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

---

## Contratos consumidos (fases 3-5)

Não redefinir; importar. Assinaturas exatas:

```ts
import { buildApp } from '@/app';
import { buildTestApp } from '@/test/buildTestApp';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '@/shared/errors';
import {
  idParamSchema,
  paginationQuerySchema,
  paginatedResponse,
} from '@/shared/schemas';
import { createUser, createProfessional } from '@/test/factories';
```

- `app.authenticate` (preHandler) popula `request.user = { id: string; role: 'client' | 'professional' | 'admin' }`.
- `requireRole(...roles)` preHandler factory.
- `paginatedResponse(itemSchema)` → `z.object({ items: z.array(itemSchema), page, limit, total })`.
- Data source TypeORM em `@/infra/database/data-source` exporta `AppDataSource`. Services recebem repositórios via `AppDataSource.getRepository(Entity)`.

## Entidades consumidas (fase 6)

Definidas na fase 6; este plano assume os campos abaixo. Todas com `id: string` (uuid), `createdAt: Date`, `updatedAt: Date` salvo indicado.

```ts
// ServiceDemand
{ id, clientId, categoryId, title, description, budgetMin: string, budgetMax: string,
  status: 'open' | 'contracted' | 'closed' | 'cancelled', addressId: string | null }
// DemandImage
{ id, demandId, url, position: number }
// DemandTag  UNIQUE(demandId, tagId)
{ id, demandId, tagId }
// DemandInvitation  UNIQUE(demandId, professionalId)
{ id, demandId, professionalId, status: 'pending' | 'accepted' | 'declined' }
// Quote
{ id, demandId, professionalId, message, total: string,
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn', validUntil: Date | null }
// QuoteItem
{ id, quoteId, description, quantity: number, unitPrice: string, subtotal: string }
// Contract
{ id, demandId, quoteId, clientId, professionalId, total: string,
  status: 'active' | 'in_progress' | 'completed' | 'cancelled' | 'disputed',
  cancelledBy: string | null, cancellationReason: string | null,
  startedAt: Date | null, completedAt: Date | null }
// Schedule
{ id, contractId, scheduledStart: Date, scheduledEnd: Date, notes: string | null }
// ContractProgressUpdate
{ id, contractId, authorId, description, percentage: number }
// ContractProgressImage
{ id, progressUpdateId, url }
// ContractDispute
{ id, contractId, openedBy, reason,
  status: 'open' | 'under_review' | 'resolved' | 'rejected', resolution: string | null }
```

Enums TypeORM registrados na entidade; os schemas Zod usam `z.enum` com os mesmos valores.

## File Structure

```
backend/src/modules/demand/
  demand.schemas.ts        Zod request/response (describe+openapi)
  demand.service.ts        regra de negócio (repos ServiceDemand/DemandImage/DemandTag/DemandInvitation)
  demand.controller.ts     handlers finos
  demand.routes.ts         registro rotas + schema
  demand.service.test.ts   unit (mocka repos)
  demand.routes.test.ts    integração buildTestApp
backend/src/modules/quote/  (mesma estrutura, repos Quote/QuoteItem/ServiceDemand)
backend/src/modules/contract/ (repos Contract/Quote/Schedule/ContractProgressUpdate/ContractProgressImage)
backend/src/modules/dispute/  (repos ContractDispute/Contract)

frontend/src/features/demands/
  api.ts  queries.ts  schemas.ts
  components/DemandForm.tsx  components/DemandCard.tsx  components/InviteProfessionalDialog.tsx
  pages/DemandListPage.tsx  pages/DemandDetailPage.tsx  pages/PublishDemandPage.tsx
  demands.test.tsx
frontend/src/features/contracts/
  api.ts  queries.ts  schemas.ts
  components/ContractProgress.tsx  components/ProgressUpdateForm.tsx  components/DisputeDialog.tsx
  pages/ContractListPage.tsx  pages/ContractDetailPage.tsx
  contracts.test.tsx
```

Registro dos módulos: cada `*.routes.ts` exporta `async function <name>Routes(app: FastifyInstance)`; `buildApp` (fase 3) os registra sob prefixo `/api`.

---

## Task 1: Módulo `demand` — schemas

**Files:**
- Create: `backend/src/modules/demand/demand.schemas.ts`
- Test: (coberto via service/routes nas tasks seguintes)

**Interfaces:**
- Consumes: `paginationQuerySchema`, `paginatedResponse` de `@/shared/schemas`.
- Produces: `createDemandSchema`, `updateDemandSchema`, `demandResponseSchema`, `demandListQuerySchema`, `inviteProfessionalSchema`, `demandInvitationResponseSchema`, `demandStatusEnum`.

- [ ] **Step 1: Escrever os schemas**

```ts
import { z } from 'zod';
import { paginationQuerySchema, paginatedResponse } from '@/shared/schemas';

export const demandStatusEnum = z
  .enum(['open', 'contracted', 'closed', 'cancelled'])
  .describe('Estado da demanda')
  .openapi({ example: 'open' });

export const demandImageSchema = z.object({
  url: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/a.jpg' }),
  position: z.number().int().min(0).describe('Ordem de exibição').openapi({ example: 0 }),
});

export const createDemandSchema = z.object({
  categoryId: z.string().uuid().describe('Categoria do serviço').openapi({ example: '9f1c...' }),
  title: z.string().min(5).max(120).describe('Título da demanda').openapi({ example: 'Instalação elétrica' }),
  description: z.string().min(20).max(4000).describe('Descrição detalhada').openapi({ example: 'Preciso instalar 4 tomadas...' }),
  budgetMin: z.number().nonnegative().describe('Orçamento mínimo previsto').openapi({ example: 100 }),
  budgetMax: z.number().nonnegative().describe('Orçamento máximo previsto').openapi({ example: 500 }),
  addressId: z.string().uuid().nullable().describe('Endereço de execução').openapi({ example: null }),
  tagIds: z.array(z.string().uuid()).max(10).describe('Tags do serviço').openapi({ example: [] }),
  images: z.array(demandImageSchema).max(10).describe('Imagens da demanda').openapi({ example: [] }),
}).refine((v) => v.budgetMax >= v.budgetMin, {
  message: 'budgetMax deve ser >= budgetMin',
  path: ['budgetMax'],
});

export const updateDemandSchema = z.object({
  title: z.string().min(5).max(120).optional().describe('Título da demanda').openapi({ example: 'Instalação elétrica' }),
  description: z.string().min(20).max(4000).optional().describe('Descrição').openapi({ example: 'Atualizado...' }),
  budgetMin: z.number().nonnegative().optional().describe('Orçamento mínimo').openapi({ example: 100 }),
  budgetMax: z.number().nonnegative().optional().describe('Orçamento máximo').openapi({ example: 500 }),
});

export const demandResponseSchema = z.object({
  id: z.string().uuid().describe('ID da demanda').openapi({ example: '3b9...' }),
  clientId: z.string().uuid().describe('Cliente autor').openapi({ example: '1a2...' }),
  categoryId: z.string().uuid().describe('Categoria').openapi({ example: '9f1...' }),
  title: z.string().describe('Título').openapi({ example: 'Instalação elétrica' }),
  description: z.string().describe('Descrição').openapi({ example: 'Preciso...' }),
  budgetMin: z.number().describe('Orçamento mínimo').openapi({ example: 100 }),
  budgetMax: z.number().describe('Orçamento máximo').openapi({ example: 500 }),
  status: demandStatusEnum,
  addressId: z.string().uuid().nullable().describe('Endereço').openapi({ example: null }),
  images: z.array(demandImageSchema).describe('Imagens').openapi({ example: [] }),
  tagIds: z.array(z.string().uuid()).describe('Tags').openapi({ example: [] }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const demandListQuerySchema = paginationQuerySchema.extend({
  status: demandStatusEnum.optional(),
  categoryId: z.string().uuid().optional().describe('Filtro por categoria').openapi({ example: '9f1...' }),
  mine: z.coerce.boolean().optional().describe('Somente minhas demandas').openapi({ example: true }),
});

export const demandListResponseSchema = paginatedResponse(demandResponseSchema);

export const inviteProfessionalSchema = z.object({
  professionalId: z.string().uuid().describe('Profissional convidado').openapi({ example: '7c4...' }),
});

export const demandInvitationResponseSchema = z.object({
  id: z.string().uuid().describe('ID do convite').openapi({ example: '5d6...' }),
  demandId: z.string().uuid().describe('Demanda').openapi({ example: '3b9...' }),
  professionalId: z.string().uuid().describe('Profissional').openapi({ example: '7c4...' }),
  status: z.enum(['pending', 'accepted', 'declined']).describe('Estado do convite').openapi({ example: 'pending' }),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type DemandResponse = z.infer<typeof demandResponseSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/demand/demand.schemas.ts
git commit -m "feat(demand): adiciona schemas zod da demanda"
```

---

## Task 2: Módulo `demand` — service (criar/listar/detalhe)

**Files:**
- Create: `backend/src/modules/demand/demand.service.ts`
- Test: `backend/src/modules/demand/demand.service.test.ts`

**Interfaces:**
- Consumes: entidades `ServiceDemand`, `DemandImage`, `DemandTag` (fase 6); `NotFoundError`, `ForbiddenError` de `@/shared/errors`.
- Produces:
  ```ts
  class DemandService {
    constructor(deps: {
      demands: Repository<ServiceDemand>;
      images: Repository<DemandImage>;
      tags: Repository<DemandTag>;
      invitations: Repository<DemandInvitation>;
    })
    create(clientId: string, input: CreateDemandInput): Promise<DemandResponse>
    list(query: DemandListQuery, requesterId: string): Promise<{ items: DemandResponse[]; total: number }>
    getById(id: string): Promise<DemandResponse>
    update(id: string, clientId: string, input: UpdateDemandInput): Promise<DemandResponse>
    cancel(id: string, clientId: string): Promise<DemandResponse>
  }
  ```

- [ ] **Step 1: Escrever o teste falho (create persiste e mapeia DECIMAL)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemandService } from './demand.service';

function mockRepo<T = any>() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'demand-1', createdAt: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
    findAndCount: vi.fn(async () => [[], 0]),
    delete: vi.fn(),
  } as any;
}

describe('DemandService.create', () => {
  let demands: any, images: any, tags: any, invitations: any, service: DemandService;
  beforeEach(() => {
    demands = mockRepo(); images = mockRepo(); tags = mockRepo(); invitations = mockRepo();
    service = new DemandService({ demands, images, tags, invitations });
  });

  it('persiste demanda e retorna budgets como number', async () => {
    demands.save.mockResolvedValueOnce({
      id: 'demand-1', clientId: 'client-1', categoryId: 'cat-1', title: 'Instalação elétrica',
      description: 'x'.repeat(20), budgetMin: '100.00', budgetMax: '500.00', status: 'open',
      addressId: null, createdAt: new Date('2026-07-01T12:00:00Z'),
    });
    const result = await service.create('client-1', {
      categoryId: 'cat-1', title: 'Instalação elétrica', description: 'x'.repeat(20),
      budgetMin: 100, budgetMax: 500, addressId: null, tagIds: ['tag-1'], images: [{ url: 'https://cdn.app/a.jpg', position: 0 }],
    });
    expect(result.budgetMin).toBe(100);
    expect(result.budgetMax).toBe(500);
    expect(typeof result.budgetMin).toBe('number');
    expect(tags.save).toHaveBeenCalled();
    expect(images.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/demand/demand.service.test.ts`
Expected: FAIL — `Cannot find module './demand.service'`.

- [ ] **Step 3: Implementar o service**

```ts
import { Repository } from 'typeorm';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { DemandImage } from '@/infra/database/entities/demand-image.entity';
import { DemandTag } from '@/infra/database/entities/demand-tag.entity';
import { DemandInvitation } from '@/infra/database/entities/demand-invitation.entity';
import { NotFoundError, ForbiddenError } from '@/shared/errors';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandResponse,
} from './demand.schemas';
import { z } from 'zod';
import { demandListQuerySchema } from './demand.schemas';

type DemandListQuery = z.infer<typeof demandListQuerySchema> & { mine?: boolean };

interface DemandServiceDeps {
  demands: Repository<ServiceDemand>;
  images: Repository<DemandImage>;
  tags: Repository<DemandTag>;
  invitations: Repository<DemandInvitation>;
}

export class DemandService {
  constructor(private readonly deps: DemandServiceDeps) {}

  private toResponse(
    demand: ServiceDemand,
    images: DemandImage[],
    tagIds: string[],
  ): DemandResponse {
    return {
      id: demand.id,
      clientId: demand.clientId,
      categoryId: demand.categoryId,
      title: demand.title,
      description: demand.description,
      budgetMin: Number(demand.budgetMin),
      budgetMax: Number(demand.budgetMax),
      status: demand.status,
      addressId: demand.addressId,
      images: images
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ url: i.url, position: i.position })),
      tagIds,
      createdAt: demand.createdAt.toISOString(),
    };
  }

  async create(clientId: string, input: CreateDemandInput): Promise<DemandResponse> {
    const demand = await this.deps.demands.save(
      this.deps.demands.create({
        clientId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        budgetMin: input.budgetMin.toFixed(2),
        budgetMax: input.budgetMax.toFixed(2),
        status: 'open',
        addressId: input.addressId,
      }),
    );
    const images = await Promise.all(
      input.images.map((i) =>
        this.deps.images.save(
          this.deps.images.create({ demandId: demand.id, url: i.url, position: i.position }),
        ),
      ),
    );
    await Promise.all(
      input.tagIds.map((tagId) =>
        this.deps.tags.save(this.deps.tags.create({ demandId: demand.id, tagId })),
      ),
    );
    return this.toResponse(demand, images, input.tagIds);
  }

  async list(
    query: DemandListQuery,
    requesterId: string,
  ): Promise<{ items: DemandResponse[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.mine) where.clientId = requesterId;
    const [rows, total] = await this.deps.demands.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const items = await Promise.all(
      rows.map(async (d) => {
        const images = await this.deps.images.find({ where: { demandId: d.id } });
        const tagRows = await this.deps.tags.find({ where: { demandId: d.id } });
        return this.toResponse(d, images, tagRows.map((t) => t.tagId));
      }),
    );
    return { items, total };
  }

  async getById(id: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    const images = await this.deps.images.find({ where: { demandId: id } });
    const tagRows = await this.deps.tags.find({ where: { demandId: id } });
    return this.toResponse(demand, images, tagRows.map((t) => t.tagId));
  }

  async update(
    id: string,
    clientId: string,
    input: UpdateDemandInput,
  ): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    if (demand.clientId !== clientId) throw new ForbiddenError('Não é o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda não editável');
    if (input.title !== undefined) demand.title = input.title;
    if (input.description !== undefined) demand.description = input.description;
    if (input.budgetMin !== undefined) demand.budgetMin = input.budgetMin.toFixed(2);
    if (input.budgetMax !== undefined) demand.budgetMax = input.budgetMax.toFixed(2);
    const saved = await this.deps.demands.save(demand);
    const images = await this.deps.images.find({ where: { demandId: id } });
    const tagRows = await this.deps.tags.find({ where: { demandId: id } });
    return this.toResponse(saved, images, tagRows.map((t) => t.tagId));
  }

  async cancel(id: string, clientId: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    if (demand.clientId !== clientId) throw new ForbiddenError('Não é o autor da demanda');
    demand.status = 'cancelled';
    const saved = await this.deps.demands.save(demand);
    const images = await this.deps.images.find({ where: { demandId: id } });
    const tagRows = await this.deps.tags.find({ where: { demandId: id } });
    return this.toResponse(saved, images, tagRows.map((t) => t.tagId));
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/demand/demand.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/demand/demand.service.ts backend/src/modules/demand/demand.service.test.ts
git commit -m "feat(demand): implementa service de criação e listagem"
```

---

## Task 3: Módulo `demand` — convites diretos (service)

**Files:**
- Modify: `backend/src/modules/demand/demand.service.ts`
- Test: `backend/src/modules/demand/demand.service.test.ts:end`

**Interfaces:**
- Produces (novos métodos em `DemandService`):
  ```ts
  invite(demandId: string, clientId: string, professionalId: string): Promise<DemandInvitationResponse>
  respondInvitation(invitationId: string, professionalId: string, accept: boolean): Promise<DemandInvitationResponse>
  listInvitations(demandId: string): Promise<DemandInvitationResponse[]>
  ```
  onde `DemandInvitationResponse = z.infer<typeof demandInvitationResponseSchema>`.

- [ ] **Step 1: Teste falho (convite duplicado gera ConflictError)**

```ts
import { ConflictError } from '@/shared/errors';

describe('DemandService.invite', () => {
  let demands: any, images: any, tags: any, invitations: any, service: DemandService;
  beforeEach(() => {
    demands = mockRepo(); images = mockRepo(); tags = mockRepo(); invitations = mockRepo();
    service = new DemandService({ demands, images, tags, invitations });
  });

  it('rejeita convite duplicado', async () => {
    demands.findOne.mockResolvedValueOnce({ id: 'd1', clientId: 'client-1', status: 'open' });
    invitations.findOne.mockResolvedValueOnce({ id: 'inv-1' });
    await expect(service.invite('d1', 'client-1', 'pro-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('cria convite pending', async () => {
    demands.findOne.mockResolvedValueOnce({ id: 'd1', clientId: 'client-1', status: 'open' });
    invitations.findOne.mockResolvedValueOnce(null);
    invitations.save.mockResolvedValueOnce({ id: 'inv-1', demandId: 'd1', professionalId: 'pro-1', status: 'pending' });
    const result = await service.invite('d1', 'client-1', 'pro-1');
    expect(result.status).toBe('pending');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/demand/demand.service.test.ts -t invite`
Expected: FAIL — `service.invite is not a function`.

- [ ] **Step 3: Implementar métodos de convite**

Adicionar ao `DemandService` (imports: `ConflictError` de `@/shared/errors`, `DemandInvitationResponse` derivado do schema):

```ts
import { ConflictError, NotFoundError, ForbiddenError } from '@/shared/errors';
import type { DemandInvitationResponse } from './demand.schemas';
```

```ts
  private invitationToResponse(inv: DemandInvitation): DemandInvitationResponse {
    return {
      id: inv.id,
      demandId: inv.demandId,
      professionalId: inv.professionalId,
      status: inv.status,
    };
  }

  async invite(
    demandId: string,
    clientId: string,
    professionalId: string,
  ): Promise<DemandInvitationResponse> {
    const demand = await this.deps.demands.findOne({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    if (demand.clientId !== clientId) throw new ForbiddenError('Não é o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda não aceita convites');
    const existing = await this.deps.invitations.findOne({
      where: { demandId, professionalId },
    });
    if (existing) throw new ConflictError('Profissional já convidado');
    const saved = await this.deps.invitations.save(
      this.deps.invitations.create({ demandId, professionalId, status: 'pending' }),
    );
    return this.invitationToResponse(saved);
  }

  async respondInvitation(
    invitationId: string,
    professionalId: string,
    accept: boolean,
  ): Promise<DemandInvitationResponse> {
    const inv = await this.deps.invitations.findOne({ where: { id: invitationId } });
    if (!inv) throw new NotFoundError('Convite não encontrado');
    if (inv.professionalId !== professionalId) throw new ForbiddenError('Convite de outro profissional');
    if (inv.status !== 'pending') throw new ForbiddenError('Convite já respondido');
    inv.status = accept ? 'accepted' : 'declined';
    const saved = await this.deps.invitations.save(inv);
    return this.invitationToResponse(saved);
  }

  async listInvitations(demandId: string): Promise<DemandInvitationResponse[]> {
    const rows = await this.deps.invitations.find({ where: { demandId } });
    return rows.map((i) => this.invitationToResponse(i));
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/demand/demand.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/demand/demand.service.ts backend/src/modules/demand/demand.service.test.ts
git commit -m "feat(demand): adiciona convites diretos a profissionais"
```

---

## Task 4: Módulo `demand` — controller + routes + teste de integração

**Files:**
- Create: `backend/src/modules/demand/demand.controller.ts`
- Create: `backend/src/modules/demand/demand.routes.ts`
- Test: `backend/src/modules/demand/demand.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `demandRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`, `requireRole('client')`, `requireRole('professional')`; `buildTestApp`, `createUser`.
- Produces: `demandRoutes(app: FastifyInstance)` sob `/api/demands`.

- [ ] **Step 1: Teste de integração falho**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser } from '@/test/factories';

describe('demand routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('cliente publica e lê demanda; budget volta number', async () => {
    const { token, user } = await createUser(app, { role: 'client' });
    const create = await app.inject({
      method: 'POST',
      url: '/api/demands',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryId: '00000000-0000-0000-0000-000000000001',
        title: 'Instalação elétrica',
        description: 'x'.repeat(25),
        budgetMin: 100, budgetMax: 500, addressId: null, tagIds: [], images: [],
      },
    });
    expect(create.statusCode).toBe(201);
    const body = create.json();
    expect(body.budgetMin).toBe(100);
    expect(body.clientId).toBe(user.id);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/demands/${body.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().budgetMax).toBe(500);
  });

  it('profissional não pode publicar demanda', async () => {
    const { token } = await createUser(app, { role: 'professional' });
    const res = await app.inject({
      method: 'POST', url: '/api/demands',
      headers: { authorization: `Bearer ${token}` },
      payload: { categoryId: '00000000-0000-0000-0000-000000000001', title: 'Teste demanda', description: 'x'.repeat(25), budgetMin: 1, budgetMax: 2, addressId: null, tagIds: [], images: [] },
    });
    expect(res.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/demand/demand.routes.test.ts`
Expected: FAIL — rota `/api/demands` inexistente (404).

- [ ] **Step 3: Implementar controller**

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { DemandImage } from '@/infra/database/entities/demand-image.entity';
import { DemandTag } from '@/infra/database/entities/demand-tag.entity';
import { DemandInvitation } from '@/infra/database/entities/demand-invitation.entity';
import { DemandService } from './demand.service';
import type {
  CreateDemandInput,
  UpdateDemandInput,
} from './demand.schemas';
import { z } from 'zod';
import { demandListQuerySchema, inviteProfessionalSchema } from './demand.schemas';

function service(): DemandService {
  return new DemandService({
    demands: AppDataSource.getRepository(ServiceDemand),
    images: AppDataSource.getRepository(DemandImage),
    tags: AppDataSource.getRepository(DemandTag),
    invitations: AppDataSource.getRepository(DemandInvitation),
  });
}

export async function createDemand(
  req: FastifyRequest<{ Body: CreateDemandInput }>,
  reply: FastifyReply,
) {
  const result = await service().create(req.user.id, req.body);
  return reply.status(201).send(result);
}

export async function listDemands(
  req: FastifyRequest<{ Querystring: z.infer<typeof demandListQuerySchema> }>,
  reply: FastifyReply,
) {
  const { items, total } = await service().list(req.query, req.user.id);
  return reply.send({ items, page: req.query.page, limit: req.query.limit, total });
}

export async function getDemand(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().getById(req.params.id));
}

export async function updateDemand(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateDemandInput }>,
  reply: FastifyReply,
) {
  return reply.send(await service().update(req.params.id, req.user.id, req.body));
}

export async function cancelDemand(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().cancel(req.params.id, req.user.id));
}

export async function inviteProfessional(
  req: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof inviteProfessionalSchema> }>,
  reply: FastifyReply,
) {
  const result = await service().invite(req.params.id, req.user.id, req.body.professionalId);
  return reply.status(201).send(result);
}

export async function listDemandInvitations(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().listInvitations(req.params.id));
}

export async function respondInvitation(
  req: FastifyRequest<{ Params: { id: string }; Body: { accept: boolean } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().respondInvitation(req.params.id, req.user.id, req.body.accept));
}
```

- [ ] **Step 4: Implementar routes**

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import {
  createDemandSchema,
  updateDemandSchema,
  demandResponseSchema,
  demandListQuerySchema,
  demandListResponseSchema,
  inviteProfessionalSchema,
  demandInvitationResponseSchema,
} from './demand.schemas';
import {
  createDemand,
  listDemands,
  getDemand,
  updateDemand,
  cancelDemand,
  inviteProfessional,
  listDemandInvitations,
  respondInvitation,
} from './demand.controller';

export async function demandRoutes(app: FastifyInstance) {
  app.post('/api/demands', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['demands'], summary: 'Publicar demanda', body: createDemandSchema, response: { 201: demandResponseSchema } },
  }, createDemand);

  app.get('/api/demands', {
    preHandler: [app.authenticate],
    schema: { tags: ['demands'], summary: 'Listar demandas', querystring: demandListQuerySchema, response: { 200: demandListResponseSchema } },
  }, listDemands);

  app.get('/api/demands/:id', {
    preHandler: [app.authenticate],
    schema: { tags: ['demands'], summary: 'Detalhe da demanda', params: idParamSchema, response: { 200: demandResponseSchema } },
  }, getDemand);

  app.patch('/api/demands/:id', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['demands'], summary: 'Editar demanda', params: idParamSchema, body: updateDemandSchema, response: { 200: demandResponseSchema } },
  }, updateDemand);

  app.post('/api/demands/:id/cancel', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['demands'], summary: 'Cancelar demanda', params: idParamSchema, response: { 200: demandResponseSchema } },
  }, cancelDemand);

  app.post('/api/demands/:id/invitations', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['demands'], summary: 'Convidar profissional', params: idParamSchema, body: inviteProfessionalSchema, response: { 201: demandInvitationResponseSchema } },
  }, inviteProfessional);

  app.get('/api/demands/:id/invitations', {
    preHandler: [app.authenticate],
    schema: { tags: ['demands'], summary: 'Listar convites', params: idParamSchema, response: { 200: z.array(demandInvitationResponseSchema) } },
  }, listDemandInvitations);

  app.post('/api/invitations/:id/respond', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['demands'], summary: 'Responder convite', params: idParamSchema,
      body: z.object({ accept: z.boolean().describe('Aceitar convite').openapi({ example: true }) }),
      response: { 200: demandInvitationResponseSchema },
    },
  }, respondInvitation);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

Em `backend/src/app.ts`, no bloco de registro de módulos:

```ts
import { demandRoutes } from '@/modules/demand/demand.routes';
await app.register(demandRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/demand/demand.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/demand/demand.controller.ts backend/src/modules/demand/demand.routes.ts backend/src/modules/demand/demand.routes.test.ts backend/src/app.ts
git commit -m "feat(demand): expõe rotas de demanda e convites"
```

---

## Task 5: Módulo `quote` — schemas + service

**Files:**
- Create: `backend/src/modules/quote/quote.schemas.ts`
- Create: `backend/src/modules/quote/quote.service.ts`
- Test: `backend/src/modules/quote/quote.service.test.ts`

**Interfaces:**
- Consumes: entidades `Quote`, `QuoteItem`, `ServiceDemand`; `NotFoundError`, `ForbiddenError`, `UnprocessableError`.
- Produces:
  ```ts
  // schemas
  createQuoteSchema, quoteResponseSchema, quoteItemSchema, quoteStatusEnum
  // service
  class QuoteService {
    constructor(deps: { quotes: Repository<Quote>; items: Repository<QuoteItem>; demands: Repository<ServiceDemand>; })
    create(professionalId: string, demandId: string, input: CreateQuoteInput): Promise<QuoteResponse>
    listByDemand(demandId: string): Promise<QuoteResponse[]>
    getById(id: string): Promise<QuoteResponse>
    withdraw(id: string, professionalId: string): Promise<QuoteResponse>
  }
  ```
  `total` calculado como soma dos `subtotal` (cada `subtotal = quantity * unitPrice`), sempre via `Number()`.

- [ ] **Step 1: Escrever schemas**

```ts
import { z } from 'zod';

export const quoteStatusEnum = z
  .enum(['pending', 'accepted', 'rejected', 'withdrawn'])
  .describe('Estado do orçamento')
  .openapi({ example: 'pending' });

export const quoteItemSchema = z.object({
  description: z.string().min(2).max(200).describe('Item do orçamento').openapi({ example: 'Mão de obra' }),
  quantity: z.number().int().positive().describe('Quantidade').openapi({ example: 2 }),
  unitPrice: z.number().nonnegative().describe('Preço unitário').openapi({ example: 150 }),
});

export const createQuoteSchema = z.object({
  message: z.string().min(5).max(2000).describe('Mensagem ao cliente').openapi({ example: 'Posso fazer na quinta.' }),
  validUntil: z.string().datetime().nullable().describe('Validade do orçamento').openapi({ example: '2026-07-10T00:00:00Z' }),
  items: z.array(quoteItemSchema).min(1).max(50).describe('Itens do orçamento').openapi({ example: [] }),
});

export const quoteResponseSchema = z.object({
  id: z.string().uuid().describe('ID do orçamento').openapi({ example: 'q1...' }),
  demandId: z.string().uuid().describe('Demanda').openapi({ example: 'd1...' }),
  professionalId: z.string().uuid().describe('Profissional').openapi({ example: 'pro1...' }),
  message: z.string().describe('Mensagem').openapi({ example: 'Posso fazer na quinta.' }),
  total: z.number().describe('Total do orçamento').openapi({ example: 300 }),
  status: quoteStatusEnum,
  validUntil: z.string().datetime().nullable().describe('Validade').openapi({ example: null }),
  items: z.array(quoteItemSchema.extend({
    subtotal: z.number().describe('Subtotal do item').openapi({ example: 300 }),
  })).describe('Itens').openapi({ example: [] }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
```

- [ ] **Step 2: Teste falho (total = soma dos subtotais, tipos number)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService } from './quote.service';
import { ForbiddenError, UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'gen', createdAt: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
  } as any;
}

describe('QuoteService.create', () => {
  let quotes: any, items: any, demands: any, service: QuoteService;
  beforeEach(() => {
    quotes = mockRepo(); items = mockRepo(); demands = mockRepo();
    service = new QuoteService({ quotes, items, demands });
  });

  it('soma subtotais e grava total com 2 casas', async () => {
    demands.findOne.mockResolvedValueOnce({ id: 'd1', status: 'open' });
    quotes.save.mockImplementationOnce(async (x: any) => ({ id: 'q1', createdAt: new Date('2026-07-01T12:00:00Z'), ...x }));
    const result = await service.create('pro1', 'd1', {
      message: 'orcamento',
      validUntil: null,
      items: [
        { description: 'mão de obra', quantity: 2, unitPrice: 150 },
        { description: 'material', quantity: 1, unitPrice: 50 },
      ],
    });
    expect(result.total).toBe(350);
    expect(result.items[0].subtotal).toBe(300);
    expect(typeof result.total).toBe('number');
  });

  it('rejeita orçamento em demanda não aberta', async () => {
    demands.findOne.mockResolvedValueOnce({ id: 'd1', status: 'contracted' });
    await expect(
      service.create('pro1', 'd1', { message: 'x'.repeat(5), validUntil: null, items: [{ description: 'a', quantity: 1, unitPrice: 1 }] }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/quote/quote.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

```ts
import { Repository } from 'typeorm';
import { Quote } from '@/infra/database/entities/quote.entity';
import { QuoteItem } from '@/infra/database/entities/quote-item.entity';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { NotFoundError, ForbiddenError, UnprocessableError } from '@/shared/errors';
import type { CreateQuoteInput, QuoteResponse } from './quote.schemas';

interface QuoteServiceDeps {
  quotes: Repository<Quote>;
  items: Repository<QuoteItem>;
  demands: Repository<ServiceDemand>;
}

export class QuoteService {
  constructor(private readonly deps: QuoteServiceDeps) {}

  private toResponse(quote: Quote, items: QuoteItem[]): QuoteResponse {
    return {
      id: quote.id,
      demandId: quote.demandId,
      professionalId: quote.professionalId,
      message: quote.message,
      total: Number(quote.total),
      status: quote.status,
      validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      createdAt: quote.createdAt.toISOString(),
    };
  }

  async create(
    professionalId: string,
    demandId: string,
    input: CreateQuoteInput,
  ): Promise<QuoteResponse> {
    const demand = await this.deps.demands.findOne({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    if (demand.status !== 'open') throw new UnprocessableError('Demanda não aceita orçamentos');
    const existing = await this.deps.quotes.findOne({ where: { demandId, professionalId, status: 'pending' } });
    if (existing) throw new UnprocessableError('Já existe orçamento pendente');
    const computed = input.items.map((i) => ({
      ...i,
      subtotal: Number((i.quantity * i.unitPrice).toFixed(2)),
    }));
    const total = computed.reduce((acc, i) => acc + i.subtotal, 0);
    const quote = await this.deps.quotes.save(
      this.deps.quotes.create({
        demandId,
        professionalId,
        message: input.message,
        total: total.toFixed(2),
        status: 'pending',
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
      }),
    );
    const savedItems = await Promise.all(
      computed.map((i) =>
        this.deps.items.save(
          this.deps.items.create({
            quoteId: quote.id,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice.toFixed(2),
            subtotal: i.subtotal.toFixed(2),
          }),
        ),
      ),
    );
    return this.toResponse(quote, savedItems);
  }

  async listByDemand(demandId: string): Promise<QuoteResponse[]> {
    const rows = await this.deps.quotes.find({ where: { demandId }, order: { createdAt: 'DESC' } });
    return Promise.all(
      rows.map(async (q) => {
        const items = await this.deps.items.find({ where: { quoteId: q.id } });
        return this.toResponse(q, items);
      }),
    );
  }

  async getById(id: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orçamento não encontrado');
    const items = await this.deps.items.find({ where: { quoteId: id } });
    return this.toResponse(quote, items);
  }

  async withdraw(id: string, professionalId: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orçamento não encontrado');
    if (quote.professionalId !== professionalId) throw new ForbiddenError('Orçamento de outro profissional');
    if (quote.status !== 'pending') throw new UnprocessableError('Orçamento não pode ser retirado');
    quote.status = 'withdrawn';
    const saved = await this.deps.quotes.save(quote);
    const items = await this.deps.items.find({ where: { quoteId: id } });
    return this.toResponse(saved, items);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/quote/quote.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/quote/quote.schemas.ts backend/src/modules/quote/quote.service.ts backend/src/modules/quote/quote.service.test.ts
git commit -m "feat(quote): implementa orçamento com itens e total calculado"
```

---

## Task 6: Módulo `quote` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/quote/quote.controller.ts`
- Create: `backend/src/modules/quote/quote.routes.ts`
- Test: `backend/src/modules/quote/quote.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Produces: `quoteRoutes(app)`; rotas `POST /api/demands/:id/quotes` (professional), `GET /api/demands/:id/quotes`, `GET /api/quotes/:id`, `POST /api/quotes/:id/withdraw` (professional).

- [ ] **Step 1: Teste de integração falho**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser, createProfessional, createDemand } from '@/test/factories';

describe('quote routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('profissional envia orçamento e cliente lista', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const demand = await createDemand(app, { clientToken: client.token });
    const create = await app.inject({
      method: 'POST',
      url: `/api/demands/${demand.id}/quotes`,
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mão de obra', quantity: 2, unitPrice: 150 }] },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().total).toBe(300);

    const list = await app.inject({
      method: 'GET',
      url: `/api/demands/${demand.id}/quotes`,
      headers: { authorization: `Bearer ${client.token}` },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/quote/quote.routes.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implementar controller**

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Quote } from '@/infra/database/entities/quote.entity';
import { QuoteItem } from '@/infra/database/entities/quote-item.entity';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { QuoteService } from './quote.service';
import type { CreateQuoteInput } from './quote.schemas';

function service(): QuoteService {
  return new QuoteService({
    quotes: AppDataSource.getRepository(Quote),
    items: AppDataSource.getRepository(QuoteItem),
    demands: AppDataSource.getRepository(ServiceDemand),
  });
}

export async function createQuote(
  req: FastifyRequest<{ Params: { id: string }; Body: CreateQuoteInput }>,
  reply: FastifyReply,
) {
  const result = await service().create(req.user.id, req.params.id, req.body);
  return reply.status(201).send(result);
}

export async function listDemandQuotes(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().listByDemand(req.params.id));
}

export async function getQuote(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().getById(req.params.id));
}

export async function withdrawQuote(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().withdraw(req.params.id, req.user.id));
}
```

- [ ] **Step 4: Implementar routes**

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { createQuoteSchema, quoteResponseSchema } from './quote.schemas';
import { createQuote, listDemandQuotes, getQuote, withdrawQuote } from './quote.controller';

export async function quoteRoutes(app: FastifyInstance) {
  app.post('/api/demands/:id/quotes', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['quotes'], summary: 'Enviar orçamento', params: idParamSchema, body: createQuoteSchema, response: { 201: quoteResponseSchema } },
  }, createQuote);

  app.get('/api/demands/:id/quotes', {
    preHandler: [app.authenticate],
    schema: { tags: ['quotes'], summary: 'Listar orçamentos da demanda', params: idParamSchema, response: { 200: z.array(quoteResponseSchema) } },
  }, listDemandQuotes);

  app.get('/api/quotes/:id', {
    preHandler: [app.authenticate],
    schema: { tags: ['quotes'], summary: 'Detalhe do orçamento', params: idParamSchema, response: { 200: quoteResponseSchema } },
  }, getQuote);

  app.post('/api/quotes/:id/withdraw', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['quotes'], summary: 'Retirar orçamento', params: idParamSchema, response: { 200: quoteResponseSchema } },
  }, withdrawQuote);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

```ts
import { quoteRoutes } from '@/modules/quote/quote.routes';
await app.register(quoteRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/quote/quote.routes.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/quote/quote.controller.ts backend/src/modules/quote/quote.routes.ts backend/src/modules/quote/quote.routes.test.ts backend/src/app.ts
git commit -m "feat(quote): expõe rotas de orçamento"
```

---

## Task 7: Módulo `contract` — schemas + service (aceitar orçamento vira contrato)

**Files:**
- Create: `backend/src/modules/contract/contract.schemas.ts`
- Create: `backend/src/modules/contract/contract.service.ts`
- Test: `backend/src/modules/contract/contract.service.test.ts`

**Interfaces:**
- Consumes: entidades `Contract`, `Quote`, `ServiceDemand`, `Schedule`, `ContractProgressUpdate`, `ContractProgressImage`; erros.
- Produces:
  ```ts
  // schemas
  contractStatusEnum, acceptQuoteSchema, contractResponseSchema, scheduleSchema,
  progressUpdateSchema, progressUpdateResponseSchema, cancelContractSchema
  // service
  class ContractService {
    constructor(deps: {
      contracts: Repository<Contract>; quotes: Repository<Quote>; demands: Repository<ServiceDemand>;
      schedules: Repository<Schedule>; progress: Repository<ContractProgressUpdate>;
      progressImages: Repository<ContractProgressImage>;
    })
    acceptQuote(clientId: string, quoteId: string, schedule: ScheduleInput | null): Promise<ContractResponse>
    getById(id: string, requesterId: string): Promise<ContractResponse>
    listMine(userId: string, role: 'client' | 'professional'): Promise<ContractResponse[]>
    start(id: string, professionalId: string): Promise<ContractResponse>
    complete(id: string, professionalId: string): Promise<ContractResponse>
    cancel(id: string, userId: string, reason: string): Promise<ContractResponse>
    addProgress(id: string, authorId: string, input: ProgressUpdateInput): Promise<ProgressUpdateResponse>
    listProgress(id: string): Promise<ProgressUpdateResponse[]>
  }
  ```
- `acceptQuote` marca o quote `accepted`, os demais quotes da demanda `rejected`, a demanda `contracted`, cria `Contract` com `total = quote.total`, status `active`.

- [ ] **Step 1: Escrever schemas**

```ts
import { z } from 'zod';

export const contractStatusEnum = z
  .enum(['active', 'in_progress', 'completed', 'cancelled', 'disputed'])
  .describe('Estado do contrato')
  .openapi({ example: 'active' });

export const scheduleSchema = z.object({
  scheduledStart: z.string().datetime().describe('Início agendado').openapi({ example: '2026-07-05T09:00:00Z' }),
  scheduledEnd: z.string().datetime().describe('Fim agendado').openapi({ example: '2026-07-05T12:00:00Z' }),
  notes: z.string().max(500).nullable().describe('Observações').openapi({ example: null }),
});

export const acceptQuoteSchema = z.object({
  schedule: scheduleSchema.nullable().describe('Agendamento opcional').openapi({ example: null }),
});

export const progressUpdateSchema = z.object({
  description: z.string().min(3).max(1000).describe('Descrição do progresso').openapi({ example: 'Fase 1 concluída' }),
  percentage: z.number().int().min(0).max(100).describe('Percentual concluído').openapi({ example: 50 }),
  images: z.array(z.string().url()).max(10).describe('Imagens do progresso').openapi({ example: [] }),
});

export const cancelContractSchema = z.object({
  reason: z.string().min(3).max(1000).describe('Motivo do cancelamento').openapi({ example: 'Indisponibilidade' }),
});

export const scheduleResponseSchema = scheduleSchema.extend({
  id: z.string().uuid().describe('ID do agendamento').openapi({ example: 's1...' }),
});

export const contractResponseSchema = z.object({
  id: z.string().uuid().describe('ID do contrato').openapi({ example: 'c1...' }),
  demandId: z.string().uuid().describe('Demanda').openapi({ example: 'd1...' }),
  quoteId: z.string().uuid().describe('Orçamento').openapi({ example: 'q1...' }),
  clientId: z.string().uuid().describe('Cliente').openapi({ example: 'cl1...' }),
  professionalId: z.string().uuid().describe('Profissional').openapi({ example: 'pro1...' }),
  total: z.number().describe('Valor total').openapi({ example: 300 }),
  status: contractStatusEnum,
  cancelledBy: z.string().uuid().nullable().describe('Quem cancelou').openapi({ example: null }),
  cancellationReason: z.string().nullable().describe('Motivo').openapi({ example: null }),
  startedAt: z.string().datetime().nullable().describe('Início').openapi({ example: null }),
  completedAt: z.string().datetime().nullable().describe('Conclusão').openapi({ example: null }),
  schedule: scheduleResponseSchema.nullable().describe('Agendamento').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const progressUpdateResponseSchema = z.object({
  id: z.string().uuid().describe('ID do progresso').openapi({ example: 'p1...' }),
  contractId: z.string().uuid().describe('Contrato').openapi({ example: 'c1...' }),
  authorId: z.string().uuid().describe('Autor').openapi({ example: 'pro1...' }),
  description: z.string().describe('Descrição').openapi({ example: 'Fase 1 concluída' }),
  percentage: z.number().describe('Percentual').openapi({ example: 50 }),
  images: z.array(z.string().url()).describe('Imagens').openapi({ example: [] }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type ContractResponse = z.infer<typeof contractResponseSchema>;
export type ProgressUpdateResponse = z.infer<typeof progressUpdateResponseSchema>;
```

- [ ] **Step 2: Teste falho (aceitar orçamento cria contrato e rejeita concorrentes)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractService } from './contract.service';
import { ForbiddenError, UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'gen', createdAt: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
    update: vi.fn(async () => ({})),
  } as any;
}

describe('ContractService.acceptQuote', () => {
  let contracts: any, quotes: any, demands: any, schedules: any, progress: any, progressImages: any, service: ContractService;
  beforeEach(() => {
    contracts = mockRepo(); quotes = mockRepo(); demands = mockRepo();
    schedules = mockRepo(); progress = mockRepo(); progressImages = mockRepo();
    service = new ContractService({ contracts, quotes, demands, schedules, progress, progressImages });
  });

  it('aceita orçamento, cria contrato active e rejeita os demais', async () => {
    quotes.findOne.mockResolvedValueOnce({ id: 'q1', demandId: 'd1', professionalId: 'pro1', total: '300.00', status: 'pending' });
    demands.findOne.mockResolvedValueOnce({ id: 'd1', clientId: 'client-1', status: 'open' });
    contracts.save.mockImplementationOnce(async (x: any) => ({ id: 'c1', createdAt: new Date('2026-07-01T12:00:00Z'), ...x }));
    const result = await service.acceptQuote('client-1', 'q1', null);
    expect(result.status).toBe('active');
    expect(result.total).toBe(300);
    expect(quotes.update).toHaveBeenCalledWith(
      expect.objectContaining({ demandId: 'd1', status: 'pending' }),
      { status: 'rejected' },
    );
    expect(demands.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'contracted' }));
  });

  it('impede aceitar orçamento de demanda de outro cliente', async () => {
    quotes.findOne.mockResolvedValueOnce({ id: 'q1', demandId: 'd1', professionalId: 'pro1', total: '300.00', status: 'pending' });
    demands.findOne.mockResolvedValueOnce({ id: 'd1', clientId: 'outro', status: 'open' });
    await expect(service.acceptQuote('client-1', 'q1', null)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/contract/contract.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

```ts
import { Repository, Not } from 'typeorm';
import { Contract } from '@/infra/database/entities/contract.entity';
import { Quote } from '@/infra/database/entities/quote.entity';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { Schedule } from '@/infra/database/entities/schedule.entity';
import { ContractProgressUpdate } from '@/infra/database/entities/contract-progress-update.entity';
import { ContractProgressImage } from '@/infra/database/entities/contract-progress-image.entity';
import { NotFoundError, ForbiddenError, UnprocessableError } from '@/shared/errors';
import type {
  ScheduleInput,
  ProgressUpdateInput,
  ContractResponse,
  ProgressUpdateResponse,
} from './contract.schemas';

interface ContractServiceDeps {
  contracts: Repository<Contract>;
  quotes: Repository<Quote>;
  demands: Repository<ServiceDemand>;
  schedules: Repository<Schedule>;
  progress: Repository<ContractProgressUpdate>;
  progressImages: Repository<ContractProgressImage>;
}

export class ContractService {
  constructor(private readonly deps: ContractServiceDeps) {}

  private async toResponse(contract: Contract): Promise<ContractResponse> {
    const schedule = await this.deps.schedules.findOne({ where: { contractId: contract.id } });
    return {
      id: contract.id,
      demandId: contract.demandId,
      quoteId: contract.quoteId,
      clientId: contract.clientId,
      professionalId: contract.professionalId,
      total: Number(contract.total),
      status: contract.status,
      cancelledBy: contract.cancelledBy,
      cancellationReason: contract.cancellationReason,
      startedAt: contract.startedAt ? contract.startedAt.toISOString() : null,
      completedAt: contract.completedAt ? contract.completedAt.toISOString() : null,
      schedule: schedule
        ? {
            id: schedule.id,
            scheduledStart: schedule.scheduledStart.toISOString(),
            scheduledEnd: schedule.scheduledEnd.toISOString(),
            notes: schedule.notes,
          }
        : null,
      createdAt: contract.createdAt.toISOString(),
    };
  }

  private assertParticipant(contract: Contract, userId: string): void {
    if (contract.clientId !== userId && contract.professionalId !== userId) {
      throw new ForbiddenError('Sem acesso ao contrato');
    }
  }

  async acceptQuote(
    clientId: string,
    quoteId: string,
    schedule: ScheduleInput | null,
  ): Promise<ContractResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundError('Orçamento não encontrado');
    if (quote.status !== 'pending') throw new UnprocessableError('Orçamento não está pendente');
    const demand = await this.deps.demands.findOne({ where: { id: quote.demandId } });
    if (!demand) throw new NotFoundError('Demanda não encontrada');
    if (demand.clientId !== clientId) throw new ForbiddenError('Não é o autor da demanda');
    if (demand.status !== 'open') throw new UnprocessableError('Demanda não está aberta');

    quote.status = 'accepted';
    await this.deps.quotes.save(quote);
    await this.deps.quotes.update(
      { demandId: demand.id, status: 'pending' },
      { status: 'rejected' },
    );
    demand.status = 'contracted';
    await this.deps.demands.save(demand);

    const contract = await this.deps.contracts.save(
      this.deps.contracts.create({
        demandId: demand.id,
        quoteId: quote.id,
        clientId,
        professionalId: quote.professionalId,
        total: Number(quote.total).toFixed(2),
        status: 'active',
        cancelledBy: null,
        cancellationReason: null,
        startedAt: null,
        completedAt: null,
      }),
    );
    if (schedule) {
      await this.deps.schedules.save(
        this.deps.schedules.create({
          contractId: contract.id,
          scheduledStart: new Date(schedule.scheduledStart),
          scheduledEnd: new Date(schedule.scheduledEnd),
          notes: schedule.notes,
        }),
      );
    }
    return this.toResponse(contract);
  }

  async getById(id: string, requesterId: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    this.assertParticipant(contract, requesterId);
    return this.toResponse(contract);
  }

  async listMine(
    userId: string,
    role: 'client' | 'professional',
  ): Promise<ContractResponse[]> {
    const where = role === 'client' ? { clientId: userId } : { professionalId: userId };
    const rows = await this.deps.contracts.find({ where, order: { createdAt: 'DESC' } });
    return Promise.all(rows.map((c) => this.toResponse(c)));
  }

  async start(id: string, professionalId: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.professionalId !== professionalId) throw new ForbiddenError('Não é o profissional');
    if (contract.status !== 'active') throw new UnprocessableError('Contrato não pode iniciar');
    contract.status = 'in_progress';
    contract.startedAt = new Date();
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async complete(id: string, professionalId: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.professionalId !== professionalId) throw new ForbiddenError('Não é o profissional');
    if (contract.status !== 'in_progress') throw new UnprocessableError('Contrato não está em execução');
    contract.status = 'completed';
    contract.completedAt = new Date();
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async cancel(id: string, userId: string, reason: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    this.assertParticipant(contract, userId);
    if (contract.status === 'completed' || contract.status === 'cancelled') {
      throw new UnprocessableError('Contrato não pode ser cancelado');
    }
    contract.status = 'cancelled';
    contract.cancelledBy = userId;
    contract.cancellationReason = reason;
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async addProgress(
    id: string,
    authorId: string,
    input: ProgressUpdateInput,
  ): Promise<ProgressUpdateResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.professionalId !== authorId) throw new ForbiddenError('Não é o profissional');
    if (contract.status !== 'in_progress') throw new UnprocessableError('Contrato não está em execução');
    const update = await this.deps.progress.save(
      this.deps.progress.create({
        contractId: id,
        authorId,
        description: input.description,
        percentage: input.percentage,
      }),
    );
    const images = await Promise.all(
      input.images.map((url) =>
        this.deps.progressImages.save(
          this.deps.progressImages.create({ progressUpdateId: update.id, url }),
        ),
      ),
    );
    return {
      id: update.id,
      contractId: id,
      authorId,
      description: update.description,
      percentage: update.percentage,
      images: images.map((i) => i.url),
      createdAt: update.createdAt.toISOString(),
    };
  }

  async listProgress(id: string): Promise<ProgressUpdateResponse[]> {
    const rows = await this.deps.progress.find({
      where: { contractId: id },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      rows.map(async (u) => {
        const images = await this.deps.progressImages.find({ where: { progressUpdateId: u.id } });
        return {
          id: u.id,
          contractId: id,
          authorId: u.authorId,
          description: u.description,
          percentage: u.percentage,
          images: images.map((i) => i.url),
          createdAt: u.createdAt.toISOString(),
        };
      }),
    );
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/contract/contract.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/contract/contract.schemas.ts backend/src/modules/contract/contract.service.ts backend/src/modules/contract/contract.service.test.ts
git commit -m "feat(contract): aceita orçamento e gera contrato com progresso"
```

---

## Task 8: Módulo `contract` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/contract/contract.controller.ts`
- Create: `backend/src/modules/contract/contract.routes.ts`
- Test: `backend/src/modules/contract/contract.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Produces: `contractRoutes(app)`. Rotas: `POST /api/quotes/:id/accept` (client), `GET /api/contracts` (auth), `GET /api/contracts/:id`, `POST /api/contracts/:id/start` (professional), `POST /api/contracts/:id/complete` (professional), `POST /api/contracts/:id/cancel` (auth), `POST /api/contracts/:id/progress` (professional), `GET /api/contracts/:id/progress`.

- [ ] **Step 1: Teste de integração falho (fluxo demanda→quote→aceite→progresso)**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser, createProfessional, createDemand } from '@/test/factories';

describe('contract routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('aceita orçamento, inicia e registra progresso', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const demand = await createDemand(app, { clientToken: client.token });
    const quote = await app.inject({
      method: 'POST', url: `/api/demands/${demand.id}/quotes`,
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'mão de obra', quantity: 1, unitPrice: 300 }] },
    });
    const quoteId = quote.json().id;

    const accept = await app.inject({
      method: 'POST', url: `/api/quotes/${quoteId}/accept`,
      headers: { authorization: `Bearer ${client.token}` },
      payload: { schedule: null },
    });
    expect(accept.statusCode).toBe(201);
    const contractId = accept.json().id;
    expect(accept.json().status).toBe('active');

    const start = await app.inject({
      method: 'POST', url: `/api/contracts/${contractId}/start`,
      headers: { authorization: `Bearer ${pro.token}` },
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().status).toBe('in_progress');

    const progress = await app.inject({
      method: 'POST', url: `/api/contracts/${contractId}/progress`,
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { description: 'Fase 1 concluída', percentage: 50, images: [] },
    });
    expect(progress.statusCode).toBe(201);
    expect(progress.json().percentage).toBe(50);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/contract/contract.routes.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implementar controller**

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Contract } from '@/infra/database/entities/contract.entity';
import { Quote } from '@/infra/database/entities/quote.entity';
import { ServiceDemand } from '@/infra/database/entities/service-demand.entity';
import { Schedule } from '@/infra/database/entities/schedule.entity';
import { ContractProgressUpdate } from '@/infra/database/entities/contract-progress-update.entity';
import { ContractProgressImage } from '@/infra/database/entities/contract-progress-image.entity';
import { ContractService } from './contract.service';
import type { AcceptQuoteInput, ProgressUpdateInput } from './contract.schemas';

function service(): ContractService {
  return new ContractService({
    contracts: AppDataSource.getRepository(Contract),
    quotes: AppDataSource.getRepository(Quote),
    demands: AppDataSource.getRepository(ServiceDemand),
    schedules: AppDataSource.getRepository(Schedule),
    progress: AppDataSource.getRepository(ContractProgressUpdate),
    progressImages: AppDataSource.getRepository(ContractProgressImage),
  });
}

export async function acceptQuote(
  req: FastifyRequest<{ Params: { id: string }; Body: AcceptQuoteInput }>,
  reply: FastifyReply,
) {
  const result = await service().acceptQuote(req.user.id, req.params.id, req.body.schedule);
  return reply.status(201).send(result);
}

export async function listContracts(req: FastifyRequest, reply: FastifyReply) {
  const role = req.user.role === 'professional' ? 'professional' : 'client';
  return reply.send(await service().listMine(req.user.id, role));
}

export async function getContract(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().getById(req.params.id, req.user.id));
}

export async function startContract(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().start(req.params.id, req.user.id));
}

export async function completeContract(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().complete(req.params.id, req.user.id));
}

export async function cancelContract(
  req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().cancel(req.params.id, req.user.id, req.body.reason));
}

export async function addProgress(
  req: FastifyRequest<{ Params: { id: string }; Body: ProgressUpdateInput }>,
  reply: FastifyReply,
) {
  const result = await service().addProgress(req.params.id, req.user.id, req.body);
  return reply.status(201).send(result);
}

export async function listProgress(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().listProgress(req.params.id));
}
```

- [ ] **Step 4: Implementar routes**

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import {
  acceptQuoteSchema,
  contractResponseSchema,
  progressUpdateSchema,
  progressUpdateResponseSchema,
  cancelContractSchema,
} from './contract.schemas';
import {
  acceptQuote,
  listContracts,
  getContract,
  startContract,
  completeContract,
  cancelContract,
  addProgress,
  listProgress,
} from './contract.controller';

export async function contractRoutes(app: FastifyInstance) {
  app.post('/api/quotes/:id/accept', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['contracts'], summary: 'Aceitar orçamento', params: idParamSchema, body: acceptQuoteSchema, response: { 201: contractResponseSchema } },
  }, acceptQuote);

  app.get('/api/contracts', {
    preHandler: [app.authenticate],
    schema: { tags: ['contracts'], summary: 'Meus contratos', response: { 200: z.array(contractResponseSchema) } },
  }, listContracts);

  app.get('/api/contracts/:id', {
    preHandler: [app.authenticate],
    schema: { tags: ['contracts'], summary: 'Detalhe do contrato', params: idParamSchema, response: { 200: contractResponseSchema } },
  }, getContract);

  app.post('/api/contracts/:id/start', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['contracts'], summary: 'Iniciar execução', params: idParamSchema, response: { 200: contractResponseSchema } },
  }, startContract);

  app.post('/api/contracts/:id/complete', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['contracts'], summary: 'Concluir contrato', params: idParamSchema, response: { 200: contractResponseSchema } },
  }, completeContract);

  app.post('/api/contracts/:id/cancel', {
    preHandler: [app.authenticate],
    schema: { tags: ['contracts'], summary: 'Cancelar contrato', params: idParamSchema, body: cancelContractSchema, response: { 200: contractResponseSchema } },
  }, cancelContract);

  app.post('/api/contracts/:id/progress', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['contracts'], summary: 'Registrar progresso', params: idParamSchema, body: progressUpdateSchema, response: { 201: progressUpdateResponseSchema } },
  }, addProgress);

  app.get('/api/contracts/:id/progress', {
    preHandler: [app.authenticate],
    schema: { tags: ['contracts'], summary: 'Listar progresso', params: idParamSchema, response: { 200: z.array(progressUpdateResponseSchema) } },
  }, listProgress);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

```ts
import { contractRoutes } from '@/modules/contract/contract.routes';
await app.register(contractRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/contract/contract.routes.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/contract/contract.controller.ts backend/src/modules/contract/contract.routes.ts backend/src/modules/contract/contract.routes.test.ts backend/src/app.ts
git commit -m "feat(contract): expõe rotas de contrato, execução e progresso"
```

---

## Task 9: Módulo `dispute` — schemas + service + routes + integração

**Files:**
- Create: `backend/src/modules/dispute/dispute.schemas.ts`
- Create: `backend/src/modules/dispute/dispute.service.ts`
- Create: `backend/src/modules/dispute/dispute.controller.ts`
- Create: `backend/src/modules/dispute/dispute.routes.ts`
- Test: `backend/src/modules/dispute/dispute.service.test.ts`
- Test: `backend/src/modules/dispute/dispute.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: entidades `ContractDispute`, `Contract`; erros.
- Produces:
  ```ts
  disputeStatusEnum, openDisputeSchema, resolveDisputeSchema, disputeResponseSchema
  class DisputeService {
    constructor(deps: { disputes: Repository<ContractDispute>; contracts: Repository<Contract>; })
    open(contractId: string, userId: string, reason: string): Promise<DisputeResponse>
    listByContract(contractId: string, userId: string): Promise<DisputeResponse[]>
    resolve(disputeId: string, status: 'resolved' | 'rejected', resolution: string): Promise<DisputeResponse>
  }
  ```
- Abrir disputa marca o contrato como `disputed`.

- [ ] **Step 1: Escrever schemas**

```ts
import { z } from 'zod';

export const disputeStatusEnum = z
  .enum(['open', 'under_review', 'resolved', 'rejected'])
  .describe('Estado da disputa')
  .openapi({ example: 'open' });

export const openDisputeSchema = z.object({
  reason: z.string().min(10).max(2000).describe('Motivo da disputa').openapi({ example: 'Serviço não concluído' }),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['resolved', 'rejected']).describe('Resolução').openapi({ example: 'resolved' }),
  resolution: z.string().min(3).max(2000).describe('Descrição da resolução').openapi({ example: 'Reembolso parcial' }),
});

export const disputeResponseSchema = z.object({
  id: z.string().uuid().describe('ID da disputa').openapi({ example: 'dsp1...' }),
  contractId: z.string().uuid().describe('Contrato').openapi({ example: 'c1...' }),
  openedBy: z.string().uuid().describe('Quem abriu').openapi({ example: 'cl1...' }),
  reason: z.string().describe('Motivo').openapi({ example: 'Serviço não concluído' }),
  status: disputeStatusEnum,
  resolution: z.string().nullable().describe('Resolução').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type DisputeResponse = z.infer<typeof disputeResponseSchema>;
```

- [ ] **Step 2: Teste unit falho**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisputeService } from './dispute.service';
import { ForbiddenError, UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return { create: vi.fn((x) => x), save: vi.fn(async (x) => ({ id: 'gen', createdAt: new Date('2026-07-01T12:00:00Z'), ...x })), findOne: vi.fn(), find: vi.fn(async () => []) } as any;
}

describe('DisputeService.open', () => {
  let disputes: any, contracts: any, service: DisputeService;
  beforeEach(() => { disputes = mockRepo(); contracts = mockRepo(); service = new DisputeService({ disputes, contracts }); });

  it('abre disputa e marca contrato como disputed', async () => {
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', clientId: 'cl1', professionalId: 'pro1', status: 'in_progress' });
    disputes.save.mockImplementationOnce(async (x: any) => ({ id: 'dsp1', createdAt: new Date('2026-07-01T12:00:00Z'), ...x }));
    const result = await service.open('c1', 'cl1', 'x'.repeat(10));
    expect(result.status).toBe('open');
    expect(contracts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'disputed' }));
  });

  it('bloqueia não-participante', async () => {
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', clientId: 'cl1', professionalId: 'pro1', status: 'in_progress' });
    await expect(service.open('c1', 'estranho', 'x'.repeat(10))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/dispute/dispute.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

```ts
import { Repository } from 'typeorm';
import { ContractDispute } from '@/infra/database/entities/contract-dispute.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { NotFoundError, ForbiddenError, UnprocessableError } from '@/shared/errors';
import type { DisputeResponse } from './dispute.schemas';

interface DisputeServiceDeps {
  disputes: Repository<ContractDispute>;
  contracts: Repository<Contract>;
}

export class DisputeService {
  constructor(private readonly deps: DisputeServiceDeps) {}

  private toResponse(d: ContractDispute): DisputeResponse {
    return {
      id: d.id,
      contractId: d.contractId,
      openedBy: d.openedBy,
      reason: d.reason,
      status: d.status,
      resolution: d.resolution,
      createdAt: d.createdAt.toISOString(),
    };
  }

  async open(contractId: string, userId: string, reason: string): Promise<DisputeResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.clientId !== userId && contract.professionalId !== userId) {
      throw new ForbiddenError('Sem acesso ao contrato');
    }
    if (contract.status === 'cancelled') throw new UnprocessableError('Contrato cancelado');
    const existing = await this.deps.disputes.findOne({ where: { contractId, status: 'open' } });
    if (existing) throw new UnprocessableError('Disputa já aberta');
    const dispute = await this.deps.disputes.save(
      this.deps.disputes.create({ contractId, openedBy: userId, reason, status: 'open', resolution: null }),
    );
    contract.status = 'disputed';
    await this.deps.contracts.save(contract);
    return this.toResponse(dispute);
  }

  async listByContract(contractId: string, userId: string): Promise<DisputeResponse[]> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.clientId !== userId && contract.professionalId !== userId) {
      throw new ForbiddenError('Sem acesso ao contrato');
    }
    const rows = await this.deps.disputes.find({ where: { contractId }, order: { createdAt: 'DESC' } });
    return rows.map((d) => this.toResponse(d));
  }

  async resolve(
    disputeId: string,
    status: 'resolved' | 'rejected',
    resolution: string,
  ): Promise<DisputeResponse> {
    const dispute = await this.deps.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundError('Disputa não encontrada');
    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      throw new UnprocessableError('Disputa já encerrada');
    }
    dispute.status = status;
    dispute.resolution = resolution;
    return this.toResponse(await this.deps.disputes.save(dispute));
  }
}
```

- [ ] **Step 5: Implementar controller + routes**

`dispute.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { ContractDispute } from '@/infra/database/entities/contract-dispute.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { DisputeService } from './dispute.service';

function service(): DisputeService {
  return new DisputeService({
    disputes: AppDataSource.getRepository(ContractDispute),
    contracts: AppDataSource.getRepository(Contract),
  });
}

export async function openDispute(
  req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply,
) {
  const result = await service().open(req.params.id, req.user.id, req.body.reason);
  return reply.status(201).send(result);
}

export async function listContractDisputes(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().listByContract(req.params.id, req.user.id));
}

export async function resolveDispute(
  req: FastifyRequest<{ Params: { id: string }; Body: { status: 'resolved' | 'rejected'; resolution: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await service().resolve(req.params.id, req.body.status, req.body.resolution));
}
```

`dispute.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { openDisputeSchema, resolveDisputeSchema, disputeResponseSchema } from './dispute.schemas';
import { openDispute, listContractDisputes, resolveDispute } from './dispute.controller';

export async function disputeRoutes(app: FastifyInstance) {
  app.post('/api/contracts/:id/disputes', {
    preHandler: [app.authenticate],
    schema: { tags: ['disputes'], summary: 'Abrir disputa', params: idParamSchema, body: openDisputeSchema, response: { 201: disputeResponseSchema } },
  }, openDispute);

  app.get('/api/contracts/:id/disputes', {
    preHandler: [app.authenticate],
    schema: { tags: ['disputes'], summary: 'Listar disputas', params: idParamSchema, response: { 200: z.array(disputeResponseSchema) } },
  }, listContractDisputes);

  app.post('/api/disputes/:id/resolve', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['disputes'], summary: 'Resolver disputa', params: idParamSchema, body: resolveDisputeSchema, response: { 200: disputeResponseSchema } },
  }, resolveDispute);
}
```

- [ ] **Step 6: Teste de integração + registrar em app.ts**

`dispute.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser, createProfessional, createDemand } from '@/test/factories';

describe('dispute routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('cliente abre disputa e contrato fica disputed', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const demand = await createDemand(app, { clientToken: client.token });
    const quote = await app.inject({
      method: 'POST', url: `/api/demands/${demand.id}/quotes`,
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { message: 'orcamento', validUntil: null, items: [{ description: 'x', quantity: 1, unitPrice: 100 }] },
    });
    const accept = await app.inject({
      method: 'POST', url: `/api/quotes/${quote.json().id}/accept`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { schedule: null },
    });
    const contractId = accept.json().id;
    await app.inject({ method: 'POST', url: `/api/contracts/${contractId}/start`, headers: { authorization: `Bearer ${pro.token}` } });

    const dispute = await app.inject({
      method: 'POST', url: `/api/contracts/${contractId}/disputes`,
      headers: { authorization: `Bearer ${client.token}` },
      payload: { reason: 'Serviço não concluído no prazo' },
    });
    expect(dispute.statusCode).toBe(201);
    expect(dispute.json().status).toBe('open');

    const detail = await app.inject({ method: 'GET', url: `/api/contracts/${contractId}`, headers: { authorization: `Bearer ${client.token}` } });
    expect(detail.json().status).toBe('disputed');
  });
});
```

Em `app.ts`:

```ts
import { disputeRoutes } from '@/modules/dispute/dispute.routes';
await app.register(disputeRoutes);
```

- [ ] **Step 7: Rodar suíte backend das fases 9**

Run: `cd backend && npx vitest run src/modules/demand src/modules/quote src/modules/contract src/modules/dispute && npx tsc --noEmit`
Expected: PASS + typecheck limpo.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/dispute backend/src/app.ts
git commit -m "feat(dispute): adiciona disputa de contrato"
```

---

## Task 10: Frontend feature `demands` — api + queries + schemas

**Files:**
- Create: `frontend/src/features/demands/api.ts`
- Create: `frontend/src/features/demands/schemas.ts`
- Create: `frontend/src/features/demands/queries.ts`

**Interfaces:**
- Consumes: `http` de `@/lib/http` (axios, baseURL `/api`); `useQuery`/`useMutation` de `@tanstack/react-query`.
- Produces: `demandFormSchema`, `Demand`, `Quote`, `useDemands`, `useDemand`, `usePublishDemand`, `useDemandQuotes`, `useAcceptQuote`, `useInviteProfessional`.

- [ ] **Step 1: Escrever schemas + api + queries**

`schemas.ts`:

```ts
import { z } from 'zod';

export const demandFormSchema = z.object({
  categoryId: z.string().uuid('Categoria obrigatória'),
  title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
  description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
  budgetMin: z.coerce.number().nonnegative(),
  budgetMax: z.coerce.number().nonnegative(),
}).refine((v) => v.budgetMax >= v.budgetMin, { message: 'Máximo deve ser >= mínimo', path: ['budgetMax'] });

export type DemandFormValues = z.infer<typeof demandFormSchema>;
```

`api.ts`:

```ts
import { http } from '@/lib/http';
import type { DemandFormValues } from './schemas';

export interface Demand {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  status: 'open' | 'contracted' | 'closed' | 'cancelled';
  createdAt: string;
}

export interface QuoteItem { description: string; quantity: number; unitPrice: number; subtotal: number; }
export interface Quote {
  id: string;
  demandId: string;
  professionalId: string;
  message: string;
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  items: QuoteItem[];
  createdAt: string;
}

export interface Paginated<T> { items: T[]; page: number; limit: number; total: number; }

export async function fetchDemands(params: { page?: number; mine?: boolean }): Promise<Paginated<Demand>> {
  const { data } = await http.get<Paginated<Demand>>('/demands', { params });
  return data;
}

export async function fetchDemand(id: string): Promise<Demand> {
  const { data } = await http.get<Demand>(`/demands/${id}`);
  return data;
}

export async function publishDemand(values: DemandFormValues): Promise<Demand> {
  const { data } = await http.post<Demand>('/demands', { ...values, addressId: null, tagIds: [], images: [] });
  return data;
}

export async function fetchDemandQuotes(demandId: string): Promise<Quote[]> {
  const { data } = await http.get<Quote[]>(`/demands/${demandId}/quotes`);
  return data;
}

export async function acceptQuote(quoteId: string): Promise<{ id: string }> {
  const { data } = await http.post<{ id: string }>(`/quotes/${quoteId}/accept`, { schedule: null });
  return data;
}

export async function inviteProfessional(demandId: string, professionalId: string): Promise<void> {
  await http.post(`/demands/${demandId}/invitations`, { professionalId });
}
```

`queries.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDemands, fetchDemand, publishDemand, fetchDemandQuotes, acceptQuote, inviteProfessional,
} from './api';
import type { DemandFormValues } from './schemas';

export const demandKeys = {
  all: ['demands'] as const,
  list: (mine?: boolean) => ['demands', 'list', { mine }] as const,
  detail: (id: string) => ['demands', 'detail', id] as const,
  quotes: (id: string) => ['demands', id, 'quotes'] as const,
};

export function useDemands(mine?: boolean) {
  return useQuery({ queryKey: demandKeys.list(mine), queryFn: () => fetchDemands({ mine }) });
}

export function useDemand(id: string) {
  return useQuery({ queryKey: demandKeys.detail(id), queryFn: () => fetchDemand(id), enabled: !!id });
}

export function usePublishDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: DemandFormValues) => publishDemand(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: demandKeys.all }),
  });
}

export function useDemandQuotes(id: string) {
  return useQuery({ queryKey: demandKeys.quotes(id), queryFn: () => fetchDemandQuotes(id), enabled: !!id });
}

export function useAcceptQuote(demandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => acceptQuote(quoteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: demandKeys.detail(demandId) }),
  });
}

export function useInviteProfessional(demandId: string) {
  return useMutation({
    mutationFn: (professionalId: string) => inviteProfessional(demandId, professionalId),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/demands/api.ts frontend/src/features/demands/schemas.ts frontend/src/features/demands/queries.ts
git commit -m "feat(demands): adiciona api, queries e schemas da feature demandas"
```

---

## Task 11: Frontend `demands` — componentes + páginas + teste RTL

**Files:**
- Create: `frontend/src/features/demands/components/DemandForm.tsx`
- Create: `frontend/src/features/demands/components/DemandCard.tsx`
- Create: `frontend/src/features/demands/components/InviteProfessionalDialog.tsx`
- Create: `frontend/src/features/demands/pages/PublishDemandPage.tsx`
- Create: `frontend/src/features/demands/pages/DemandListPage.tsx`
- Create: `frontend/src/features/demands/pages/DemandDetailPage.tsx`
- Test: `frontend/src/features/demands/demands.test.tsx`

**Interfaces:**
- Consumes: hooks da Task 10; `useForm` + `zodResolver`; `useParams` do react-router.
- Produces: componentes/páginas roteáveis. Rotas registradas na fase 3 router; aqui só exporta os componentes.

- [ ] **Step 1: Escrever teste RTL falho**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemandCard } from './components/DemandCard';

describe('DemandCard', () => {
  it('mostra título e faixa de orçamento formatada', () => {
    render(
      <DemandCard
        demand={{
          id: 'd1', clientId: 'c1', categoryId: 'cat1', title: 'Instalação elétrica',
          description: 'x', budgetMin: 100, budgetMax: 500, status: 'open', createdAt: '2026-07-01T12:00:00Z',
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Instalação elétrica')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?100/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?500/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/features/demands/demands.test.tsx`
Expected: FAIL — componente inexistente.

- [ ] **Step 3: Implementar `DemandCard`**

```tsx
import type { Demand } from '../api';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
}

export function DemandCard({ demand, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(demand.id)}
      className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 p-4 text-left hover:border-slate-400"
    >
      <span className="text-base font-semibold text-slate-900">{demand.title}</span>
      <span className="text-sm text-slate-500">
        {currency(demand.budgetMin)} — {currency(demand.budgetMax)}
      </span>
      <span className="text-xs uppercase tracking-wide text-slate-400">{demand.status}</span>
    </button>
  );
}
```

- [ ] **Step 4: Implementar `DemandForm`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';

interface Props {
  onSubmit: (values: DemandFormValues) => void;
  submitting?: boolean;
}

export function DemandForm({ onSubmit, submitting }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: { title: '', description: '', budgetMin: 0, budgetMax: 0, categoryId: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <input {...register('categoryId')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.categoryId && <span className="text-xs text-red-600">{errors.categoryId.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Título</span>
        <input {...register('title')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Descrição</span>
        <textarea {...register('description')} rows={5} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento mínimo</span>
          <input type="number" step="0.01" {...register('budgetMin')} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento máximo</span>
          <input type="number" step="0.01" {...register('budgetMax')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.budgetMax && <span className="text-xs text-red-600">{errors.budgetMax.message}</span>}
        </label>
      </div>
      <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        Publicar demanda
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Implementar `InviteProfessionalDialog`**

```tsx
import { useState } from 'react';
import { useInviteProfessional } from '../queries';

interface Props {
  demandId: string;
  onClose: () => void;
}

export function InviteProfessionalDialog({ demandId, onClose }: Props) {
  const [professionalId, setProfessionalId] = useState('');
  const invite = useInviteProfessional(demandId);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="flex w-96 flex-col gap-3 rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Convidar profissional</h3>
        <input
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="ID do profissional"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-slate-500">Cancelar</button>
          <button
            type="button"
            disabled={invite.isPending || !professionalId}
            onClick={() => invite.mutate(professionalId, { onSuccess: onClose })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            Convidar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implementar as páginas**

`PublishDemandPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';

export function PublishDemandPage() {
  const navigate = useNavigate();
  const publish = usePublishDemand();
  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm
        submitting={publish.isPending}
        onSubmit={(values) => publish.mutate(values, { onSuccess: (d) => navigate(`/demands/${d.id}`) })}
      />
    </section>
  );
}
```

`DemandListPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { DemandCard } from '../components/DemandCard';
import { useDemands } from '../queries';

export function DemandListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDemands();
  if (isLoading) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">Demandas</h1>
      {data?.items.map((d) => <DemandCard key={d.id} demand={d} onOpen={(id) => navigate(`/demands/${id}`)} />)}
    </section>
  );
}
```

`DemandDetailPage.tsx`:

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDemand, useDemandQuotes, useAcceptQuote } from '../queries';
import { InviteProfessionalDialog } from '../components/InviteProfessionalDialog';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DemandDetailPage() {
  const { id = '' } = useParams();
  const [inviting, setInviting] = useState(false);
  const { data: demand } = useDemand(id);
  const { data: quotes } = useDemandQuotes(id);
  const accept = useAcceptQuote(id);

  if (!demand) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{demand.title}</h1>
        <button type="button" onClick={() => setInviting(true)} className="rounded-lg border border-slate-300 px-3 py-2">
          Convidar profissional
        </button>
      </header>
      <p className="text-slate-600">{demand.description}</p>
      <h2 className="text-lg font-semibold">Orçamentos</h2>
      <ul className="flex flex-col gap-2">
        {quotes?.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span>{currency(q.total)} — {q.status}</span>
            {q.status === 'pending' && demand.status === 'open' && (
              <button
                type="button"
                onClick={() => accept.mutate(q.id)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-white"
              >
                Aceitar
              </button>
            )}
          </li>
        ))}
      </ul>
      {inviting && <InviteProfessionalDialog demandId={id} onClose={() => setInviting(false)} />}
    </section>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/demands/demands.test.tsx && npx tsc --noEmit`
Expected: PASS + typecheck limpo.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/demands
git commit -m "feat(demands): adiciona telas de publicar, listar e detalhar demanda"
```

---

## Task 12: Frontend feature `contracts` — api/queries/schemas + componentes/páginas + teste

**Files:**
- Create: `frontend/src/features/contracts/api.ts`
- Create: `frontend/src/features/contracts/queries.ts`
- Create: `frontend/src/features/contracts/schemas.ts`
- Create: `frontend/src/features/contracts/components/ContractProgress.tsx`
- Create: `frontend/src/features/contracts/components/ProgressUpdateForm.tsx`
- Create: `frontend/src/features/contracts/components/DisputeDialog.tsx`
- Create: `frontend/src/features/contracts/pages/ContractListPage.tsx`
- Create: `frontend/src/features/contracts/pages/ContractDetailPage.tsx`
- Test: `frontend/src/features/contracts/contracts.test.tsx`

**Interfaces:**
- Consumes: `http`; TanStack Query; react-hook-form + zodResolver; `useParams`.
- Produces: `Contract`, `ProgressUpdate`, `progressFormSchema`, `useContracts`, `useContract`, `useContractProgress`, `useAddProgress`, `useCompleteContract`, `useOpenDispute`.

- [ ] **Step 1: Escrever schemas + api + queries**

`schemas.ts`:

```ts
import { z } from 'zod';

export const progressFormSchema = z.object({
  description: z.string().min(3, 'Descreva o progresso').max(1000),
  percentage: z.coerce.number().int().min(0).max(100),
});
export type ProgressFormValues = z.infer<typeof progressFormSchema>;

export const disputeFormSchema = z.object({
  reason: z.string().min(10, 'Mínimo 10 caracteres').max(2000),
});
export type DisputeFormValues = z.infer<typeof disputeFormSchema>;
```

`api.ts`:

```ts
import { http } from '@/lib/http';

export interface Contract {
  id: string;
  demandId: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  total: number;
  status: 'active' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  cancelledBy: string | null;
  cancellationReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  contractId: string;
  authorId: string;
  description: string;
  percentage: number;
  images: string[];
  createdAt: string;
}

export async function fetchContracts(): Promise<Contract[]> {
  const { data } = await http.get<Contract[]>('/contracts');
  return data;
}

export async function fetchContract(id: string): Promise<Contract> {
  const { data } = await http.get<Contract>(`/contracts/${id}`);
  return data;
}

export async function fetchProgress(id: string): Promise<ProgressUpdate[]> {
  const { data } = await http.get<ProgressUpdate[]>(`/contracts/${id}/progress`);
  return data;
}

export async function addProgress(id: string, values: { description: string; percentage: number }): Promise<ProgressUpdate> {
  const { data } = await http.post<ProgressUpdate>(`/contracts/${id}/progress`, { ...values, images: [] });
  return data;
}

export async function completeContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/complete`, {});
  return data;
}

export async function openDispute(id: string, reason: string): Promise<void> {
  await http.post(`/contracts/${id}/disputes`, { reason });
}
```

`queries.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContracts, fetchContract, fetchProgress, addProgress, completeContract, openDispute,
} from './api';

export const contractKeys = {
  all: ['contracts'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  progress: (id: string) => ['contracts', id, 'progress'] as const,
};

export function useContracts() {
  return useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });
}

export function useContract(id: string) {
  return useQuery({ queryKey: contractKeys.detail(id), queryFn: () => fetchContract(id), enabled: !!id });
}

export function useContractProgress(id: string) {
  return useQuery({ queryKey: contractKeys.progress(id), queryFn: () => fetchProgress(id), enabled: !!id });
}

export function useAddProgress(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: { description: string; percentage: number }) => addProgress(id, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.progress(id) }),
  });
}

export function useCompleteContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeContract(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function useOpenDispute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => openDispute(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}
```

- [ ] **Step 2: Escrever teste RTL falho**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractProgress } from './components/ContractProgress';

describe('ContractProgress', () => {
  it('renderiza atualizações em ordem com percentual', () => {
    render(
      <ContractProgress
        updates={[
          { id: 'p1', contractId: 'c1', authorId: 'pro1', description: 'Fase 1', percentage: 50, images: [], createdAt: '2026-07-01T12:00:00Z' },
        ]}
      />,
    );
    expect(screen.getByText('Fase 1')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/features/contracts/contracts.test.tsx`
Expected: FAIL — componente inexistente.

- [ ] **Step 4: Implementar componentes**

`ContractProgress.tsx`:

```tsx
import type { ProgressUpdate } from '../api';

interface Props {
  updates: ProgressUpdate[];
}

export function ContractProgress({ updates }: Props) {
  return (
    <ol className="flex flex-col gap-2">
      {updates.map((u) => (
        <li key={u.id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{u.description}</span>
            <span className="text-sm text-slate-500">{u.percentage}%</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

`ProgressUpdateForm.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { progressFormSchema, type ProgressFormValues } from '../schemas';

interface Props {
  onSubmit: (values: ProgressFormValues) => void;
  submitting?: boolean;
}

export function ProgressUpdateForm({ onSubmit, submitting }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProgressFormValues>({
    resolver: zodResolver(progressFormSchema),
    defaultValues: { description: '', percentage: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => { onSubmit(values); reset(); })}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
    >
      <textarea {...register('description')} rows={3} placeholder="Descreva o progresso" className="rounded-lg border border-slate-300 px-3 py-2" />
      {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      <input type="number" {...register('percentage')} className="rounded-lg border border-slate-300 px-3 py-2" />
      <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
        Registrar progresso
      </button>
    </form>
  );
}
```

`DisputeDialog.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { disputeFormSchema, type DisputeFormValues } from '../schemas';
import { useOpenDispute } from '../queries';

interface Props {
  contractId: string;
  onClose: () => void;
}

export function DisputeDialog({ contractId, onClose }: Props) {
  const dispute = useOpenDispute(contractId);
  const { register, handleSubmit, formState: { errors } } = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: { reason: '' },
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit((v) => dispute.mutate(v.reason, { onSuccess: onClose }))}
        className="flex w-96 flex-col gap-3 rounded-xl bg-white p-5"
      >
        <h3 className="text-lg font-semibold">Abrir disputa</h3>
        <textarea {...register('reason')} rows={4} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.reason && <span className="text-xs text-red-600">{errors.reason.message}</span>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-slate-500">Cancelar</button>
          <button type="submit" disabled={dispute.isPending} className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50">
            Abrir disputa
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Implementar páginas**

`ContractListPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../queries';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContractListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useContracts();
  if (isLoading) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">Contratos</h1>
      {data?.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => navigate(`/contracts/${c.id}`)}
          className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-slate-400"
        >
          <span className="font-medium">{currency(c.total)}</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">{c.status}</span>
        </button>
      ))}
    </section>
  );
}
```

`ContractDetailPage.tsx`:

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useContract, useContractProgress, useAddProgress, useCompleteContract } from '../queries';
import { ContractProgress } from '../components/ContractProgress';
import { ProgressUpdateForm } from '../components/ProgressUpdateForm';
import { DisputeDialog } from '../components/DisputeDialog';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContractDetailPage() {
  const { id = '' } = useParams();
  const [disputing, setDisputing] = useState(false);
  const { data: contract } = useContract(id);
  const { data: updates } = useContractProgress(id);
  const addProgress = useAddProgress(id);
  const complete = useCompleteContract(id);

  if (!contract) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{currency(contract.total)}</h1>
        <span className="text-xs uppercase tracking-wide text-slate-400">{contract.status}</span>
      </header>
      <div className="flex gap-2">
        {contract.status === 'in_progress' && (
          <button type="button" onClick={() => complete.mutate()} className="rounded-lg bg-slate-900 px-3 py-2 text-white">
            Concluir contrato
          </button>
        )}
        <button type="button" onClick={() => setDisputing(true)} className="rounded-lg border border-red-300 px-3 py-2 text-red-600">
          Abrir disputa
        </button>
      </div>
      {contract.status === 'in_progress' && (
        <ProgressUpdateForm submitting={addProgress.isPending} onSubmit={(v) => addProgress.mutate(v)} />
      )}
      <h2 className="text-lg font-semibold">Acompanhamento</h2>
      <ContractProgress updates={updates ?? []} />
      {disputing && <DisputeDialog contractId={id} onClose={() => setDisputing(false)} />}
    </section>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/contracts/contracts.test.tsx && npx tsc --noEmit`
Expected: PASS + typecheck limpo.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/contracts
git commit -m "feat(contracts): adiciona acompanhamento, progresso e disputa"
```

---

## Task 13: Verificação final da fase 9

**Files:** nenhum novo.

- [ ] **Step 1: Backend — testes + lint + typecheck**

Run: `cd backend && npx vitest run src/modules/demand src/modules/quote src/modules/contract src/modules/dispute && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

- [ ] **Step 2: Frontend — testes + lint + typecheck**

Run: `cd frontend && npx vitest run src/features/demands src/features/contracts && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

- [ ] **Step 3: Marcar fase no índice**

Em `docs/superpowers/plans/plan_index.md`, marcar `- [x] Fase 9 — demand/contract`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/plan_index.md
git commit -m "chore(plans): marca fase 9 concluída"
```

---

## Self-Review

**Cobertura da spec (§3 Demandas/Orçamentos/Contratos, §1 fluxo principal):**
- `service_demands` + `demand_images` + `demand_tags` → Task 1-2. ✔
- `demand_invitations` (convite direto) → Task 3-4. ✔
- `quotes` + `quote_items` (profissional envia, total calculado) → Task 5-6. ✔
- `contracts` + `schedules` (aceitar vira contrato) → Task 7-8. ✔
- `contract_progress_updates` + `contract_progress_images` → Task 7-8. ✔
- `contracts.cancelled_by` nullable → tratado em `cancel` (Task 7) e schema. ✔
- `contract_disputes` → Task 9. ✔
- Features frontend `demands` e `contracts` → Tasks 10-12. ✔

**DECIMAL string → Number():** coberto por asserts em `demand.service.test` (budget), `quote.service.test` (total/subtotal) e mapeamento `Number()` em todos os `toResponse`. Aprofundamento monetário completo fica na fase 10 (wallet/payment).

**Enums via z.enum:** `demandStatusEnum`, `quoteStatusEnum`, `contractStatusEnum`, `disputeStatusEnum`, status de convite — todos `z.enum`, nunca `z.string()`. ✔

**Consistência de tipos:** `DemandResponse`, `QuoteResponse`, `ContractResponse`, `ProgressUpdateResponse`, `DisputeResponse` definidos nos schemas e reusados nos services/controllers com os mesmos nomes. `acceptQuote(clientId, quoteId, schedule)` idêntico entre service (Task 7) e controller (Task 8). ✔

**Placeholders:** nenhum TODO/TBD; todo passo com código real. ✔
