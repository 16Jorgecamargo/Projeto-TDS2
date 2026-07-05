# Fase 2 — Schemas, Service actor-aware e DI (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Depende da Fase 1 concluída (`plan_phase1_backend_data_model.md`). Ver `plan_index.md` para visão geral.

**Goal:** Atualizar os schemas Zod da demanda, tornar `DemandService` capaz de decidir se revela o endereço completo (`street/number/complement/district/zipCode`) com base em quem está perguntando, e ligar isso na injeção de dependência (`Repository<Contract>`) e no controller.

**Architecture:** `DemandService` ganha um tipo `DemandActor { userId, professionalId }` e um método privado `canRevealFullAddress` que consulta `contracts` (status `active`/`completed`). `DemandController` resolve o `professionalId` do usuário logado (mesmo padrão do `ContractController.resolveOptionalProfileId`) e monta o `actor` antes de chamar `list`/`getById`.

**Tech Stack:** Zod, TypeORM (`Repository<Contract>`, operador `In`), Vitest.

## Global Constraints

Ver `plan_index.md`.

---

### Task 2.1: Atualizar `demand.schemas.ts`

**Files:**
- Modify: `backend/src/modules/demand/demand.schemas.ts`

**Interfaces:**
- Produces: `CreateDemandInput` com `street, number, complement, district, city, state, zipCode` (endereço obrigatório exceto `complement`) e `budgetMin`/`budgetMax` opcionais; `DemandResponse` com `city`, `state` sempre presentes e `street/number/complement/district/zipCode` como `string | null`; `UpdateDemandInput` com os mesmos campos de endereço opcionais.

- [ ] **Step 1: Reescrever `createDemandSchema`, `updateDemandSchema` e `demandResponseSchema`**

Substituir em `backend/src/modules/demand/demand.schemas.ts` (mantendo `demandStatusEnum`, `demandImageSchema`, `demandListQuerySchema`, `inviteProfessionalSchema`, `demandInvitationResponseSchema` como estão):

```ts
export const createDemandSchema = z
  .object({
    categoryId: z
      .string()
      .uuid()
      .describe('Categoria do serviço')
      .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
    title: z
      .string()
      .min(5)
      .max(120)
      .describe('Título da demanda')
      .openapi({ example: 'Instalação elétrica' }),
    description: z
      .string()
      .min(20)
      .max(4000)
      .describe('Descrição detalhada')
      .openapi({ example: 'Preciso instalar 4 tomadas na sala e cozinha' }),
    budgetMin: z
      .number()
      .nonnegative()
      .optional()
      .describe('Orçamento mínimo previsto')
      .openapi({ example: 100 }),
    budgetMax: z
      .number()
      .nonnegative()
      .optional()
      .describe('Orçamento máximo previsto')
      .openapi({ example: 500 }),
    street: z.string().min(1).max(255).describe('Logradouro').openapi({ example: 'Rua das Flores' }),
    number: z.string().min(1).max(20).describe('Número').openapi({ example: '123' }),
    complement: z
      .string()
      .max(255)
      .nullable()
      .default(null)
      .describe('Complemento')
      .openapi({ example: null }),
    district: z.string().min(1).max(128).describe('Bairro').openapi({ example: 'Centro' }),
    city: z.string().min(1).max(128).describe('Cidade').openapi({ example: 'Porto Alegre' }),
    state: z.string().length(2).describe('UF').openapi({ example: 'RS' }),
    zipCode: z.string().min(8).max(9).describe('CEP').openapi({ example: '90000-000' }),
    tagIds: z
      .array(z.string().uuid())
      .max(10)
      .describe('Tags do serviço')
      .openapi({ example: [] }),
    images: z
      .array(demandImageSchema)
      .max(10)
      .describe('Imagens da demanda')
      .openapi({ example: [] }),
  })
  .refine((v) => v.budgetMin === undefined || v.budgetMax === undefined || v.budgetMax >= v.budgetMin, {
    message: 'budgetMax deve ser >= budgetMin',
    path: ['budgetMax'],
  });

export const updateDemandSchema = z.object({
  title: z
    .string()
    .min(5)
    .max(120)
    .optional()
    .describe('Título da demanda')
    .openapi({ example: 'Instalação elétrica' }),
  description: z
    .string()
    .min(20)
    .max(4000)
    .optional()
    .describe('Descrição detalhada')
    .openapi({ example: 'Descrição atualizada da demanda' }),
  budgetMin: z
    .number()
    .nonnegative()
    .optional()
    .describe('Orçamento mínimo previsto')
    .openapi({ example: 100 }),
  budgetMax: z
    .number()
    .nonnegative()
    .optional()
    .describe('Orçamento máximo previsto')
    .openapi({ example: 500 }),
  street: z.string().min(1).max(255).optional().describe('Logradouro').openapi({ example: 'Rua das Flores' }),
  number: z.string().min(1).max(20).optional().describe('Número').openapi({ example: '123' }),
  complement: z.string().max(255).nullable().optional().describe('Complemento').openapi({ example: null }),
  district: z.string().min(1).max(128).optional().describe('Bairro').openapi({ example: 'Centro' }),
  city: z.string().min(1).max(128).optional().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).optional().describe('UF').openapi({ example: 'RS' }),
  zipCode: z.string().min(8).max(9).optional().describe('CEP').openapi({ example: '90000-000' }),
});

export const demandResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da demanda')
    .openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  clientId: z
    .string()
    .uuid()
    .describe('Cliente autor')
    .openapi({ example: '1a2b1111-1111-1111-1111-111111111111' }),
  categoryId: z
    .string()
    .uuid()
    .describe('Categoria')
    .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  title: z.string().describe('Título').openapi({ example: 'Instalação elétrica' }),
  description: z
    .string()
    .describe('Descrição')
    .openapi({ example: 'Preciso instalar 4 tomadas na sala e cozinha' }),
  budgetMin: z.number().nullable().describe('Orçamento mínimo').openapi({ example: 100 }),
  budgetMax: z.number().nullable().describe('Orçamento máximo').openapi({ example: 500 }),
  status: demandStatusEnum,
  city: z.string().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).describe('UF').openapi({ example: 'RS' }),
  street: z
    .string()
    .nullable()
    .describe('Logradouro (somente dono ou profissional com contrato aceito)')
    .openapi({ example: null }),
  number: z.string().nullable().describe('Número').openapi({ example: null }),
  complement: z.string().nullable().describe('Complemento').openapi({ example: null }),
  district: z.string().nullable().describe('Bairro').openapi({ example: null }),
  zipCode: z.string().nullable().describe('CEP').openapi({ example: null }),
  images: z.array(demandImageSchema).describe('Imagens').openapi({ example: [] }),
  tagIds: z.array(z.string().uuid()).describe('Tags').openapi({ example: [] }),
  createdAt: z
    .string()
    .datetime()
    .describe('Data de criação')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/demand/demand.schemas.ts
git commit -m "feat: schema de demanda ganha endereco completo e orcamento opcional"
```

---

### Task 2.2: `DemandService` actor-aware

**Files:**
- Modify: `backend/src/modules/demand/demand.service.ts`
- Test: `backend/src/modules/demand/demand.service.test.ts`

**Interfaces:**
- Consumes: `Contract` entity de `../../infra/database/entities/contract.entity.js`; `In` de `typeorm`.
- Produces: `export interface DemandActor { userId: string; professionalId: string | null }`; `DemandService.list(query, actor: DemandActor)`; `DemandService.getById(id, actor?: DemandActor)` — usados pela Task 2.3 (`DemandController`).

- [ ] **Step 1: Escrever o teste que expõe a regra de visibilidade (falha primeiro)**

Adicionar em `backend/src/modules/demand/demand.service.test.ts`, dentro do `describe('DemandService', ...)`, um novo bloco (ajustar os `beforeEach` existentes para incluir o mock de `contracts` — ver Step 2):

```ts
describe('toResponse via getById — visibilidade do endereco', () => {
  const baseDemand = {
    id: 'demand-1',
    client_id: 'client-1',
    category_id: 'cat-1',
    title: 'Instalacao eletrica',
    description: 'x'.repeat(20),
    budget_min: null,
    budget_max: null,
    status: 'open' as const,
    street: 'Rua das Flores',
    number: '123',
    complement: null,
    district: 'Centro',
    city: 'Porto Alegre',
    state: 'RS',
    zip_code: '90000-000',
    created_at: new Date('2026-07-01T12:00:00Z'),
  };

  it('sem actor: so expoe cidade/UF', async () => {
    demands.findOne.mockResolvedValueOnce(baseDemand as ServiceDemand);
    const result = await service.getById('demand-1');
    expect(result.city).toBe('Porto Alegre');
    expect(result.state).toBe('RS');
    expect(result.street).toBeNull();
  });

  it('dono da demanda: ve endereco completo', async () => {
    demands.findOne.mockResolvedValueOnce(baseDemand as ServiceDemand);
    const result = await service.getById('demand-1', { userId: 'client-1', professionalId: null });
    expect(result.street).toBe('Rua das Flores');
    expect(result.number).toBe('123');
  });

  it('profissional sem contrato: nao ve endereco completo', async () => {
    demands.findOne.mockResolvedValueOnce(baseDemand as ServiceDemand);
    contracts.findOne.mockResolvedValueOnce(null);
    const result = await service.getById('demand-1', { userId: 'other-user', professionalId: 'pro-1' });
    expect(result.street).toBeNull();
  });

  it('profissional com contrato ativo: ve endereco completo', async () => {
    demands.findOne.mockResolvedValueOnce(baseDemand as ServiceDemand);
    contracts.findOne.mockResolvedValueOnce({ id: 'contract-1', status: 'active' } as Contract);
    const result = await service.getById('demand-1', { userId: 'other-user', professionalId: 'pro-1' });
    expect(result.street).toBe('Rua das Flores');
  });
});
```

- [ ] **Step 2: Atualizar o setup do describe principal para mockar `contracts` e importar `Contract`**

No topo de `backend/src/modules/demand/demand.service.test.ts`, adicionar o import e o mock:

```ts
import type { Contract } from '../../infra/database/entities/contract.entity.js';
```

No `beforeEach`, adicionar `contracts` ao construtor do service:

```ts
let contracts: ReturnType<typeof mockRepo<Contract>>;

beforeEach(() => {
  demands = mockRepo<ServiceDemand>();
  images = mockRepo<DemandImage>();
  tags = mockRepo<DemandTag>();
  invitations = mockRepo<DemandInvitation>();
  contracts = mockRepo<Contract>();
  service = new DemandService({
    demands: demands as unknown as Repository<ServiceDemand>,
    images: images as unknown as Repository<DemandImage>,
    tags: tags as unknown as Repository<DemandTag>,
    invitations: invitations as unknown as Repository<DemandInvitation>,
    contracts: contracts as unknown as Repository<Contract>,
  });
});
```

Também atualizar o teste existente `'persiste demanda e retorna budgets como number'` (dentro de `describe('create', ...)`) para o novo shape de `ServiceDemand`/`CreateDemandInput` (sem `address_id`/`addressId`, com endereço completo):

```ts
it('persiste demanda e retorna budgets como number', async () => {
  demands.save.mockResolvedValueOnce({
    id: 'demand-1',
    client_id: 'client-1',
    category_id: 'cat-1',
    title: 'Instalacao eletrica',
    description: 'x'.repeat(20),
    budget_min: '100.00',
    budget_max: '500.00',
    status: 'open',
    street: 'Rua das Flores',
    number: '123',
    complement: null,
    district: 'Centro',
    city: 'Porto Alegre',
    state: 'RS',
    zip_code: '90000-000',
    created_at: new Date('2026-07-01T12:00:00Z'),
  } as ServiceDemand);
  images.save.mockResolvedValueOnce({
    id: 'img-1', demand_id: 'demand-1', image_url: 'https://cdn.app/a.jpg', position: 0,
  } as DemandImage);

  const result = await service.create('client-1', {
    categoryId: 'cat-1',
    title: 'Instalacao eletrica',
    description: 'x'.repeat(20),
    budgetMin: 100,
    budgetMax: 500,
    street: 'Rua das Flores',
    number: '123',
    complement: null,
    district: 'Centro',
    city: 'Porto Alegre',
    state: 'RS',
    zipCode: '90000-000',
    tagIds: ['tag-1'],
    images: [{ url: 'https://cdn.app/a.jpg', position: 0 }],
  });

  expect(result.budgetMin).toBe(100);
  expect(typeof result.budgetMin).toBe('number');
  expect(result.street).toBe('Rua das Flores');
  expect(tags.save).toHaveBeenCalled();
  expect(images.save).toHaveBeenCalled();
});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham (service ainda não tem `contracts`/actor)**

```bash
cd backend
npx vitest run src/modules/demand/demand.service.test.ts
```

Expected: FAIL — `DemandServiceDeps` não tem `contracts`, `getById` não aceita segundo argumento, `result.street` é `undefined` não `null`.

- [ ] **Step 4: Reescrever `demand.service.ts`**

Substituir o conteúdo inteiro de `backend/src/modules/demand/demand.service.ts` por:

```ts
import { In, type Repository } from 'typeorm';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { DemandImage } from '../../infra/database/entities/demand-image.entity.js';
import type { DemandTag } from '../../infra/database/entities/demand-tag.entity.js';
import type { DemandInvitation } from '../../infra/database/entities/demand-invitation.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandResponse,
  DemandListQuery,
  DemandInvitationResponse,
} from './demand.schemas.js';

export interface DemandActor {
  userId: string;
  professionalId: string | null;
}

interface DemandServiceDeps {
  demands: Repository<ServiceDemand>;
  images: Repository<DemandImage>;
  tags: Repository<DemandTag>;
  invitations: Repository<DemandInvitation>;
  contracts: Repository<Contract>;
}

export class DemandService {
  constructor(private readonly deps: DemandServiceDeps) {}

  private async canRevealFullAddress(demand: ServiceDemand, actor?: DemandActor): Promise<boolean> {
    if (!actor) return false;
    if (demand.client_id === actor.userId) return true;
    if (!actor.professionalId) return false;
    const contract = await this.deps.contracts.findOne({
      where: { demand_id: demand.id, professional_id: actor.professionalId, status: In(['active', 'completed']) },
    });
    return contract !== null;
  }

  private async toResponse(
    demand: ServiceDemand,
    images: DemandImage[],
    tagIds: string[],
    actor?: DemandActor,
  ): Promise<DemandResponse> {
    const revealAddress = await this.canRevealFullAddress(demand, actor);
    return {
      id: demand.id,
      clientId: demand.client_id,
      categoryId: demand.category_id,
      title: demand.title,
      description: demand.description,
      budgetMin: demand.budget_min !== null ? Number(demand.budget_min) : null,
      budgetMax: demand.budget_max !== null ? Number(demand.budget_max) : null,
      status: demand.status,
      city: demand.city ?? '',
      state: demand.state ?? '',
      street: revealAddress ? demand.street : null,
      number: revealAddress ? demand.number : null,
      complement: revealAddress ? demand.complement : null,
      district: revealAddress ? demand.district : null,
      zipCode: revealAddress ? demand.zip_code : null,
      images: [...images]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ url: i.image_url, position: i.position })),
      tagIds,
      createdAt: demand.created_at.toISOString(),
    };
  }

  private async loadAssociations(demandId: string): Promise<{ images: DemandImage[]; tagIds: string[] }> {
    const images = await this.deps.images.find({ where: { demand_id: demandId } });
    const tagRows = await this.deps.tags.find({ where: { demand_id: demandId } });
    return { images, tagIds: tagRows.map((t) => t.tag_id) };
  }

  async create(clientId: string, input: CreateDemandInput): Promise<DemandResponse> {
    const demand = await this.deps.demands.save(
      this.deps.demands.create({
        client_id: clientId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        budget_min: input.budgetMin !== undefined ? input.budgetMin.toFixed(2) : null,
        budget_max: input.budgetMax !== undefined ? input.budgetMax.toFixed(2) : null,
        street: input.street,
        number: input.number,
        complement: input.complement,
        district: input.district,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        status: 'open',
      }),
    );
    const images = await Promise.all(
      input.images.map((i) =>
        this.deps.images.save(
          this.deps.images.create({ demand_id: demand.id, image_url: i.url, position: i.position }),
        ),
      ),
    );
    await Promise.all(
      input.tagIds.map((tagId) =>
        this.deps.tags.save(this.deps.tags.create({ demand_id: demand.id, tag_id: tagId })),
      ),
    );
    businessMetrics.demandsCreated.inc();
    return this.toResponse(demand, images, input.tagIds, { userId: clientId, professionalId: null });
  }

  async list(query: DemandListQuery, actor: DemandActor): Promise<{ items: DemandResponse[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.category_id = query.categoryId;
    if (query.mine) where.client_id = actor.userId;
    const [rows, total] = await this.deps.demands.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const items = await Promise.all(
      rows.map(async (d) => {
        const { images, tagIds } = await this.loadAssociations(d.id);
        return this.toResponse(d, images, tagIds, actor);
      }),
    );
    return { items, total };
  }

  async getById(id: string, actor?: DemandActor): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(demand, images, tagIds, actor);
  }

  async update(id: string, clientId: string, input: UpdateDemandInput): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda nao editavel');
    if (input.title !== undefined) demand.title = input.title;
    if (input.description !== undefined) demand.description = input.description;
    if (input.budgetMin !== undefined) demand.budget_min = input.budgetMin.toFixed(2);
    if (input.budgetMax !== undefined) demand.budget_max = input.budgetMax.toFixed(2);
    if (input.street !== undefined) demand.street = input.street;
    if (input.number !== undefined) demand.number = input.number;
    if (input.complement !== undefined) demand.complement = input.complement;
    if (input.district !== undefined) demand.district = input.district;
    if (input.city !== undefined) demand.city = input.city;
    if (input.state !== undefined) demand.state = input.state;
    if (input.zipCode !== undefined) demand.zip_code = input.zipCode;
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(saved, images, tagIds, { userId: clientId, professionalId: null });
  }

  async cancel(id: string, clientId: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    demand.status = 'cancelled';
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(saved, images, tagIds, { userId: clientId, professionalId: null });
  }

  private invitationToResponse(inv: DemandInvitation): DemandInvitationResponse {
    return {
      id: inv.id,
      demandId: inv.demand_id,
      professionalId: inv.professional_id,
      status: inv.status,
    };
  }

  async invite(
    demandId: string,
    clientId: string,
    professionalId: string,
  ): Promise<DemandInvitationResponse> {
    const demand = await this.deps.demands.findOne({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda nao aceita convites');
    const existing = await this.deps.invitations.findOne({
      where: { demand_id: demandId, professional_id: professionalId },
    });
    if (existing) throw new ConflictError('Profissional ja convidado');
    const saved = await this.deps.invitations.save(
      this.deps.invitations.create({
        demand_id: demandId,
        professional_id: professionalId,
        status: 'pending',
        invited_at: new Date(),
      }),
    );
    return this.invitationToResponse(saved);
  }

  async respondInvitation(
    invitationId: string,
    professionalId: string,
    accept: boolean,
  ): Promise<DemandInvitationResponse> {
    const invitation = await this.deps.invitations.findOne({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundError('Convite nao encontrado');
    if (invitation.professional_id !== professionalId) throw new ForbiddenError('Convite de outro profissional');
    if (invitation.status !== 'pending') throw new ForbiddenError('Convite ja respondido');
    invitation.status = accept ? 'accepted' : 'declined';
    invitation.responded_at = new Date();
    const saved = await this.deps.invitations.save(invitation);
    return this.invitationToResponse(saved);
  }

  async listInvitations(demandId: string): Promise<DemandInvitationResponse[]> {
    const rows = await this.deps.invitations.find({ where: { demand_id: demandId } });
    return rows.map((invitation) => this.invitationToResponse(invitation));
  }
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
cd backend
npx vitest run src/modules/demand/demand.service.test.ts
```

Expected: PASS em todos os testes (existentes + os 4 novos de visibilidade).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/demand/demand.service.ts backend/src/modules/demand/demand.service.test.ts
git commit -m "feat: DemandService revela endereco completo so pra dono ou contrato aceito"
```

---

### Task 2.3: DI (`demand.routes.ts`) e controller actor-aware

**Files:**
- Modify: `backend/src/modules/demand/demand.routes.ts`
- Modify: `backend/src/modules/demand/demand.controller.ts`
- Test: `backend/src/modules/demand/demand.routes.test.ts`

**Interfaces:**
- Consumes: `DemandActor` de `./demand.service.js` (Task 2.2).
- Produces: `DemandController.list`/`getById` resolvendo o ator antes de chamar o service — nada consumido por fases posteriores (é o topo da cadeia HTTP).

- [ ] **Step 1: Injetar `Repository<Contract>` em `demand.routes.ts`**

Editar `backend/src/modules/demand/demand.routes.ts`: adicionar o import da entidade `Contract` e passar o repositório no construtor do `DemandService`.

```ts
import { Contract } from '../../infra/database/entities/contract.entity.js';
```

```ts
const service = new DemandService({
  demands: app.dataSource.getRepository(ServiceDemand),
  images: app.dataSource.getRepository(DemandImage),
  tags: app.dataSource.getRepository(DemandTag),
  invitations: app.dataSource.getRepository(DemandInvitation),
  contracts: app.dataSource.getRepository(Contract),
});
```

- [ ] **Step 2: Atualizar `demand.controller.ts` para resolver o ator**

Substituir o conteúdo inteiro de `backend/src/modules/demand/demand.controller.ts` por:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from 'typeorm';
import type { DemandService, DemandActor } from './demand.service.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { CreateDemandInput, UpdateDemandInput, DemandListQuery, InviteProfessionalInput } from './demand.schemas.js';

export class DemandController {
  constructor(
    private readonly service: DemandService,
    private readonly professionalProfiles: Repository<ProfessionalProfile>,
  ) {}

  private async resolveActor(userId: string): Promise<DemandActor> {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: userId } });
    return { userId, professionalId: profile ? profile.id : null };
  }

  create = async (req: FastifyRequest<{ Body: CreateDemandInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.create(req.user!.id, req.body));

  list = async (req: FastifyRequest<{ Querystring: DemandListQuery }>, reply: FastifyReply) => {
    const actor = await this.resolveActor(req.user!.id);
    const { items, total } = await this.service.list(req.query, actor);
    return reply.send({ items, page: req.query.page, limit: req.query.limit, total });
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const actor = await this.resolveActor(req.user!.id);
    return reply.send(await this.service.getById(req.params.id, actor));
  };

  update = async (req: FastifyRequest<{ Params: { id: string }; Body: UpdateDemandInput }>, reply: FastifyReply) =>
    reply.send(await this.service.update(req.params.id, req.user!.id, req.body));

  cancel = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.cancel(req.params.id, req.user!.id));

  invite = async (req: FastifyRequest<{ Params: { id: string }; Body: InviteProfessionalInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.invite(req.params.id, req.user!.id, req.body.professionalId));

  listInvitations = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const demand = await this.service.getById(req.params.id);
    if (demand.clientId !== req.user!.id) {
      throw new ForbiddenError('Nao e o autor da demanda');
    }
    return reply.send(await this.service.listInvitations(req.params.id));
  };

  respondInvitation = async (req: FastifyRequest<{ Params: { id: string }; Body: { accept: boolean } }>, reply: FastifyReply) => {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: req.user!.id } });
    if (!profile) {
      throw new NotFoundError('Perfil profissional nao encontrado');
    }
    return reply.send(await this.service.respondInvitation(req.params.id, profile.id, req.body.accept));
  };
}
```

- [ ] **Step 3: Ajustar o payload de teste de integração existente**

Em `backend/src/modules/demand/demand.routes.test.ts`, localizar a função/objeto que monta o payload de criação de demanda (referenciado como `demandPayload(categoryId)` no teste `'cliente publica e le demanda; budget volta number'`) e adicionar os campos de endereço obrigatórios, removendo `addressId`:

```ts
function demandPayload(categoryId: string) {
  return {
    categoryId,
    title: 'Instalacao eletrica completa',
    description: 'Preciso instalar 4 tomadas na sala e cozinha, com fiação nova',
    budgetMin: 100,
    budgetMax: 500,
    street: 'Rua das Flores',
    number: '123',
    complement: null,
    district: 'Centro',
    city: 'Porto Alegre',
    state: 'RS',
    zipCode: '90000-000',
    tagIds: [],
    images: [],
  };
}
```

Adicionar também um teste novo no mesmo arquivo confirmando a regra de visibilidade via HTTP real:

```ts
it('profissional sem contrato ve cidade/UF mas nao rua/numero', async () => {
  const category = await app.inject({ method: 'POST', url: '/api/categories', headers: adminHeaders, payload: { name: 'Eletrica', slug: 'eletrica-vis' } });
  const categoryId = category.json().id;

  const client = await registerAndLogin(app, 'client');
  const create = await app.inject({
    method: 'POST',
    url: '/api/demands',
    headers: { authorization: `Bearer ${client.token}` },
    payload: demandPayload(categoryId),
  });
  const demandId = create.json().id;

  const professional = await registerAndLogin(app, 'professional');
  const view = await app.inject({
    method: 'GET',
    url: `/api/demands/${demandId}`,
    headers: { authorization: `Bearer ${professional.token}` },
  });

  expect(view.json().city).toBe('Porto Alegre');
  expect(view.json().state).toBe('RS');
  expect(view.json().street).toBeNull();
});
```

Se o arquivo já tiver um helper `registerAndLogin`/`adminHeaders` com outro nome, usar o helper existente no arquivo em vez de inventar um novo — abrir o arquivo antes deste passo pra confirmar os nomes reais.

- [ ] **Step 4: Rodar os testes de integração**

```bash
cd backend
npx vitest run src/modules/demand/demand.routes.test.ts
```

Expected: PASS. Requer banco de teste de pé (mesmo processo já usado pelos outros testes de `.routes.test.ts` do projeto).

- [ ] **Step 5: Rodar a suíte inteira do backend**

```bash
cd backend
npm test
```

Expected: PASS em tudo (nenhum outro módulo referenciava `addressId`/`address_id` fora de `demand`, confirmado por grep na Fase 0 de exploração).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/demand/demand.routes.ts backend/src/modules/demand/demand.controller.ts backend/src/modules/demand/demand.routes.test.ts
git commit -m "feat: demand controller resolve ator e injeta Contract repo"
```
