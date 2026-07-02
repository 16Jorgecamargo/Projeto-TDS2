# Fase 8 — Professional / Catalog / Availability / Portfolio / Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar a vitrine de oferta do marketplace — perfil profissional (dados, documentos, experiências, educação, certificações), áreas de atendimento, disponibilidade (slots + exceções), portfólio, catálogo de categorias/tags e busca pública de profissionais — mais as features frontend `professional` e `landing`.

**Architecture:** Cinco módulos backend Fastify (`catalog`, `professional`, `availability`, `portfolio`, `search`) seguindo o padrão routes/controller/service/schemas + testes unit (mocka repos) e integração (`buildTestApp()` com banco real). Cada módulo consome os contratos fundacionais das fases 3-5 e as entidades TypeORM da fase 6. O módulo `catalog` vem primeiro pois `professional`/`portfolio`/`search` referenciam categorias e tags. Frontend em React 19/Vite com TanStack Query + react-hook-form/Zod, features `professional` (área do profissional + perfil público) e `landing` (home pública + busca).

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, Zod + fastify-type-provider-zod + zod-openapi, Vitest; React 19 + Vite 6, TanStack Query 5, react-hook-form + Zod, axios, Tailwind 3, Vitest + Testing Library.

## Global Constraints

Toda task herda estas regras verbatim:

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. Docs de plano e mensagens de commit em pt-BR.
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M (`professional_service_areas(professional_id, city, state)`, `professional_categories(professional_id, category_id)`, `professional_tags(professional_id, tag_id)`).
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
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
import { requireRole } from '@/shared/middlewares/require-role';
import { createUser, createProfessional } from '@/test/factories';
```

- `app.authenticate` (preHandler) popula `request.user = { id: string; role: 'client' | 'professional' | 'admin' }`.
- `requireRole(...roles)` preHandler factory.
- `paginatedResponse(itemSchema)` → `z.object({ items: z.array(itemSchema), page, limit, total })`.
- Data source TypeORM em `@/infra/database/data-source` exporta `AppDataSource`. Services recebem repositórios via `AppDataSource.getRepository(Entity)`.
- Frontend: `http` (axios, baseURL `/api`) em `@/lib/http` (fase 3); `ProtectedRoute` em `@/router/ProtectedRoute` (checa role); `useAuthStore` em `@/stores/auth`.

## Entidades consumidas (fase 6)

Definidas na fase 6; consumir sem redefinir. **Colunas em snake_case** (a API expõe camelCase; mapear no `toResponse`). DECIMAL chega como **string**.

```ts
// ProfessionalProfile  @/infra/database/entities/professional-profile.entity
{ id, user_id (unique), headline, bio: string | null, years_experience: number | null,
  hourly_rate: string | null, service_radius_km: number | null,
  rating_average: string, rating_count: number, is_available: boolean,
  verified_at: Date | null, created_at: Date, updated_at: Date }
// ProfessionalDocument  professional-document.entity
{ id, professional_id, type: 'rg'|'cpf'|'cnpj'|'proof_of_address'|'certificate',
  file_url, status: 'pending'|'approved'|'rejected', reviewed_at: Date | null, created_at }
// ProfessionalExperience  professional-experience.entity
{ id, professional_id, title, company: string | null, description: string | null,
  start_date: string, end_date: string | null, is_current: boolean, created_at }
// ProfessionalEducation  professional-education.entity
{ id, professional_id, institution, degree, field_of_study: string | null,
  start_date: string | null, end_date: string | null, created_at }
// ProfessionalCertification  professional-certification.entity
{ id, professional_id, name, issuer, issued_at: string | null,
  expires_at: string | null, credential_url: string | null, created_at }
// ProfessionalServiceArea  professional-service-area.entity  UNIQUE(professional_id, city, state)
{ id, professional_id, city, state (char 2), radius_km: number | null, created_at }
// AvailabilitySlot  availability-slot.entity
{ id, professional_id, weekday: number (0-6), start_time: string, end_time: string, created_at }
// AvailabilityException  availability-exception.entity
{ id, professional_id, date: string, is_available: boolean,
  start_time: string | null, end_time: string | null, reason: string | null, created_at }
// PortfolioItem  portfolio-item.entity
{ id, professional_id, category_id: string | null, title, description: string | null,
  completed_at: string | null, created_at, updated_at }
// PortfolioImage  portfolio-image.entity
{ id, portfolio_item_id, image_url, position: number, created_at }
// ServiceCategory  service-category.entity
{ id, parent_id: string | null, name, slug (unique), icon: string | null,
  description: string | null, is_active: boolean, created_at, updated_at }
// ServiceTag  service-tag.entity
{ id, name, slug (unique), created_at }
// ProfessionalCategory  professional-category.entity  UNIQUE(professional_id, category_id)
{ id, professional_id, category_id, created_at }
// ProfessionalTag  professional-tag.entity  UNIQUE(professional_id, tag_id)
{ id, professional_id, tag_id, created_at }
```

## File Structure

```
backend/src/modules/catalog/
  catalog.schemas.ts        Zod categorias/tags (describe+openapi)
  catalog.service.ts        árvore de categorias, tags (repos ServiceCategory/ServiceTag)
  catalog.controller.ts     handlers finos
  catalog.routes.ts         registro rotas + schema
  catalog.service.test.ts   unit (mocka repos)
  catalog.routes.test.ts    integração buildTestApp
backend/src/modules/professional/  (repos ProfessionalProfile + document/experience/education/certification/service-area + professional-category/tag + ServiceCategory/ServiceTag)
backend/src/modules/availability/  (repos AvailabilitySlot/AvailabilityException + ProfessionalProfile)
backend/src/modules/portfolio/     (repos PortfolioItem/PortfolioImage + ProfessionalProfile)
backend/src/modules/search/        (repos ProfessionalProfile/ProfessionalCategory/ProfessionalServiceArea + ServiceCategory)

frontend/src/features/professional/
  api.ts  queries.ts  schemas.ts
  components/ProfileForm.tsx  components/PortfolioManager.tsx  components/AvailabilityManager.tsx
  components/ProfessionalCard.tsx  components/ServiceAreaManager.tsx
  pages/ProfessionalDashboardPage.tsx  pages/PublicProfilePage.tsx
  professional.test.tsx
frontend/src/features/landing/
  api.ts  queries.ts  schemas.ts
  components/SearchBar.tsx  components/CategoryGrid.tsx  components/ProfessionalResults.tsx
  pages/LandingPage.tsx  pages/SearchPage.tsx
  landing.test.tsx
```

Registro dos módulos: cada `*.routes.ts` exporta `async function <name>Routes(app: FastifyInstance)`; `buildApp` (fase 3) os registra. As rotas já declaram o path completo com prefixo `/api`.

---

## Task 1: Módulo `catalog` — schemas

**Files:**
- Create: `backend/src/modules/catalog/catalog.schemas.ts`

**Interfaces:**
- Consumes: nada externo além de `zod`.
- Produces: `createCategorySchema`, `updateCategorySchema`, `categoryResponseSchema`, `categoryTreeNodeSchema`, `createTagSchema`, `tagResponseSchema`, e tipos inferidos `CreateCategoryInput`, `UpdateCategoryInput`, `CategoryResponse`, `CategoryTreeNode`, `CreateTagInput`, `TagResponse`.

- [ ] **Step 1: Escrever os schemas**

Create `backend/src/modules/catalog/catalog.schemas.ts`:

```ts
import { z } from 'zod';

export const createCategorySchema = z.object({
  parentId: z.string().uuid().nullable().describe('Categoria pai (null para raiz)').openapi({ example: null }),
  name: z.string().min(2).max(128).describe('Nome da categoria').openapi({ example: 'Elétrica' }),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/).describe('Slug único').openapi({ example: 'eletrica' }),
  icon: z.string().max(128).nullable().describe('Ícone (nome/URL)').openapi({ example: 'bolt' }),
  description: z.string().max(2000).nullable().describe('Descrição').openapi({ example: 'Serviços elétricos residenciais' }),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(128).optional().describe('Nome da categoria').openapi({ example: 'Elétrica' }),
  icon: z.string().max(128).nullable().optional().describe('Ícone').openapi({ example: 'bolt' }),
  description: z.string().max(2000).nullable().optional().describe('Descrição').openapi({ example: 'Atualizado' }),
  isActive: z.boolean().optional().describe('Categoria ativa').openapi({ example: true }),
});

export const categoryResponseSchema = z.object({
  id: z.string().uuid().describe('ID da categoria').openapi({ example: '9f1c...' }),
  parentId: z.string().uuid().nullable().describe('Categoria pai').openapi({ example: null }),
  name: z.string().describe('Nome').openapi({ example: 'Elétrica' }),
  slug: z.string().describe('Slug').openapi({ example: 'eletrica' }),
  icon: z.string().nullable().describe('Ícone').openapi({ example: 'bolt' }),
  description: z.string().nullable().describe('Descrição').openapi({ example: 'Serviços elétricos' }),
  isActive: z.boolean().describe('Ativa').openapi({ example: true }),
});

export type CategoryTreeNode = z.infer<typeof categoryResponseSchema> & {
  children: CategoryTreeNode[];
};

export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = categoryResponseSchema
  .extend({
    children: z.lazy(() => z.array(categoryTreeNodeSchema)),
  })
  .describe('Nó da árvore de categorias') as z.ZodType<CategoryTreeNode>;

export const createTagSchema = z.object({
  name: z.string().min(2).max(128).describe('Nome da tag').openapi({ example: 'Instalação' }),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/).describe('Slug único').openapi({ example: 'instalacao' }),
});

export const tagResponseSchema = z.object({
  id: z.string().uuid().describe('ID da tag').openapi({ example: '7c4b...' }),
  name: z.string().describe('Nome').openapi({ example: 'Instalação' }),
  slug: z.string().describe('Slug').openapi({ example: 'instalacao' }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/catalog/catalog.schemas.ts
git commit -m "feat(catalog): adiciona schemas zod de categorias e tags"
```

---

## Task 2: Módulo `catalog` — service

**Files:**
- Create: `backend/src/modules/catalog/catalog.service.ts`
- Test: `backend/src/modules/catalog/catalog.service.test.ts`

**Interfaces:**
- Consumes: entidades `ServiceCategory`, `ServiceTag`; `ConflictError`, `NotFoundError`.
- Produces:
  ```ts
  class CatalogService {
    constructor(deps: { categories: Repository<ServiceCategory>; tags: Repository<ServiceTag>; })
    createCategory(input: CreateCategoryInput): Promise<CategoryResponse>
    updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryResponse>
    listCategoryTree(): Promise<CategoryTreeNode[]>
    listCategories(): Promise<CategoryResponse[]>
    createTag(input: CreateTagInput): Promise<TagResponse>
    listTags(): Promise<TagResponse[]>
  }
  ```

- [ ] **Step 1: Escrever o teste falho**

Create `backend/src/modules/catalog/catalog.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from './catalog.service';
import { ConflictError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'gen', created_at: new Date('2026-07-01T12:00:00Z'), updated_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
  } as any;
}

describe('CatalogService', () => {
  let categories: any, tags: any, service: CatalogService;
  beforeEach(() => {
    categories = mockRepo();
    tags = mockRepo();
    service = new CatalogService({ categories, tags });
  });

  it('cria categoria e rejeita slug duplicado', async () => {
    categories.findOne.mockResolvedValueOnce(null);
    categories.save.mockResolvedValueOnce({
      id: 'cat-1', parent_id: null, name: 'Elétrica', slug: 'eletrica',
      icon: 'bolt', description: null, is_active: true,
    });
    const created = await service.createCategory({
      parentId: null, name: 'Elétrica', slug: 'eletrica', icon: 'bolt', description: null,
    });
    expect(created.slug).toBe('eletrica');
    expect(created.isActive).toBe(true);

    categories.findOne.mockResolvedValueOnce({ id: 'cat-1' });
    await expect(
      service.createCategory({ parentId: null, name: 'X', slug: 'eletrica', icon: null, description: null }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('monta árvore aninhando filhos sob o pai', async () => {
    categories.find.mockResolvedValueOnce([
      { id: 'root', parent_id: null, name: 'Casa', slug: 'casa', icon: null, description: null, is_active: true },
      { id: 'child', parent_id: 'root', name: 'Elétrica', slug: 'eletrica', icon: null, description: null, is_active: true },
    ]);
    const tree = await service.listCategoryTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect(tree[0].children[0].id).toBe('child');
  });

  it('cria tag e lista tags', async () => {
    tags.findOne.mockResolvedValueOnce(null);
    tags.save.mockResolvedValueOnce({ id: 'tag-1', name: 'Instalação', slug: 'instalacao' });
    const created = await service.createTag({ name: 'Instalação', slug: 'instalacao' });
    expect(created.id).toBe('tag-1');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/catalog/catalog.service.test.ts`
Expected: FAIL — `Cannot find module './catalog.service'`.

- [ ] **Step 3: Implementar o service**

Create `backend/src/modules/catalog/catalog.service.ts`:

```ts
import { Repository } from 'typeorm';
import { ServiceCategory } from '@/infra/database/entities/service-category.entity';
import { ServiceTag } from '@/infra/database/entities/service-tag.entity';
import { ConflictError, NotFoundError } from '@/shared/errors';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResponse,
  CategoryTreeNode,
  CreateTagInput,
  TagResponse,
} from './catalog.schemas';

interface CatalogServiceDeps {
  categories: Repository<ServiceCategory>;
  tags: Repository<ServiceTag>;
}

export class CatalogService {
  constructor(private readonly deps: CatalogServiceDeps) {}

  private toCategory(category: ServiceCategory): CategoryResponse {
    return {
      id: category.id,
      parentId: category.parent_id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      isActive: category.is_active,
    };
  }

  private toTag(tag: ServiceTag): TagResponse {
    return { id: tag.id, name: tag.name, slug: tag.slug };
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryResponse> {
    const existing = await this.deps.categories.findOne({ where: { slug: input.slug } });
    if (existing) throw new ConflictError('Slug de categoria já em uso');
    if (input.parentId) {
      const parent = await this.deps.categories.findOne({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundError('Categoria pai não encontrada');
    }
    const saved = await this.deps.categories.save(
      this.deps.categories.create({
        parent_id: input.parentId,
        name: input.name,
        slug: input.slug,
        icon: input.icon,
        description: input.description,
        is_active: true,
      }),
    );
    return this.toCategory(saved);
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
    const category = await this.deps.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundError('Categoria não encontrada');
    if (input.name !== undefined) category.name = input.name;
    if (input.icon !== undefined) category.icon = input.icon;
    if (input.description !== undefined) category.description = input.description;
    if (input.isActive !== undefined) category.is_active = input.isActive;
    const saved = await this.deps.categories.save(category);
    return this.toCategory(saved);
  }

  async listCategories(): Promise<CategoryResponse[]> {
    const rows = await this.deps.categories.find({ order: { name: 'ASC' } });
    return rows.map((c) => this.toCategory(c));
  }

  async listCategoryTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.deps.categories.find({ order: { name: 'ASC' } });
    const nodes = new Map<string, CategoryTreeNode>();
    rows.forEach((c) => nodes.set(c.id, { ...this.toCategory(c), children: [] }));
    const roots: CategoryTreeNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async createTag(input: CreateTagInput): Promise<TagResponse> {
    const existing = await this.deps.tags.findOne({ where: { slug: input.slug } });
    if (existing) throw new ConflictError('Slug de tag já em uso');
    const saved = await this.deps.tags.save(
      this.deps.tags.create({ name: input.name, slug: input.slug }),
    );
    return this.toTag(saved);
  }

  async listTags(): Promise<TagResponse[]> {
    const rows = await this.deps.tags.find({ order: { name: 'ASC' } });
    return rows.map((t) => this.toTag(t));
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/catalog/catalog.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/catalog/catalog.service.ts backend/src/modules/catalog/catalog.service.test.ts
git commit -m "feat(catalog): implementa service de categorias e tags"
```

---

## Task 3: Módulo `catalog` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/catalog/catalog.controller.ts`
- Create: `backend/src/modules/catalog/catalog.routes.ts`
- Test: `backend/src/modules/catalog/catalog.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `catalogRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`, `requireRole('admin')`; `buildTestApp`, `createUser`.
- Produces: `catalogRoutes(app)`; rotas públicas `GET /api/categories`, `GET /api/categories/tree`, `GET /api/tags`; rotas admin `POST /api/categories`, `PATCH /api/categories/:id`, `POST /api/tags`.

- [ ] **Step 1: Teste de integração falho**

Create `backend/src/modules/catalog/catalog.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser } from '@/test/factories';

describe('catalog routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('admin cria categoria; público lê árvore', async () => {
    const admin = await createUser(app, { role: 'admin' });
    const slug = `eletrica-${Date.now()}`;
    const create = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { parentId: null, name: 'Elétrica', slug, icon: 'bolt', description: null },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().slug).toBe(slug);

    const tree = await app.inject({ method: 'GET', url: '/api/categories/tree' });
    expect(tree.statusCode).toBe(200);
    expect(Array.isArray(tree.json())).toBe(true);
  });

  it('não-admin não cria categoria', async () => {
    const client = await createUser(app, { role: 'client' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: { authorization: `Bearer ${client.token}` },
      payload: { parentId: null, name: 'X', slug: `x-${Date.now()}`, icon: null, description: null },
    });
    expect(res.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/catalog/catalog.routes.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implementar controller**

Create `backend/src/modules/catalog/catalog.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { ServiceCategory } from '@/infra/database/entities/service-category.entity';
import { ServiceTag } from '@/infra/database/entities/service-tag.entity';
import { CatalogService } from './catalog.service';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateTagInput,
} from './catalog.schemas';

function service(): CatalogService {
  return new CatalogService({
    categories: AppDataSource.getRepository(ServiceCategory),
    tags: AppDataSource.getRepository(ServiceTag),
  });
}

export async function createCategory(
  req: FastifyRequest<{ Body: CreateCategoryInput }>,
  reply: FastifyReply,
) {
  return reply.status(201).send(await service().createCategory(req.body));
}

export async function updateCategory(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryInput }>,
  reply: FastifyReply,
) {
  return reply.send(await service().updateCategory(req.params.id, req.body));
}

export async function listCategories(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service().listCategories());
}

export async function listCategoryTree(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service().listCategoryTree());
}

export async function createTag(
  req: FastifyRequest<{ Body: CreateTagInput }>,
  reply: FastifyReply,
) {
  return reply.status(201).send(await service().createTag(req.body));
}

export async function listTags(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service().listTags());
}
```

- [ ] **Step 4: Implementar routes**

Create `backend/src/modules/catalog/catalog.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryResponseSchema,
  categoryTreeNodeSchema,
  createTagSchema,
  tagResponseSchema,
} from './catalog.schemas';
import {
  createCategory,
  updateCategory,
  listCategories,
  listCategoryTree,
  createTag,
  listTags,
} from './catalog.controller';

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/api/categories', {
    schema: { tags: ['catalog'], summary: 'Listar categorias', response: { 200: z.array(categoryResponseSchema) } },
  }, listCategories);

  app.get('/api/categories/tree', {
    schema: { tags: ['catalog'], summary: 'Árvore de categorias', response: { 200: z.array(categoryTreeNodeSchema) } },
  }, listCategoryTree);

  app.post('/api/categories', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['catalog'], summary: 'Criar categoria', body: createCategorySchema, response: { 201: categoryResponseSchema } },
  }, createCategory);

  app.patch('/api/categories/:id', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['catalog'], summary: 'Editar categoria', params: idParamSchema, body: updateCategorySchema, response: { 200: categoryResponseSchema } },
  }, updateCategory);

  app.get('/api/tags', {
    schema: { tags: ['catalog'], summary: 'Listar tags', response: { 200: z.array(tagResponseSchema) } },
  }, listTags);

  app.post('/api/tags', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['catalog'], summary: 'Criar tag', body: createTagSchema, response: { 201: tagResponseSchema } },
  }, createTag);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

Em `backend/src/app.ts`, no bloco de registro de módulos:

```ts
import { catalogRoutes } from '@/modules/catalog/catalog.routes';
await app.register(catalogRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/catalog/catalog.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/catalog/catalog.controller.ts backend/src/modules/catalog/catalog.routes.ts backend/src/modules/catalog/catalog.routes.test.ts backend/src/app.ts
git commit -m "feat(catalog): expõe rotas de categorias e tags"
```

---

## Task 4: Módulo `professional` — schemas

**Files:**
- Create: `backend/src/modules/professional/professional.schemas.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces: `upsertProfileSchema`, `profileResponseSchema`, `publicProfileSchema`, `documentSchema`, `documentResponseSchema`, `experienceSchema`, `experienceResponseSchema`, `educationSchema`, `educationResponseSchema`, `certificationSchema`, `certificationResponseSchema`, `serviceAreaSchema`, `serviceAreaResponseSchema`, `setAssociationsSchema`; tipos inferidos correspondentes.

- [ ] **Step 1: Escrever os schemas**

Create `backend/src/modules/professional/professional.schemas.ts`:

```ts
import { z } from 'zod';

export const upsertProfileSchema = z.object({
  headline: z.string().min(5).max(255).describe('Título profissional').openapi({ example: 'Eletricista residencial' }),
  bio: z.string().max(4000).nullable().describe('Biografia').openapi({ example: 'Atuo há 10 anos com instalações.' }),
  yearsExperience: z.number().int().min(0).max(80).nullable().describe('Anos de experiência').openapi({ example: 10 }),
  hourlyRate: z.number().nonnegative().nullable().describe('Valor por hora (R$)').openapi({ example: 120 }),
  serviceRadiusKm: z.number().int().min(0).max(1000).nullable().describe('Raio de atendimento (km)').openapi({ example: 30 }),
});

export const profileResponseSchema = z.object({
  id: z.string().uuid().describe('ID do perfil').openapi({ example: 'pro1...' }),
  userId: z.string().uuid().describe('Usuário dono').openapi({ example: 'u1...' }),
  headline: z.string().describe('Título').openapi({ example: 'Eletricista residencial' }),
  bio: z.string().nullable().describe('Biografia').openapi({ example: 'Atuo há 10 anos.' }),
  yearsExperience: z.number().int().nullable().describe('Anos de experiência').openapi({ example: 10 }),
  hourlyRate: z.number().nullable().describe('Valor por hora').openapi({ example: 120 }),
  serviceRadiusKm: z.number().int().nullable().describe('Raio (km)').openapi({ example: 30 }),
  ratingAverage: z.number().describe('Média de avaliações').openapi({ example: 4.8 }),
  ratingCount: z.number().int().describe('Total de avaliações').openapi({ example: 42 }),
  isAvailable: z.boolean().describe('Disponível').openapi({ example: true }),
  verifiedAt: z.string().datetime().nullable().describe('Verificado em').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const documentSchema = z.object({
  type: z.enum(['rg', 'cpf', 'cnpj', 'proof_of_address', 'certificate']).describe('Tipo de documento').openapi({ example: 'rg' }),
  fileUrl: z.string().url().describe('URL do arquivo').openapi({ example: 'https://cdn.app/doc.pdf' }),
});

export const documentResponseSchema = documentSchema.extend({
  id: z.string().uuid().describe('ID do documento').openapi({ example: 'doc1...' }),
  status: z.enum(['pending', 'approved', 'rejected']).describe('Status da análise').openapi({ example: 'pending' }),
  reviewedAt: z.string().datetime().nullable().describe('Analisado em').openapi({ example: null }),
});

export const experienceSchema = z.object({
  title: z.string().min(2).max(255).describe('Cargo/função').openapi({ example: 'Eletricista' }),
  company: z.string().max(255).nullable().describe('Empresa').openapi({ example: 'Elétrica ABC' }),
  description: z.string().max(2000).nullable().describe('Descrição').openapi({ example: 'Manutenção predial' }),
  startDate: z.string().date().describe('Início (YYYY-MM-DD)').openapi({ example: '2015-01-01' }),
  endDate: z.string().date().nullable().describe('Fim (YYYY-MM-DD)').openapi({ example: null }),
  isCurrent: z.boolean().describe('Emprego atual').openapi({ example: true }),
});

export const experienceResponseSchema = experienceSchema.extend({
  id: z.string().uuid().describe('ID da experiência').openapi({ example: 'exp1...' }),
});

export const educationSchema = z.object({
  institution: z.string().min(2).max(255).describe('Instituição').openapi({ example: 'SENAI' }),
  degree: z.string().min(2).max(255).describe('Curso/grau').openapi({ example: 'Técnico em Eletrotécnica' }),
  fieldOfStudy: z.string().max(255).nullable().describe('Área de estudo').openapi({ example: 'Eletrotécnica' }),
  startDate: z.string().date().nullable().describe('Início').openapi({ example: '2012-02-01' }),
  endDate: z.string().date().nullable().describe('Fim').openapi({ example: '2014-12-01' }),
});

export const educationResponseSchema = educationSchema.extend({
  id: z.string().uuid().describe('ID da formação').openapi({ example: 'edu1...' }),
});

export const certificationSchema = z.object({
  name: z.string().min(2).max(255).describe('Nome do certificado').openapi({ example: 'NR-10' }),
  issuer: z.string().min(2).max(255).describe('Emissor').openapi({ example: 'SENAI' }),
  issuedAt: z.string().date().nullable().describe('Emitido em').openapi({ example: '2020-06-01' }),
  expiresAt: z.string().date().nullable().describe('Expira em').openapi({ example: '2025-06-01' }),
  credentialUrl: z.string().url().nullable().describe('URL da credencial').openapi({ example: null }),
});

export const certificationResponseSchema = certificationSchema.extend({
  id: z.string().uuid().describe('ID da certificação').openapi({ example: 'cert1...' }),
});

export const serviceAreaSchema = z.object({
  city: z.string().min(2).max(128).describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).regex(/^[A-Z]{2}$/).describe('UF').openapi({ example: 'RS' }),
  radiusKm: z.number().int().min(0).max(1000).nullable().describe('Raio (km)').openapi({ example: 20 }),
});

export const serviceAreaResponseSchema = serviceAreaSchema.extend({
  id: z.string().uuid().describe('ID da área').openapi({ example: 'area1...' }),
});

export const setAssociationsSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).describe('IDs de categorias ou tags').openapi({ example: [] }),
});

export const publicProfileSchema = profileResponseSchema.extend({
  categories: z.array(z.object({
    id: z.string().uuid().describe('ID').openapi({ example: 'cat1...' }),
    name: z.string().describe('Nome').openapi({ example: 'Elétrica' }),
    slug: z.string().describe('Slug').openapi({ example: 'eletrica' }),
  })).describe('Categorias atendidas').openapi({ example: [] }),
  experiences: z.array(experienceResponseSchema).describe('Experiências').openapi({ example: [] }),
  education: z.array(educationResponseSchema).describe('Formações').openapi({ example: [] }),
  certifications: z.array(certificationResponseSchema).describe('Certificações').openapi({ example: [] }),
  serviceAreas: z.array(serviceAreaResponseSchema).describe('Áreas de atendimento').openapi({ example: [] }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type PublicProfileResponse = z.infer<typeof publicProfileSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type ExperienceResponse = z.infer<typeof experienceResponseSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type EducationResponse = z.infer<typeof educationResponseSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type CertificationResponse = z.infer<typeof certificationResponseSchema>;
export type ServiceAreaInput = z.infer<typeof serviceAreaSchema>;
export type ServiceAreaResponse = z.infer<typeof serviceAreaResponseSchema>;
export type SetAssociationsInput = z.infer<typeof setAssociationsSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/professional/professional.schemas.ts
git commit -m "feat(professional): adiciona schemas zod do perfil profissional"
```

---

## Task 5: Módulo `professional` — service de perfil (upsert/get) + associações

**Files:**
- Create: `backend/src/modules/professional/professional.service.ts`
- Test: `backend/src/modules/professional/professional.service.test.ts`

**Interfaces:**
- Consumes: entidades `ProfessionalProfile`, `ProfessionalCategory`, `ProfessionalTag`, `ServiceCategory`, `ServiceTag`; `NotFoundError`, `ConflictError`.
- Produces:
  ```ts
  interface ProfessionalServiceDeps {
    profiles: Repository<ProfessionalProfile>;
    documents: Repository<ProfessionalDocument>;
    experiences: Repository<ProfessionalExperience>;
    education: Repository<ProfessionalEducation>;
    certifications: Repository<ProfessionalCertification>;
    serviceAreas: Repository<ProfessionalServiceArea>;
    categories: Repository<ProfessionalCategory>;
    tags: Repository<ProfessionalTag>;
    serviceCategories: Repository<ServiceCategory>;
    serviceTags: Repository<ServiceTag>;
  }
  class ProfessionalService {
    constructor(deps: ProfessionalServiceDeps)
    upsertProfile(userId: string, input: UpsertProfileInput): Promise<ProfileResponse>
    getMyProfile(userId: string): Promise<ProfileResponse>
    getPublicProfile(profileId: string): Promise<PublicProfileResponse>
    setCategories(userId: string, ids: string[]): Promise<void>
    setTags(userId: string, ids: string[]): Promise<void>
    resolveProfileId(userId: string): Promise<string>  // helper reutilizado pelos sub-recursos
  }
  ```
- `resolveProfileId` lança `NotFoundError` se o usuário não tem perfil (sub-recursos exigem perfil existente).

- [ ] **Step 1: Escrever o teste falho**

Create `backend/src/modules/professional/professional.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfessionalService } from './professional.service';
import { NotFoundError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'gen', created_at: new Date('2026-07-01T12:00:00Z'), updated_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
    delete: vi.fn(async () => ({ affected: 0 })),
  } as any;
}

function makeService() {
  const deps = {
    profiles: mockRepo(), documents: mockRepo(), experiences: mockRepo(),
    education: mockRepo(), certifications: mockRepo(), serviceAreas: mockRepo(),
    categories: mockRepo(), tags: mockRepo(), serviceCategories: mockRepo(), serviceTags: mockRepo(),
  };
  return { deps, service: new ProfessionalService(deps) };
}

describe('ProfessionalService.upsertProfile', () => {
  it('cria perfil quando ausente e mapeia DECIMAL para number', async () => {
    const { deps, service } = makeService();
    deps.profiles.findOne.mockResolvedValueOnce(null);
    deps.profiles.save.mockResolvedValueOnce({
      id: 'pro-1', user_id: 'user-1', headline: 'Eletricista', bio: null,
      years_experience: 10, hourly_rate: '120.00', service_radius_km: 30,
      rating_average: '4.80', rating_count: 42, is_available: true,
      verified_at: null, created_at: new Date('2026-07-01T12:00:00Z'),
    });
    const result = await service.upsertProfile('user-1', {
      headline: 'Eletricista', bio: null, yearsExperience: 10, hourlyRate: 120, serviceRadiusKm: 30,
    });
    expect(result.hourlyRate).toBe(120);
    expect(result.ratingAverage).toBe(4.8);
    expect(typeof result.hourlyRate).toBe('number');
  });

  it('atualiza perfil existente', async () => {
    const { deps, service } = makeService();
    deps.profiles.findOne.mockResolvedValueOnce({
      id: 'pro-1', user_id: 'user-1', headline: 'Antigo', bio: null, years_experience: null,
      hourly_rate: null, service_radius_km: null, rating_average: '0.00', rating_count: 0,
      is_available: true, verified_at: null, created_at: new Date('2026-07-01T12:00:00Z'),
    });
    deps.profiles.save.mockImplementationOnce(async (x: any) => x);
    const result = await service.upsertProfile('user-1', {
      headline: 'Novo', bio: 'bio', yearsExperience: 5, hourlyRate: null, serviceRadiusKm: null,
    });
    expect(result.headline).toBe('Novo');
    expect(result.hourlyRate).toBeNull();
  });
});

describe('ProfessionalService.resolveProfileId', () => {
  it('lança 404 quando usuário não tem perfil', async () => {
    const { deps, service } = makeService();
    deps.profiles.findOne.mockResolvedValueOnce(null);
    await expect(service.resolveProfileId('user-x')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ProfessionalService.setCategories', () => {
  it('substitui associações: remove antigas e cria novas válidas', async () => {
    const { deps, service } = makeService();
    deps.profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' });
    deps.serviceCategories.find.mockResolvedValueOnce([{ id: 'cat-1' }, { id: 'cat-2' }]);
    await service.setCategories('user-1', ['cat-1', 'cat-2']);
    expect(deps.categories.delete).toHaveBeenCalledWith({ professional_id: 'pro-1' });
    expect(deps.categories.save).toHaveBeenCalledTimes(2);
  });

  it('lança 404 se alguma categoria não existe', async () => {
    const { deps, service } = makeService();
    deps.profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' });
    deps.serviceCategories.find.mockResolvedValueOnce([{ id: 'cat-1' }]);
    await expect(service.setCategories('user-1', ['cat-1', 'cat-2'])).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/professional/professional.service.test.ts`
Expected: FAIL — `Cannot find module './professional.service'`.

- [ ] **Step 3: Implementar o service**

Create `backend/src/modules/professional/professional.service.ts`:

```ts
import { In, Repository } from 'typeorm';
import { ProfessionalProfile } from '@/infra/database/entities/professional-profile.entity';
import { ProfessionalDocument } from '@/infra/database/entities/professional-document.entity';
import { ProfessionalExperience } from '@/infra/database/entities/professional-experience.entity';
import { ProfessionalEducation } from '@/infra/database/entities/professional-education.entity';
import { ProfessionalCertification } from '@/infra/database/entities/professional-certification.entity';
import { ProfessionalServiceArea } from '@/infra/database/entities/professional-service-area.entity';
import { ProfessionalCategory } from '@/infra/database/entities/professional-category.entity';
import { ProfessionalTag } from '@/infra/database/entities/professional-tag.entity';
import { ServiceCategory } from '@/infra/database/entities/service-category.entity';
import { ServiceTag } from '@/infra/database/entities/service-tag.entity';
import { NotFoundError } from '@/shared/errors';
import type {
  UpsertProfileInput,
  ProfileResponse,
  PublicProfileResponse,
  ExperienceResponse,
  EducationResponse,
  CertificationResponse,
  ServiceAreaResponse,
} from './professional.schemas';

export interface ProfessionalServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  documents: Repository<ProfessionalDocument>;
  experiences: Repository<ProfessionalExperience>;
  education: Repository<ProfessionalEducation>;
  certifications: Repository<ProfessionalCertification>;
  serviceAreas: Repository<ProfessionalServiceArea>;
  categories: Repository<ProfessionalCategory>;
  tags: Repository<ProfessionalTag>;
  serviceCategories: Repository<ServiceCategory>;
  serviceTags: Repository<ServiceTag>;
}

export class ProfessionalService {
  constructor(private readonly deps: ProfessionalServiceDeps) {}

  private toProfile(p: ProfessionalProfile): ProfileResponse {
    return {
      id: p.id,
      userId: p.user_id,
      headline: p.headline,
      bio: p.bio,
      yearsExperience: p.years_experience,
      hourlyRate: p.hourly_rate === null ? null : Number(p.hourly_rate),
      serviceRadiusKm: p.service_radius_km,
      ratingAverage: Number(p.rating_average),
      ratingCount: p.rating_count,
      isAvailable: p.is_available,
      verifiedAt: p.verified_at ? p.verified_at.toISOString() : null,
      createdAt: p.created_at.toISOString(),
    };
  }

  private toExperience(e: ProfessionalExperience): ExperienceResponse {
    return {
      id: e.id,
      title: e.title,
      company: e.company,
      description: e.description,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current,
    };
  }

  private toEducation(e: ProfessionalEducation): EducationResponse {
    return {
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      fieldOfStudy: e.field_of_study,
      startDate: e.start_date,
      endDate: e.end_date,
    };
  }

  private toCertification(c: ProfessionalCertification): CertificationResponse {
    return {
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issuedAt: c.issued_at,
      expiresAt: c.expires_at,
      credentialUrl: c.credential_url,
    };
  }

  private toServiceArea(a: ProfessionalServiceArea): ServiceAreaResponse {
    return { id: a.id, city: a.city, state: a.state, radiusKm: a.radius_km };
  }

  async upsertProfile(userId: string, input: UpsertProfileInput): Promise<ProfileResponse> {
    const existing = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (existing) {
      existing.headline = input.headline;
      existing.bio = input.bio;
      existing.years_experience = input.yearsExperience;
      existing.hourly_rate = input.hourlyRate === null ? null : input.hourlyRate.toFixed(2);
      existing.service_radius_km = input.serviceRadiusKm;
      const saved = await this.deps.profiles.save(existing);
      return this.toProfile(saved);
    }
    const created = await this.deps.profiles.save(
      this.deps.profiles.create({
        user_id: userId,
        headline: input.headline,
        bio: input.bio,
        years_experience: input.yearsExperience,
        hourly_rate: input.hourlyRate === null ? null : input.hourlyRate.toFixed(2),
        service_radius_km: input.serviceRadiusKm,
        rating_average: '0.00',
        rating_count: 0,
        is_available: true,
        verified_at: null,
      }),
    );
    return this.toProfile(created);
  }

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional não encontrado');
    return this.toProfile(profile);
  }

  async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional não encontrado');
    return profile.id;
  }

  async getPublicProfile(profileId: string): Promise<PublicProfileResponse> {
    const profile = await this.deps.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundError('Perfil profissional não encontrado');
    const [experiences, education, certifications, serviceAreas, catLinks] = await Promise.all([
      this.deps.experiences.find({ where: { professional_id: profileId }, order: { start_date: 'DESC' } }),
      this.deps.education.find({ where: { professional_id: profileId } }),
      this.deps.certifications.find({ where: { professional_id: profileId } }),
      this.deps.serviceAreas.find({ where: { professional_id: profileId } }),
      this.deps.categories.find({ where: { professional_id: profileId } }),
    ]);
    const categoryIds = catLinks.map((l) => l.category_id);
    const categoryRows = categoryIds.length
      ? await this.deps.serviceCategories.find({ where: { id: In(categoryIds) } })
      : [];
    return {
      ...this.toProfile(profile),
      categories: categoryRows.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      experiences: experiences.map((e) => this.toExperience(e)),
      education: education.map((e) => this.toEducation(e)),
      certifications: certifications.map((c) => this.toCertification(c)),
      serviceAreas: serviceAreas.map((a) => this.toServiceArea(a)),
    };
  }

  async setCategories(userId: string, ids: string[]): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const unique = [...new Set(ids)];
    if (unique.length) {
      const found = await this.deps.serviceCategories.find({ where: { id: In(unique) } });
      if (found.length !== unique.length) throw new NotFoundError('Categoria inexistente');
    }
    await this.deps.categories.delete({ professional_id: professionalId });
    await Promise.all(
      unique.map((categoryId) =>
        this.deps.categories.save(
          this.deps.categories.create({ professional_id: professionalId, category_id: categoryId }),
        ),
      ),
    );
  }

  async setTags(userId: string, ids: string[]): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const unique = [...new Set(ids)];
    if (unique.length) {
      const found = await this.deps.serviceTags.find({ where: { id: In(unique) } });
      if (found.length !== unique.length) throw new NotFoundError('Tag inexistente');
    }
    await this.deps.tags.delete({ professional_id: professionalId });
    await Promise.all(
      unique.map((tagId) =>
        this.deps.tags.save(this.deps.tags.create({ professional_id: professionalId, tag_id: tagId })),
      ),
    );
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/professional/professional.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/professional/professional.service.ts backend/src/modules/professional/professional.service.test.ts
git commit -m "feat(professional): implementa perfil e associações de categoria/tag"
```

---

## Nota de retomada (escrita após Tasks 1-5 implementadas e revisadas)

As Tasks 1-5 acima cobrem só `catalog` e o núcleo do perfil `professional` (upsert/get/associações). O objetivo da fase (linha 5) e o `plan_index.md` também prometem `availability`, `portfolio`, `search` e as features frontend `professional`/`landing` — as Tasks 6-15 abaixo completam esse escopo. Elas foram escritas depois de Tasks 1-5 já estarem implementadas e mescladas, então usam os tipos/entidades reais confirmados no código (não suposições do plano original).

**Convenções confirmadas no código real (aplicam-se a todas as tasks abaixo):**
- Sem alias `@/`: imports relativos com extensão `.js` (ESM NodeNext).
- Repos via `app.dataSource.getRepository(Entity)` dentro de `*.routes.ts`, não `AppDataSource` estático.
- `app.authenticate` (preHandler) popula `request.user = { id: string; role: 'client'|'professional'|'admin' }`. `requireRole(...roles)` vem de `backend/src/plugins/auth.ts`.
- `idParamSchema`, `paginationQuerySchema`, `paginatedResponse` vêm de `backend/src/shared/schemas.ts`.
- `mockRepo<T>()` vem de `backend/src/test/mocks/index.ts`.
- `buildTestApp()` vem de `backend/src/test/buildTestApp.ts`; testes de integração usam `truncateAll()` de `backend/src/test/database.js` no `beforeAll`, e criam usuários autenticados via `POST /api/auth/register` (não existe factory `createUser`/`createProfessional` pronta — ver padrão `authHeader` em `backend/src/modules/account/account.routes.test.ts`).
- `backend/src/modules/professional/professional.schemas.ts` (Task 4) já define `experienceSchema/Response`, `educationSchema/Response`, `certificationSchema/Response`, `serviceAreaSchema/Response`, `documentSchema/Response`, `setAssociationsSchema` — reaproveitar, não redefinir.
- Módulos registrados em `backend/src/app.ts` via `await app.register(<name>Routes, { prefix: '/api' })`, mesmo padrão de `catalogRoutes`/`accountRoutes`.

---

## Task 6: Módulo `professional` — sub-recursos (experiência, formação, certificação, área de atendimento, documentos)

**Files:**
- Modify: `backend/src/modules/professional/professional.service.ts`
- Modify: `backend/src/modules/professional/professional.service.test.ts`

**Interfaces:**
- Consumes: `ExperienceInput`, `EducationInput`, `CertificationInput`, `ServiceAreaInput`, `DocumentInput` e os tipos `*Response` de `professional.schemas.ts` (Task 4); `ConflictError`, `NotFoundError` de `../../shared/errors.js`.
- Produces (novos métodos em `ProfessionalService`):
  - `addExperience(userId: string, input: ExperienceInput): Promise<ExperienceResponse>`
  - `removeExperience(userId: string, id: string): Promise<void>`
  - `addEducation(userId: string, input: EducationInput): Promise<EducationResponse>`
  - `removeEducation(userId: string, id: string): Promise<void>`
  - `addCertification(userId: string, input: CertificationInput): Promise<CertificationResponse>`
  - `removeCertification(userId: string, id: string): Promise<void>`
  - `addServiceArea(userId: string, input: ServiceAreaInput): Promise<ServiceAreaResponse>`
  - `removeServiceArea(userId: string, id: string): Promise<void>`
  - `addDocument(userId: string, input: DocumentInput): Promise<DocumentResponse>`
  - `listDocuments(userId: string): Promise<DocumentResponse[]>`

- [ ] **Step 1: Escrever os testes falhando**

Add to `backend/src/modules/professional/professional.service.test.ts` (mantendo os `describe`s existentes das Tasks 1-5, e reaproveitando o `mockRepo<T>()` já importado de `../../test/mocks/index.js`):

```ts
describe('ProfessionalService sub-recursos', () => {
  let deps: ReturnType<typeof buildDeps>;
  let service: ProfessionalService;

  beforeEach(() => {
    deps = buildDeps();
    service = new ProfessionalService(deps);
  });

  it('adiciona e remove experiencia do proprio profissional', async () => {
    deps.profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' });
    deps.experiences.create.mockImplementation((v) => v);
    deps.experiences.save.mockImplementation(async (v) => ({ id: 'exp-1', ...v }));

    const created = await service.addExperience('user-1', {
      title: 'Eletricista',
      company: 'Eletrica ABC',
      description: null,
      startDate: '2020-01-01',
      endDate: null,
      isCurrent: true,
    });
    expect(created.id).toBe('exp-1');
    expect(deps.experiences.create).toHaveBeenCalledWith(
      expect.objectContaining({ professional_id: 'prof-1', title: 'Eletricista' }),
    );

    deps.experiences.findOne.mockResolvedValue({ id: 'exp-1', professional_id: 'prof-1' });
    await service.removeExperience('user-1', 'exp-1');
    expect(deps.experiences.delete).toHaveBeenCalledWith({ id: 'exp-1' });
  });

  it('rejeita remover experiencia de outro profissional', async () => {
    deps.profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' });
    deps.experiences.findOne.mockResolvedValue({ id: 'exp-9', professional_id: 'prof-OUTRO' });
    await expect(service.removeExperience('user-1', 'exp-9')).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.experiences.delete).not.toHaveBeenCalled();
  });

  it('adiciona formacao e certificacao', async () => {
    deps.profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' });
    deps.education.create.mockImplementation((v) => v);
    deps.education.save.mockImplementation(async (v) => ({ id: 'edu-1', ...v }));
    const edu = await service.addEducation('user-1', {
      institution: 'SENAI',
      degree: 'Tecnico',
      fieldOfStudy: null,
      startDate: null,
      endDate: null,
    });
    expect(edu.id).toBe('edu-1');

    deps.certifications.create.mockImplementation((v) => v);
    deps.certifications.save.mockImplementation(async (v) => ({ id: 'cert-1', ...v }));
    const cert = await service.addCertification('user-1', {
      name: 'NR-10',
      issuer: 'SENAI',
      issuedAt: null,
      expiresAt: null,
      credentialUrl: null,
    });
    expect(cert.id).toBe('cert-1');
  });

  it('adiciona area de atendimento e rejeita duplicata de cidade/UF', async () => {
    deps.profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' });
    deps.serviceAreas.findOne.mockResolvedValueOnce(null);
    deps.serviceAreas.create.mockImplementation((v) => v);
    deps.serviceAreas.save.mockImplementation(async (v) => ({ id: 'area-1', ...v }));
    const area = await service.addServiceArea('user-1', { city: 'Porto Alegre', state: 'RS', radiusKm: 20 });
    expect(area.id).toBe('area-1');

    deps.serviceAreas.findOne.mockResolvedValueOnce({ id: 'area-1' });
    await expect(
      service.addServiceArea('user-1', { city: 'Porto Alegre', state: 'RS', radiusKm: 20 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('adiciona e lista documentos', async () => {
    deps.profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' });
    deps.documents.create.mockImplementation((v) => v);
    deps.documents.save.mockImplementation(async (v) => ({
      id: 'doc-1',
      status: 'pending',
      reviewed_at: null,
      ...v,
    }));
    const created = await service.addDocument('user-1', { type: 'rg', fileUrl: 'https://cdn.app/rg.pdf' });
    expect(created.status).toBe('pending');

    deps.documents.find.mockResolvedValue([
      { id: 'doc-1', type: 'rg', file_url: 'https://cdn.app/rg.pdf', status: 'pending', reviewed_at: null },
    ]);
    const list = await service.listDocuments('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].fileUrl).toBe('https://cdn.app/rg.pdf');
  });
});
```

Add (or confirm already present) a shared `buildDeps()` helper near the top of the test file that builds a fresh `mockRepo<T>()` for every key of `ProfessionalServiceDeps` — if Tasks 1-5's test file already builds deps inline per-`describe` instead of a shared helper, add `buildDeps()` as a new local function in this file (don't touch existing describes) and use it only in this new describe block, e.g.:

```ts
function buildDeps() {
  return {
    profiles: mockRepo<ProfessionalProfile>(),
    documents: mockRepo<ProfessionalDocument>(),
    experiences: mockRepo<ProfessionalExperience>(),
    education: mockRepo<ProfessionalEducation>(),
    certifications: mockRepo<ProfessionalCertification>(),
    serviceAreas: mockRepo<ProfessionalServiceArea>(),
    categories: mockRepo<ProfessionalCategory>(),
    tags: mockRepo<ProfessionalTag>(),
    serviceCategories: mockRepo<ServiceCategory>(),
    serviceTags: mockRepo<ServiceTag>(),
  };
}
```

(Import the entity types already imported earlier in the file for Tasks 1-5's tests; reuse those imports.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/professional/professional.service.test.ts`
Expected: FAIL — `service.addExperience is not a function`.

- [ ] **Step 3: Implementar os métodos**

Add to `backend/src/modules/professional/professional.service.ts`, inside `ProfessionalService`, alongside the existing methods (and add `ConflictError` to the existing `NotFoundError` import from `../../shared/errors.js`, plus `DocumentInput`, `DocumentResponse`, `ExperienceInput`, `EducationInput`, `CertificationInput`, `ServiceAreaInput` to the existing type-only import from `./professional.schemas.js`):

```ts
  async addExperience(userId: string, input: ExperienceInput): Promise<ExperienceResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.experiences.save(
      this.deps.experiences.create({
        professional_id: professionalId,
        title: input.title,
        company: input.company,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        is_current: input.isCurrent,
      }),
    );
    return this.toExperience(saved);
  }

  async removeExperience(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const experience = await this.deps.experiences.findOne({ where: { id } });
    if (!experience || experience.professional_id !== professionalId) {
      throw new NotFoundError('Experiência não encontrada');
    }
    await this.deps.experiences.delete({ id });
  }

  async addEducation(userId: string, input: EducationInput): Promise<EducationResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.education.save(
      this.deps.education.create({
        professional_id: professionalId,
        institution: input.institution,
        degree: input.degree,
        field_of_study: input.fieldOfStudy,
        start_date: input.startDate,
        end_date: input.endDate,
      }),
    );
    return this.toEducation(saved);
  }

  async removeEducation(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const education = await this.deps.education.findOne({ where: { id } });
    if (!education || education.professional_id !== professionalId) {
      throw new NotFoundError('Formação não encontrada');
    }
    await this.deps.education.delete({ id });
  }

  async addCertification(userId: string, input: CertificationInput): Promise<CertificationResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.certifications.save(
      this.deps.certifications.create({
        professional_id: professionalId,
        name: input.name,
        issuer: input.issuer,
        issued_at: input.issuedAt,
        expires_at: input.expiresAt,
        credential_url: input.credentialUrl,
      }),
    );
    return this.toCertification(saved);
  }

  async removeCertification(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const certification = await this.deps.certifications.findOne({ where: { id } });
    if (!certification || certification.professional_id !== professionalId) {
      throw new NotFoundError('Certificação não encontrada');
    }
    await this.deps.certifications.delete({ id });
  }

  async addServiceArea(userId: string, input: ServiceAreaInput): Promise<ServiceAreaResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const existing = await this.deps.serviceAreas.findOne({
      where: { professional_id: professionalId, city: input.city, state: input.state },
    });
    if (existing) {
      throw new ConflictError('Área de atendimento já cadastrada para esta cidade/UF');
    }
    const saved = await this.deps.serviceAreas.save(
      this.deps.serviceAreas.create({
        professional_id: professionalId,
        city: input.city,
        state: input.state,
        radius_km: input.radiusKm,
      }),
    );
    return this.toServiceArea(saved);
  }

  async removeServiceArea(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const area = await this.deps.serviceAreas.findOne({ where: { id } });
    if (!area || area.professional_id !== professionalId) {
      throw new NotFoundError('Área de atendimento não encontrada');
    }
    await this.deps.serviceAreas.delete({ id });
  }

  async addDocument(userId: string, input: DocumentInput): Promise<DocumentResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.documents.save(
      this.deps.documents.create({
        professional_id: professionalId,
        type: input.type,
        file_url: input.fileUrl,
        status: 'pending',
        reviewed_at: null,
      }),
    );
    return this.toDocument(saved);
  }

  async listDocuments(userId: string): Promise<DocumentResponse[]> {
    const professionalId = await this.resolveProfileId(userId);
    const rows = await this.deps.documents.find({ where: { professional_id: professionalId } });
    return rows.map((row) => this.toDocument(row));
  }
```

And add a private mapper next to the other `to*` methods:

```ts
  private toDocument(document: ProfessionalDocument): DocumentResponse {
    return {
      id: document.id,
      type: document.type,
      fileUrl: document.file_url,
      status: document.status,
      reviewedAt: document.reviewed_at ? document.reviewed_at.toISOString() : null,
    };
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/professional/professional.service.test.ts`
Expected: PASS (todos os testes das Tasks 1-5 e 6).

- [ ] **Step 5: Typecheck + lint**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/professional/professional.service.ts backend/src/modules/professional/professional.service.test.ts
git commit -m "feat(professional): adiciona crud de experiencia, formacao, certificacao, area e documentos"
```

---

## Task 7: Módulo `professional` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/professional/professional.controller.ts`
- Create: `backend/src/modules/professional/professional.routes.ts`
- Test: `backend/src/modules/professional/professional.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `professionalRoutes`)

**Interfaces:**
- Consumes: `ProfessionalService` (Tasks 5-6), `idParamSchema` de `../../shared/schemas.js`, `requireRole` de `../../plugins/auth.js`.
- Produces: rotas `PUT/GET /api/professionals/me`, `GET /api/professionals/:id`, `PUT /api/professionals/me/categories`, `PUT /api/professionals/me/tags`, `POST/DELETE /api/professionals/me/experiences[/:id]`, `POST/DELETE /api/professionals/me/education[/:id]`, `POST/DELETE /api/professionals/me/certifications[/:id]`, `POST/DELETE /api/professionals/me/service-areas[/:id]`, `POST/GET /api/professionals/me/documents`.

- [ ] **Step 1: Escrever o controller**

Create `backend/src/modules/professional/professional.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProfessionalService } from './professional.service.js';
import type {
  UpsertProfileInput,
  SetAssociationsInput,
  ExperienceInput,
  EducationInput,
  CertificationInput,
  ServiceAreaInput,
  DocumentInput,
} from './professional.schemas.js';

export class ProfessionalController {
  constructor(private readonly service: ProfessionalService) {}

  upsertProfile = async (req: FastifyRequest<{ Body: UpsertProfileInput }>, reply: FastifyReply) =>
    reply.send(await this.service.upsertProfile(req.user!.id, req.body));

  getMyProfile = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.getMyProfile(req.user!.id));

  getPublicProfile = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.getPublicProfile(req.params.id));

  setCategories = async (req: FastifyRequest<{ Body: SetAssociationsInput }>, reply: FastifyReply) => {
    await this.service.setCategories(req.user!.id, req.body.ids);
    return reply.status(204).send();
  };

  setTags = async (req: FastifyRequest<{ Body: SetAssociationsInput }>, reply: FastifyReply) => {
    await this.service.setTags(req.user!.id, req.body.ids);
    return reply.status(204).send();
  };

  addExperience = async (req: FastifyRequest<{ Body: ExperienceInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addExperience(req.user!.id, req.body));

  removeExperience = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeExperience(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addEducation = async (req: FastifyRequest<{ Body: EducationInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addEducation(req.user!.id, req.body));

  removeEducation = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeEducation(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addCertification = async (req: FastifyRequest<{ Body: CertificationInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addCertification(req.user!.id, req.body));

  removeCertification = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeCertification(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addServiceArea = async (req: FastifyRequest<{ Body: ServiceAreaInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addServiceArea(req.user!.id, req.body));

  removeServiceArea = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeServiceArea(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addDocument = async (req: FastifyRequest<{ Body: DocumentInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addDocument(req.user!.id, req.body));

  listDocuments = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listDocuments(req.user!.id));
}
```

- [ ] **Step 2: Escrever as rotas**

Create `backend/src/modules/professional/professional.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProfessionalService } from './professional.service.js';
import { ProfessionalController } from './professional.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalDocument } from '../../infra/database/entities/professional-document.entity.js';
import { ProfessionalExperience } from '../../infra/database/entities/professional-experience.entity.js';
import { ProfessionalEducation } from '../../infra/database/entities/professional-education.entity.js';
import { ProfessionalCertification } from '../../infra/database/entities/professional-certification.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalTag } from '../../infra/database/entities/professional-tag.entity.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  upsertProfileSchema,
  profileResponseSchema,
  publicProfileSchema,
  setAssociationsSchema,
  experienceSchema,
  experienceResponseSchema,
  educationSchema,
  educationResponseSchema,
  certificationSchema,
  certificationResponseSchema,
  serviceAreaSchema,
  serviceAreaResponseSchema,
  documentSchema,
  documentResponseSchema,
} from './professional.schemas.js';

export async function professionalRoutes(app: FastifyInstance): Promise<void> {
  const service = new ProfessionalService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    documents: app.dataSource.getRepository(ProfessionalDocument),
    experiences: app.dataSource.getRepository(ProfessionalExperience),
    education: app.dataSource.getRepository(ProfessionalEducation),
    certifications: app.dataSource.getRepository(ProfessionalCertification),
    serviceAreas: app.dataSource.getRepository(ProfessionalServiceArea),
    categories: app.dataSource.getRepository(ProfessionalCategory),
    tags: app.dataSource.getRepository(ProfessionalTag),
    serviceCategories: app.dataSource.getRepository(ServiceCategory),
    serviceTags: app.dataSource.getRepository(ServiceTag),
  });
  const controller = new ProfessionalController(service);
  const guard = [app.authenticate, requireRole('professional')];

  app.get('/professionals/me', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Meu perfil profissional', response: { 200: profileResponseSchema } },
    handler: controller.getMyProfile,
  });

  app.put('/professionals/me', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Cria ou atualiza perfil profissional',
      body: upsertProfileSchema,
      response: { 200: profileResponseSchema },
    },
    handler: controller.upsertProfile,
  });

  app.get('/professionals/:id', {
    schema: {
      tags: ['professional'],
      summary: 'Perfil publico do profissional',
      params: idParamSchema,
      response: { 200: publicProfileSchema },
    },
    handler: controller.getPublicProfile,
  });

  app.put('/professionals/me/categories', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Define categorias atendidas',
      body: setAssociationsSchema,
      response: { 204: z.void() },
    },
    handler: controller.setCategories,
  });

  app.put('/professionals/me/tags', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Define tags atendidas',
      body: setAssociationsSchema,
      response: { 204: z.void() },
    },
    handler: controller.setTags,
  });

  app.post('/professionals/me/experiences', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona experiencia',
      body: experienceSchema,
      response: { 201: experienceResponseSchema },
    },
    handler: controller.addExperience,
  });

  app.delete('/professionals/me/experiences/:id', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Remove experiencia', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeExperience,
  });

  app.post('/professionals/me/education', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona formacao',
      body: educationSchema,
      response: { 201: educationResponseSchema },
    },
    handler: controller.addEducation,
  });

  app.delete('/professionals/me/education/:id', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Remove formacao', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeEducation,
  });

  app.post('/professionals/me/certifications', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona certificacao',
      body: certificationSchema,
      response: { 201: certificationResponseSchema },
    },
    handler: controller.addCertification,
  });

  app.delete('/professionals/me/certifications/:id', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Remove certificacao',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.removeCertification,
  });

  app.post('/professionals/me/service-areas', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona area de atendimento',
      body: serviceAreaSchema,
      response: { 201: serviceAreaResponseSchema },
    },
    handler: controller.addServiceArea,
  });

  app.delete('/professionals/me/service-areas/:id', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Remove area de atendimento',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.removeServiceArea,
  });

  app.post('/professionals/me/documents', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Envia documento para analise',
      body: documentSchema,
      response: { 201: documentResponseSchema },
    },
    handler: controller.addDocument,
  });

  app.get('/professionals/me/documents', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Lista documentos enviados',
      response: { 200: z.array(documentResponseSchema) },
    },
    handler: controller.listDocuments,
  });
}
```

- [ ] **Step 3: Registrar em app.ts**

In `backend/src/app.ts`, add the import next to the other module route imports (`import { professionalRoutes } from './modules/professional/professional.routes.js';`) and register it next to `catalogRoutes`:

```ts
  await app.register(professionalRoutes, { prefix: '/api' });
```

- [ ] **Step 4: Escrever teste de integração falhando**

Create `backend/src/modules/professional/professional.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `pro-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('professional routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejeita acesso sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/professionals/me' });
    expect(res.statusCode).toBe(401);
  });

  it('cria perfil, adiciona experiencia e le no perfil publico', async () => {
    const headers = await professionalHeader(app);

    const upserted = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Eletricista', bio: null, yearsExperience: 5, hourlyRate: 100, serviceRadiusKm: 20 },
    });
    expect(upserted.statusCode).toBe(200);
    const profileId = upserted.json().id;

    const experience = await app.inject({
      method: 'POST',
      url: '/api/professionals/me/experiences',
      headers,
      payload: { title: 'Manutencao', company: null, description: null, startDate: '2020-01-01', endDate: null, isCurrent: true },
    });
    expect(experience.statusCode).toBe(201);

    const publicProfile = await app.inject({ method: 'GET', url: `/api/professionals/${profileId}` });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json().experiences).toHaveLength(1);
  });

  it('define categorias e rejeita id inexistente sem apagar as validas', async () => {
    const headers = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Pintor', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });

    const category = await app.inject({
      method: 'POST',
      url: '/api/categories',
      headers: await (async () => {
        const admin = await professionalHeader(app);
        return admin;
      })(),
      payload: { parentId: null, name: 'Pintura', slug: `pintura-${Date.now()}`, icon: null, description: null },
    });
    if (category.statusCode !== 201) {
      expect(category.statusCode).toBe(403);
      return;
    }
  });

  it('remove experiencia inexistente com 404', async () => {
    const headers = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Encanador', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/professionals/me/experiences/00000000-0000-0000-0000-000000000000',
      headers,
    });
    expect(res.statusCode).toBe(404);
  });
});
```

Note on the "categorias" test above: category creation requires `role: 'admin'`, which cannot be obtained through public registration (see Task 3's real test, which creates an admin directly via `TestDataSource.getRepository(User)` + `signAccessToken`). Rewrite that third test using the same direct-DB-plus-manual-JWT pattern as `backend/src/modules/catalog/catalog.routes.test.ts` (read it first) to get a real admin token, create a category as admin, then call `PUT /api/professionals/me/categories` as the professional with `{ ids: [validId, 'not-a-real-uuid-but-valid-format'] }` (a syntactically valid but non-existent UUID) and assert `404` plus that a follow-up `GET /api/professionals/:id` still shows zero categories (proving the bad id didn't leave a partial write). Do not ship the placeholder version shown above — it's illustrative only, replace it with a real admin-token-based test before running.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/professional`
Expected: PASS (unit tests from Tasks 5-6 plus the new integration tests).

- [ ] **Step 6: Typecheck + lint + suíte completa**

Run: `cd backend && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: sem erros, sem regressão nos módulos anteriores.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/professional/ backend/src/app.ts
git commit -m "feat(professional): expoe rotas de perfil profissional com testes de integracao"
```

---

## Task 8: Módulo `availability` — schemas + service

**Files:**
- Create: `backend/src/modules/availability/availability.schemas.ts`
- Create: `backend/src/modules/availability/availability.service.ts`
- Test: `backend/src/modules/availability/availability.service.test.ts`

**Interfaces:**
- Consumes: entidades `AvailabilitySlot`, `AvailabilityException` (`backend/src/infra/database/entities/availability-slot.entity.ts`, `availability-exception.entity.ts`); `ProfessionalService`'s `resolveProfileId` pattern (não reexportar — reimplementar localmente igual à Task 6, resolvendo `professional_id` a partir do `userId` via o repo `ProfessionalProfile`, que este módulo também recebe como dependência).
- Produces:
  ```ts
  class AvailabilityService {
    constructor(deps: {
      profiles: Repository<ProfessionalProfile>;
      slots: Repository<AvailabilitySlot>;
      exceptions: Repository<AvailabilityException>;
    })
    addSlot(userId: string, input: SlotInput): Promise<SlotResponse>
    removeSlot(userId: string, id: string): Promise<void>
    listSlots(professionalId: string): Promise<SlotResponse[]>
    addException(userId: string, input: ExceptionInput): Promise<ExceptionResponse>
    removeException(userId: string, id: string): Promise<void>
    listExceptions(professionalId: string): Promise<ExceptionResponse[]>
  }
  ```

- [ ] **Step 1: Escrever os schemas**

Create `backend/src/modules/availability/availability.schemas.ts`:

```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const slotSchema = z.object({
  weekday: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe('Dia da semana (0=domingo .. 6=sabado)')
    .openapi({ example: 1 }),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('Inicio (HH:MM)')
    .openapi({ example: '08:00' }),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('Fim (HH:MM)')
    .openapi({ example: '18:00' }),
});

export const slotResponseSchema = slotSchema.extend({
  id: z.string().uuid().describe('ID do slot').openapi({ example: '6f7a1111-1111-1111-1111-111111111111' }),
});

export const exceptionSchema = z.object({
  date: z.string().date().describe('Data (YYYY-MM-DD)').openapi({ example: '2026-12-25' }),
  isAvailable: z.boolean().describe('Disponivel nessa data').openapi({ example: false }),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .describe('Inicio (HH:MM)')
    .openapi({ example: null }),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .describe('Fim (HH:MM)')
    .openapi({ example: null }),
  reason: z.string().max(255).nullable().describe('Motivo').openapi({ example: 'Feriado' }),
});

export const exceptionResponseSchema = exceptionSchema.extend({
  id: z.string().uuid().describe('ID da excecao').openapi({ example: '7a8b1111-1111-1111-1111-111111111111' }),
});

export type SlotInput = z.infer<typeof slotSchema>;
export type SlotResponse = z.infer<typeof slotResponseSchema>;
export type ExceptionInput = z.infer<typeof exceptionSchema>;
export type ExceptionResponse = z.infer<typeof exceptionResponseSchema>;
```

- [ ] **Step 2: Escrever o teste falhando**

Create `backend/src/modules/availability/availability.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AvailabilityService } from './availability.service';
import { mockRepo } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import type { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';

describe('AvailabilityService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let slots: ReturnType<typeof mockRepo<AvailabilitySlot>>;
  let exceptions: ReturnType<typeof mockRepo<AvailabilityException>>;
  let service: AvailabilityService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    slots = mockRepo<AvailabilitySlot>();
    exceptions = mockRepo<AvailabilityException>();
    service = new AvailabilityService({ profiles, slots, exceptions });
  });

  it('adiciona slot de disponibilidade', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    slots.create.mockImplementation((v) => v as AvailabilitySlot);
    slots.save.mockImplementation(async (v) => ({ id: 'slot-1', ...v }) as AvailabilitySlot);

    const created = await service.addSlot('user-1', { weekday: 1, startTime: '08:00', endTime: '18:00' });
    expect(created.id).toBe('slot-1');
    expect(slots.create).toHaveBeenCalledWith(
      expect.objectContaining({ professional_id: 'prof-1', weekday: 1 }),
    );
  });

  it('lanca 404 ao adicionar slot sem perfil profissional', async () => {
    profiles.findOne.mockResolvedValue(null);
    await expect(
      service.addSlot('user-sem-perfil', { weekday: 1, startTime: '08:00', endTime: '18:00' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('remove slot do proprio profissional e rejeita de outro', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    slots.findOne.mockResolvedValueOnce({ id: 'slot-1', professional_id: 'prof-1' } as AvailabilitySlot);
    await service.removeSlot('user-1', 'slot-1');
    expect(slots.delete).toHaveBeenCalledWith({ id: 'slot-1' });

    slots.findOne.mockResolvedValueOnce({ id: 'slot-2', professional_id: 'prof-OUTRO' } as AvailabilitySlot);
    await expect(service.removeSlot('user-1', 'slot-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lista slots por professionalId', async () => {
    slots.find.mockResolvedValue([
      { id: 'slot-1', professional_id: 'prof-1', weekday: 1, start_time: '08:00', end_time: '18:00' } as AvailabilitySlot,
    ]);
    const list = await service.listSlots('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0].startTime).toBe('08:00');
  });

  it('adiciona e remove excecao de disponibilidade', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    exceptions.create.mockImplementation((v) => v as AvailabilityException);
    exceptions.save.mockImplementation(async (v) => ({ id: 'exc-1', ...v }) as AvailabilityException);

    const created = await service.addException('user-1', {
      date: '2026-12-25',
      isAvailable: false,
      startTime: null,
      endTime: null,
      reason: 'Feriado',
    });
    expect(created.id).toBe('exc-1');

    exceptions.findOne.mockResolvedValue({ id: 'exc-1', professional_id: 'prof-1' } as AvailabilityException);
    await service.removeException('user-1', 'exc-1');
    expect(exceptions.delete).toHaveBeenCalledWith({ id: 'exc-1' });
  });

  it('lista excecoes por professionalId', async () => {
    exceptions.find.mockResolvedValue([
      {
        id: 'exc-1',
        professional_id: 'prof-1',
        date: '2026-12-25',
        is_available: false,
        start_time: null,
        end_time: null,
        reason: 'Feriado',
      } as AvailabilityException,
    ]);
    const list = await service.listExceptions('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0].reason).toBe('Feriado');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/availability/availability.service.test.ts`
Expected: FAIL — `Cannot find module './availability.service'`.

- [ ] **Step 4: Implementar o service**

Create `backend/src/modules/availability/availability.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type { SlotInput, SlotResponse, ExceptionInput, ExceptionResponse } from './availability.schemas.js';

interface AvailabilityServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  slots: Repository<AvailabilitySlot>;
  exceptions: Repository<AvailabilityException>;
}

export class AvailabilityService {
  constructor(private readonly deps: AvailabilityServiceDeps) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional não encontrado');
    return profile.id;
  }

  async addSlot(userId: string, input: SlotInput): Promise<SlotResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.slots.save(
      this.deps.slots.create({
        professional_id: professionalId,
        weekday: input.weekday,
        start_time: input.startTime,
        end_time: input.endTime,
      }),
    );
    return this.toSlot(saved);
  }

  async removeSlot(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const slot = await this.deps.slots.findOne({ where: { id } });
    if (!slot || slot.professional_id !== professionalId) {
      throw new NotFoundError('Slot de disponibilidade não encontrado');
    }
    await this.deps.slots.delete({ id });
  }

  async listSlots(professionalId: string): Promise<SlotResponse[]> {
    const rows = await this.deps.slots.find({ where: { professional_id: professionalId }, order: { weekday: 'ASC' } });
    return rows.map((row) => this.toSlot(row));
  }

  async addException(userId: string, input: ExceptionInput): Promise<ExceptionResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.exceptions.save(
      this.deps.exceptions.create({
        professional_id: professionalId,
        date: input.date,
        is_available: input.isAvailable,
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason,
      }),
    );
    return this.toException(saved);
  }

  async removeException(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const exception = await this.deps.exceptions.findOne({ where: { id } });
    if (!exception || exception.professional_id !== professionalId) {
      throw new NotFoundError('Exceção de disponibilidade não encontrada');
    }
    await this.deps.exceptions.delete({ id });
  }

  async listExceptions(professionalId: string): Promise<ExceptionResponse[]> {
    const rows = await this.deps.exceptions.find({ where: { professional_id: professionalId }, order: { date: 'ASC' } });
    return rows.map((row) => this.toException(row));
  }

  private toSlot(slot: AvailabilitySlot): SlotResponse {
    return { id: slot.id, weekday: slot.weekday, startTime: slot.start_time, endTime: slot.end_time };
  }

  private toException(exception: AvailabilityException): ExceptionResponse {
    return {
      id: exception.id,
      date: exception.date,
      isAvailable: exception.is_available,
      startTime: exception.start_time,
      endTime: exception.end_time,
      reason: exception.reason,
    };
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/availability/availability.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/availability/availability.schemas.ts backend/src/modules/availability/availability.service.ts backend/src/modules/availability/availability.service.test.ts
git commit -m "feat(availability): implementa slots e excecoes de disponibilidade"
```

---

## Task 9: Módulo `availability` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/availability/availability.controller.ts`
- Create: `backend/src/modules/availability/availability.routes.ts`
- Test: `backend/src/modules/availability/availability.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `AvailabilityService` (Task 8).
- Produces: `POST/DELETE /api/availability/me/slots[/:id]`, `GET /api/availability/:professionalId/slots` (público), `POST/DELETE /api/availability/me/exceptions[/:id]`, `GET /api/availability/:professionalId/exceptions` (público).

- [ ] **Step 1: Escrever o controller**

Create `backend/src/modules/availability/availability.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AvailabilityService } from './availability.service.js';
import type { SlotInput, ExceptionInput } from './availability.schemas.js';

export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  addSlot = async (req: FastifyRequest<{ Body: SlotInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addSlot(req.user!.id, req.body));

  removeSlot = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeSlot(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listSlots = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listSlots(req.params.professionalId));

  addException = async (req: FastifyRequest<{ Body: ExceptionInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addException(req.user!.id, req.body));

  removeException = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeException(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listExceptions = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listExceptions(req.params.professionalId));
}
```

- [ ] **Step 2: Escrever as rotas**

Create `backend/src/modules/availability/availability.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityController } from './availability.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { slotSchema, slotResponseSchema, exceptionSchema, exceptionResponseSchema } from './availability.schemas.js';

const professionalIdParamSchema = z.object({
  professionalId: z.string().uuid().describe('ID do perfil profissional').openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
});

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  const service = new AvailabilityService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    slots: app.dataSource.getRepository(AvailabilitySlot),
    exceptions: app.dataSource.getRepository(AvailabilityException),
  });
  const controller = new AvailabilityController(service);
  const guard = [app.authenticate, requireRole('professional')];

  app.post('/availability/me/slots', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Adiciona slot', body: slotSchema, response: { 201: slotResponseSchema } },
    handler: controller.addSlot,
  });

  app.delete('/availability/me/slots/:id', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Remove slot', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeSlot,
  });

  app.get('/availability/:professionalId/slots', {
    schema: {
      tags: ['availability'],
      summary: 'Lista slots publicos do profissional',
      params: professionalIdParamSchema,
      response: { 200: z.array(slotResponseSchema) },
    },
    handler: controller.listSlots,
  });

  app.post('/availability/me/exceptions', {
    onRequest: guard,
    schema: {
      tags: ['availability'],
      summary: 'Adiciona excecao',
      body: exceptionSchema,
      response: { 201: exceptionResponseSchema },
    },
    handler: controller.addException,
  });

  app.delete('/availability/me/exceptions/:id', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Remove excecao', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeException,
  });

  app.get('/availability/:professionalId/exceptions', {
    schema: {
      tags: ['availability'],
      summary: 'Lista excecoes publicas do profissional',
      params: professionalIdParamSchema,
      response: { 200: z.array(exceptionResponseSchema) },
    },
    handler: controller.listExceptions,
  });
}
```

Add `import 'zod-openapi/extend';` at the top if `z.object(...).describe(...).openapi(...)` is used directly in this file (it is, for `professionalIdParamSchema`) — confirm the import is present before running.

- [ ] **Step 3: Registrar em app.ts**

Add `import { availabilityRoutes } from './modules/availability/availability.routes.js';` and `await app.register(availabilityRoutes, { prefix: '/api' });` next to `professionalRoutes`.

- [ ] **Step 4: Escrever teste de integração**

Create `backend/src/modules/availability/availability.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `avail-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('availability routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria perfil, adiciona slot e le publicamente', async () => {
    const headers = await professionalHeader(app);
    const profile = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Diarista', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const professionalId = profile.json().id;

    const slot = await app.inject({
      method: 'POST',
      url: '/api/availability/me/slots',
      headers,
      payload: { weekday: 2, startTime: '09:00', endTime: '17:00' },
    });
    expect(slot.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: `/api/availability/${professionalId}/slots` });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });

  it('rejeita adicionar slot sem autenticacao', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/availability/me/slots',
      payload: { weekday: 1, startTime: '08:00', endTime: '12:00' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('adiciona e remove excecao', async () => {
    const headers = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Jardineiro', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/availability/me/exceptions',
      headers,
      payload: { date: '2026-12-25', isAvailable: false, startTime: null, endTime: null, reason: 'Feriado' },
    });
    expect(created.statusCode).toBe(201);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/availability/me/exceptions/${created.json().id}`,
      headers,
    });
    expect(removed.statusCode).toBe(204);
  });
});
```

- [ ] **Step 5: Rodar, typecheck, lint, suíte completa**

Run: `cd backend && npx vitest run src/modules/availability && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: tudo verde, sem regressão.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/availability/ backend/src/app.ts
git commit -m "feat(availability): expoe rotas de slots e excecoes com testes de integracao"
```

---

## Task 10: Módulo `portfolio` — schemas + service

**Files:**
- Create: `backend/src/modules/portfolio/portfolio.schemas.ts`
- Create: `backend/src/modules/portfolio/portfolio.service.ts`
- Test: `backend/src/modules/portfolio/portfolio.service.test.ts`

**Interfaces:**
- Consumes: entidades `PortfolioItem`, `PortfolioImage`, `ProfessionalProfile`.
- Produces:
  ```ts
  class PortfolioService {
    constructor(deps: {
      profiles: Repository<ProfessionalProfile>;
      items: Repository<PortfolioItem>;
      images: Repository<PortfolioImage>;
    })
    createItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItemResponse>
    updateItem(userId: string, id: string, input: UpdatePortfolioItemInput): Promise<PortfolioItemResponse>
    removeItem(userId: string, id: string): Promise<void>
    listItems(professionalId: string): Promise<PortfolioItemResponse[]>
    addImage(userId: string, itemId: string, input: PortfolioImageInput): Promise<PortfolioImageResponse>
    removeImage(userId: string, imageId: string): Promise<void>
  }
  ```

- [ ] **Step 1: Escrever os schemas**

Create `backend/src/modules/portfolio/portfolio.schemas.ts`:

```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const portfolioItemSchema = z.object({
  categoryId: z.string().uuid().nullable().describe('Categoria relacionada').openapi({ example: null }),
  title: z.string().min(2).max(255).describe('Titulo do trabalho').openapi({ example: 'Reforma de banheiro' }),
  description: z.string().max(2000).nullable().describe('Descricao').openapi({ example: 'Troca completa de revestimento' }),
  completedAt: z.string().date().nullable().describe('Concluido em (YYYY-MM-DD)').openapi({ example: '2026-05-01' }),
});

export const updatePortfolioItemSchema = portfolioItemSchema.partial();

export const portfolioItemResponseSchema = portfolioItemSchema.extend({
  id: z.string().uuid().describe('ID do item').openapi({ example: '8b9c1111-1111-1111-1111-111111111111' }),
  images: z
    .array(
      z.object({
        id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
        imageUrl: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/img.jpg' }),
        position: z.number().int().describe('Posicao').openapi({ example: 0 }),
      }),
    )
    .describe('Imagens do item')
    .openapi({ example: [] }),
});

export const portfolioImageSchema = z.object({
  imageUrl: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/img.jpg' }),
  position: z.number().int().min(0).describe('Posicao de exibicao').openapi({ example: 0 }),
});

export const portfolioImageResponseSchema = portfolioImageSchema.extend({
  id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
export type PortfolioItemResponse = z.infer<typeof portfolioItemResponseSchema>;
export type PortfolioImageInput = z.infer<typeof portfolioImageSchema>;
export type PortfolioImageResponse = z.infer<typeof portfolioImageResponseSchema>;
```

- [ ] **Step 2: Escrever o teste falhando**

Create `backend/src/modules/portfolio/portfolio.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PortfolioService } from './portfolio.service';
import { mockRepo } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { PortfolioItem } from '../../infra/database/entities/portfolio-item.entity.js';
import type { PortfolioImage } from '../../infra/database/entities/portfolio-image.entity.js';

describe('PortfolioService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let items: ReturnType<typeof mockRepo<PortfolioItem>>;
  let images: ReturnType<typeof mockRepo<PortfolioImage>>;
  let service: PortfolioService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    items = mockRepo<PortfolioItem>();
    images = mockRepo<PortfolioImage>();
    service = new PortfolioService({ profiles, items, images });
  });

  it('cria item de portfolio', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.create.mockImplementation((v) => v as PortfolioItem);
    items.save.mockImplementation(async (v) => ({ id: 'item-1', ...v }) as PortfolioItem);

    const created = await service.createItem('user-1', {
      categoryId: null,
      title: 'Reforma',
      description: null,
      completedAt: null,
    });
    expect(created.id).toBe('item-1');
    expect(created.images).toEqual([]);
  });

  it('atualiza apenas campos enviados', async () => {
    items.findOne.mockResolvedValueOnce({
      id: 'item-1',
      professional_id: 'prof-1',
      category_id: null,
      title: 'Antigo',
      description: null,
      completed_at: null,
    } as PortfolioItem);
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.save.mockImplementation(async (v) => v as PortfolioItem);
    images.find.mockResolvedValue([]);

    const updated = await service.updateItem('user-1', 'item-1', { title: 'Novo titulo' });
    expect(updated.title).toBe('Novo titulo');
  });

  it('rejeita atualizar item de outro profissional', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValueOnce({ id: 'item-9', professional_id: 'prof-OUTRO' } as PortfolioItem);
    await expect(service.updateItem('user-1', 'item-9', { title: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('remove item proprio e rejeita de outro profissional', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValueOnce({ id: 'item-1', professional_id: 'prof-1' } as PortfolioItem);
    await service.removeItem('user-1', 'item-1');
    expect(items.delete).toHaveBeenCalledWith({ id: 'item-1' });

    items.findOne.mockResolvedValueOnce({ id: 'item-2', professional_id: 'prof-OUTRO' } as PortfolioItem);
    await expect(service.removeItem('user-1', 'item-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lista itens com imagens aninhadas', async () => {
    items.find.mockResolvedValue([
      { id: 'item-1', professional_id: 'prof-1', category_id: null, title: 'Reforma', description: null, completed_at: null } as PortfolioItem,
    ]);
    images.find.mockResolvedValue([{ id: 'img-1', portfolio_item_id: 'item-1', image_url: 'https://cdn.app/img.jpg', position: 0 } as PortfolioImage]);

    const list = await service.listItems('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0].images).toHaveLength(1);
    expect(list[0].images[0].imageUrl).toBe('https://cdn.app/img.jpg');
  });

  it('adiciona e remove imagem de um item proprio', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValue({ id: 'item-1', professional_id: 'prof-1' } as PortfolioItem);
    images.create.mockImplementation((v) => v as PortfolioImage);
    images.save.mockImplementation(async (v) => ({ id: 'img-1', ...v }) as PortfolioImage);

    const created = await service.addImage('user-1', 'item-1', { imageUrl: 'https://cdn.app/img.jpg', position: 0 });
    expect(created.id).toBe('img-1');

    images.findOne.mockResolvedValue({ id: 'img-1', portfolio_item_id: 'item-1' } as PortfolioImage);
    await service.removeImage('user-1', 'img-1');
    expect(images.delete).toHaveBeenCalledWith({ id: 'img-1' });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/portfolio/portfolio.service.test.ts`
Expected: FAIL — `Cannot find module './portfolio.service'`.

- [ ] **Step 4: Implementar o service**

Create `backend/src/modules/portfolio/portfolio.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { PortfolioItem } from '../../infra/database/entities/portfolio-item.entity.js';
import { PortfolioImage } from '../../infra/database/entities/portfolio-image.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  PortfolioItemInput,
  UpdatePortfolioItemInput,
  PortfolioItemResponse,
  PortfolioImageInput,
  PortfolioImageResponse,
} from './portfolio.schemas.js';

interface PortfolioServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  items: Repository<PortfolioItem>;
  images: Repository<PortfolioImage>;
}

export class PortfolioService {
  constructor(private readonly deps: PortfolioServiceDeps) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional não encontrado');
    return profile.id;
  }

  private async loadOwnedItem(userId: string, id: string): Promise<PortfolioItem> {
    const professionalId = await this.resolveProfileId(userId);
    const item = await this.deps.items.findOne({ where: { id } });
    if (!item || item.professional_id !== professionalId) {
      throw new NotFoundError('Item de portfolio não encontrado');
    }
    return item;
  }

  async createItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItemResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.items.save(
      this.deps.items.create({
        professional_id: professionalId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        completed_at: input.completedAt,
      }),
    );
    return this.toItem(saved, []);
  }

  async updateItem(userId: string, id: string, input: UpdatePortfolioItemInput): Promise<PortfolioItemResponse> {
    const item = await this.loadOwnedItem(userId, id);
    if (input.categoryId !== undefined) item.category_id = input.categoryId;
    if (input.title !== undefined) item.title = input.title;
    if (input.description !== undefined) item.description = input.description;
    if (input.completedAt !== undefined) item.completed_at = input.completedAt;
    const saved = await this.deps.items.save(item);
    const images = await this.deps.images.find({ where: { portfolio_item_id: saved.id } });
    return this.toItem(saved, images);
  }

  async removeItem(userId: string, id: string): Promise<void> {
    const item = await this.loadOwnedItem(userId, id);
    await this.deps.items.delete({ id: item.id });
  }

  async listItems(professionalId: string): Promise<PortfolioItemResponse[]> {
    const items = await this.deps.items.find({ where: { professional_id: professionalId }, order: { completed_at: 'DESC' } });
    if (!items.length) return [];
    const itemIds = items.map((item) => item.id);
    const allImages = await this.deps.images.find({ where: { portfolio_item_id: In(itemIds) } });
    return items.map((item) =>
      this.toItem(
        item,
        allImages.filter((image) => image.portfolio_item_id === item.id),
      ),
    );
  }

  async addImage(userId: string, itemId: string, input: PortfolioImageInput): Promise<PortfolioImageResponse> {
    await this.loadOwnedItem(userId, itemId);
    const saved = await this.deps.images.save(
      this.deps.images.create({
        portfolio_item_id: itemId,
        image_url: input.imageUrl,
        position: input.position,
      }),
    );
    return this.toImage(saved);
  }

  async removeImage(userId: string, imageId: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const image = await this.deps.images.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundError('Imagem não encontrada');
    const item = await this.deps.items.findOne({ where: { id: image.portfolio_item_id } });
    if (!item || item.professional_id !== professionalId) {
      throw new NotFoundError('Imagem não encontrada');
    }
    await this.deps.images.delete({ id: imageId });
  }

  private toItem(item: PortfolioItem, images: PortfolioImage[]): PortfolioItemResponse {
    return {
      id: item.id,
      categoryId: item.category_id,
      title: item.title,
      description: item.description,
      completedAt: item.completed_at,
      images: images
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((image) => this.toImage(image)),
    };
  }

  private toImage(image: PortfolioImage): PortfolioImageResponse {
    return { id: image.id, imageUrl: image.image_url, position: image.position };
  }
}
```

Add `import { In } from 'typeorm';` alongside the `type { Repository }` import at the top (used in `listItems`).

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/portfolio/portfolio.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/portfolio/portfolio.schemas.ts backend/src/modules/portfolio/portfolio.service.ts backend/src/modules/portfolio/portfolio.service.test.ts
git commit -m "feat(portfolio): implementa itens e imagens de portfolio"
```

---

## Task 11: Módulo `portfolio` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/portfolio/portfolio.controller.ts`
- Create: `backend/src/modules/portfolio/portfolio.routes.ts`
- Test: `backend/src/modules/portfolio/portfolio.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `PortfolioService` (Task 10).
- Produces: `POST/GET /api/portfolio/me/items`, `PATCH/DELETE /api/portfolio/me/items/:id`, `GET /api/portfolio/:professionalId/items` (público), `POST /api/portfolio/me/items/:id/images`, `DELETE /api/portfolio/me/images/:id`.

- [ ] **Step 1: Escrever o controller**

Create `backend/src/modules/portfolio/portfolio.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PortfolioService } from './portfolio.service.js';
import type { PortfolioItemInput, UpdatePortfolioItemInput, PortfolioImageInput } from './portfolio.schemas.js';

export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  createItem = async (req: FastifyRequest<{ Body: PortfolioItemInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.createItem(req.user!.id, req.body));

  updateItem = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdatePortfolioItemInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.updateItem(req.user!.id, req.params.id, req.body));

  removeItem = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeItem(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listItems = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listItems(req.params.professionalId));

  addImage = async (
    req: FastifyRequest<{ Params: { id: string }; Body: PortfolioImageInput }>,
    reply: FastifyReply,
  ) => reply.status(201).send(await this.service.addImage(req.user!.id, req.params.id, req.body));

  removeImage = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeImage(req.user!.id, req.params.id);
    return reply.status(204).send();
  };
}
```

- [ ] **Step 2: Escrever as rotas**

Create `backend/src/modules/portfolio/portfolio.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { PortfolioService } from './portfolio.service.js';
import { PortfolioController } from './portfolio.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { PortfolioItem } from '../../infra/database/entities/portfolio-item.entity.js';
import { PortfolioImage } from '../../infra/database/entities/portfolio-image.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  portfolioItemSchema,
  updatePortfolioItemSchema,
  portfolioItemResponseSchema,
  portfolioImageSchema,
  portfolioImageResponseSchema,
} from './portfolio.schemas.js';

const professionalIdParamSchema = z.object({
  professionalId: z.string().uuid().describe('ID do perfil profissional').openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
});

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  const service = new PortfolioService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    items: app.dataSource.getRepository(PortfolioItem),
    images: app.dataSource.getRepository(PortfolioImage),
  });
  const controller = new PortfolioController(service);
  const guard = [app.authenticate, requireRole('professional')];

  app.post('/portfolio/me/items', {
    onRequest: guard,
    schema: {
      tags: ['portfolio'],
      summary: 'Cria item de portfolio',
      body: portfolioItemSchema,
      response: { 201: portfolioItemResponseSchema },
    },
    handler: controller.createItem,
  });

  app.patch('/portfolio/me/items/:id', {
    onRequest: guard,
    schema: {
      tags: ['portfolio'],
      summary: 'Atualiza item de portfolio',
      params: idParamSchema,
      body: updatePortfolioItemSchema,
      response: { 200: portfolioItemResponseSchema },
    },
    handler: controller.updateItem,
  });

  app.delete('/portfolio/me/items/:id', {
    onRequest: guard,
    schema: { tags: ['portfolio'], summary: 'Remove item de portfolio', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeItem,
  });

  app.get('/portfolio/:professionalId/items', {
    schema: {
      tags: ['portfolio'],
      summary: 'Lista itens publicos de portfolio',
      params: professionalIdParamSchema,
      response: { 200: z.array(portfolioItemResponseSchema) },
    },
    handler: controller.listItems,
  });

  app.post('/portfolio/me/items/:id/images', {
    onRequest: guard,
    schema: {
      tags: ['portfolio'],
      summary: 'Adiciona imagem a um item',
      params: idParamSchema,
      body: portfolioImageSchema,
      response: { 201: portfolioImageResponseSchema },
    },
    handler: controller.addImage,
  });

  app.delete('/portfolio/me/images/:id', {
    onRequest: guard,
    schema: { tags: ['portfolio'], summary: 'Remove imagem', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeImage,
  });
}
```

- [ ] **Step 3: Registrar em app.ts**

Add `import { portfolioRoutes } from './modules/portfolio/portfolio.routes.js';` and `await app.register(portfolioRoutes, { prefix: '/api' });`.

- [ ] **Step 4: Escrever teste de integração**

Create `backend/src/modules/portfolio/portfolio.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

async function professionalHeader(app: FastifyInstance) {
  const email = `port-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Pro', email, phone, password: 'S3nh@Forte', role: 'professional' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('portfolio routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria item, adiciona imagem e le publicamente com imagens aninhadas', async () => {
    const headers = await professionalHeader(app);
    const profile = await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Marceneiro', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const professionalId = profile.json().id;

    const item = await app.inject({
      method: 'POST',
      url: '/api/portfolio/me/items',
      headers,
      payload: { categoryId: null, title: 'Movel planejado', description: null, completedAt: null },
    });
    expect(item.statusCode).toBe(201);

    const image = await app.inject({
      method: 'POST',
      url: `/api/portfolio/me/items/${item.json().id}/images`,
      headers,
      payload: { imageUrl: 'https://cdn.app/img.jpg', position: 0 },
    });
    expect(image.statusCode).toBe(201);

    const publicList = await app.inject({ method: 'GET', url: `/api/portfolio/${professionalId}/items` });
    expect(publicList.statusCode).toBe(200);
    expect(publicList.json()[0].images).toHaveLength(1);
  });

  it('rejeita atualizar item de outro profissional com 404', async () => {
    const headerA = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: headerA,
      payload: { headline: 'A', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const item = await app.inject({
      method: 'POST',
      url: '/api/portfolio/me/items',
      headers: headerA,
      payload: { categoryId: null, title: 'Item A', description: null, completedAt: null },
    });

    const headerB = await professionalHeader(app);
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers: headerB,
      payload: { headline: 'B', bio: null, yearsExperience: null, hourlyRate: null, serviceRadiusKm: null },
    });
    const attempt = await app.inject({
      method: 'PATCH',
      url: `/api/portfolio/me/items/${item.json().id}`,
      headers: headerB,
      payload: { title: 'Tentativa invasora' },
    });
    expect(attempt.statusCode).toBe(404);
  });
});
```

- [ ] **Step 5: Rodar, typecheck, lint, suíte completa**

Run: `cd backend && npx vitest run src/modules/portfolio && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: tudo verde, sem regressão.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/portfolio/ backend/src/app.ts
git commit -m "feat(portfolio): expoe rotas de itens e imagens com testes de integracao"
```

---

## Task 12: Módulo `search` — busca pública de profissionais

**Files:**
- Create: `backend/src/modules/search/search.schemas.ts`
- Create: `backend/src/modules/search/search.service.ts`
- Create: `backend/src/modules/search/search.controller.ts`
- Create: `backend/src/modules/search/search.routes.ts`
- Test: `backend/src/modules/search/search.service.test.ts`
- Test: `backend/src/modules/search/search.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `ProfessionalProfile`, `ProfessionalCategory`, `ProfessionalServiceArea` repos; `paginationQuerySchema`, `paginatedResponse` de `../../shared/schemas.js`.
- Produces:
  ```ts
  class SearchService {
    constructor(deps: {
      profiles: Repository<ProfessionalProfile>;
      categoryLinks: Repository<ProfessionalCategory>;
      serviceAreas: Repository<ProfessionalServiceArea>;
    })
    searchProfessionals(query: SearchQuery): Promise<{ items: SearchResultItem[]; page: number; limit: number; total: number }>
  }
  ```
  Rota: `GET /api/search/professionals?categoryId=&city=&state=&q=&page=&limit=`.

- [ ] **Step 1: Escrever os schemas**

Create `backend/src/modules/search/search.schemas.ts`:

```ts
import { z } from 'zod';
import 'zod-openapi/extend';
import { paginationQuerySchema } from '../../shared/schemas.js';

export const searchQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional().describe('Filtrar por categoria').openapi({ example: undefined }),
  city: z.string().min(2).max(128).optional().describe('Filtrar por cidade').openapi({ example: 'Porto Alegre' }),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional()
    .describe('Filtrar por UF')
    .openapi({ example: 'RS' }),
  q: z.string().min(2).max(120).optional().describe('Busca textual no titulo/bio').openapi({ example: 'eletricista' }),
});

export const searchResultItemSchema = z.object({
  id: z.string().uuid().describe('ID do perfil profissional').openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  headline: z.string().describe('Titulo').openapi({ example: 'Eletricista residencial' }),
  bio: z.string().nullable().describe('Biografia').openapi({ example: null }),
  hourlyRate: z.number().nullable().describe('Valor por hora').openapi({ example: 120 }),
  ratingAverage: z.number().describe('Media de avaliacoes').openapi({ example: 4.8 }),
  ratingCount: z.number().int().describe('Total de avaliacoes').openapi({ example: 42 }),
  isAvailable: z.boolean().describe('Disponivel').openapi({ example: true }),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
```

- [ ] **Step 2: Escrever o teste falhando do service**

Create `backend/src/modules/search/search.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchService } from './search.service';
import { mockRepo, mockQueryBuilder } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import type { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';

describe('SearchService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let categoryLinks: ReturnType<typeof mockRepo<ProfessionalCategory>>;
  let serviceAreas: ReturnType<typeof mockRepo<ProfessionalServiceArea>>;
  let service: SearchService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    categoryLinks = mockRepo<ProfessionalCategory>();
    serviceAreas = mockRepo<ProfessionalServiceArea>();
    service = new SearchService({ profiles, categoryLinks, serviceAreas });
  });

  it('busca profissionais paginados sem filtros', async () => {
    const qb = mockQueryBuilder<ProfessionalProfile>();
    qb.getManyAndCount.mockResolvedValue([
      [{ id: 'prof-1', headline: 'Eletricista', bio: null, hourly_rate: '120.00', rating_average: '4.80', rating_count: 3, is_available: true }],
      1,
    ]);
    profiles.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchProfessionals({ page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0].hourlyRate).toBe(120);
    expect(result.items[0].ratingAverage).toBe(4.8);
  });

  it('aplica filtro de categoria, cidade, uf e texto', async () => {
    const qb = mockQueryBuilder<ProfessionalProfile>();
    qb.getManyAndCount.mockResolvedValue([[], 0]);
    profiles.createQueryBuilder.mockReturnValue(qb);

    await service.searchProfessionals({
      page: 1,
      limit: 20,
      categoryId: 'cat-1',
      city: 'Porto Alegre',
      state: 'RS',
      q: 'eletric',
    });

    expect(qb.andWhere).toHaveBeenCalled();
  });
});
```

If `backend/src/test/mocks/index.ts` does not export a `mockQueryBuilder` helper, read `backend/src/test/mocks/repo.ts` to confirm — if it's genuinely absent, add one there following the same pattern as `mockRepo`, exporting a `vi.fn()`-based chainable object with `where/andWhere/orderBy/skip/take/getManyAndCount` all returning `this` (except `getManyAndCount`, which returns a `vi.fn()` to be mocked per test), and export it from `backend/src/test/mocks/index.ts`. Check first — Tasks 1-11 never needed `createQueryBuilder`, so this may be the first module requiring it.

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/search/search.service.test.ts`
Expected: FAIL — `Cannot find module './search.service'`.

- [ ] **Step 4: Implementar o service**

Create `backend/src/modules/search/search.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import type { SearchQuery, SearchResultItem } from './search.schemas.js';

interface SearchServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  categoryLinks: Repository<ProfessionalCategory>;
  serviceAreas: Repository<ProfessionalServiceArea>;
}

export interface SearchResult {
  items: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}

export class SearchService {
  constructor(private readonly deps: SearchServiceDeps) {}

  async searchProfessionals(query: SearchQuery): Promise<SearchResult> {
    const qb = this.deps.profiles
      .createQueryBuilder('profile')
      .where('profile.is_available = :available', { available: true });

    if (query.categoryId) {
      qb.innerJoin(
        ProfessionalCategory,
        'category_link',
        'category_link.professional_id = profile.id AND category_link.category_id = :categoryId',
        { categoryId: query.categoryId },
      );
    }

    if (query.city && query.state) {
      qb.innerJoin(
        ProfessionalServiceArea,
        'area',
        'area.professional_id = profile.id AND area.city = :city AND area.state = :state',
        { city: query.city, state: query.state },
      );
    }

    if (query.q) {
      qb.andWhere('(profile.headline LIKE :q OR profile.bio LIKE :q)', { q: `%${query.q}%` });
    }

    qb.orderBy('profile.rating_average', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((row) => this.toResultItem(row)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  private toResultItem(profile: ProfessionalProfile): SearchResultItem {
    return {
      id: profile.id,
      headline: profile.headline,
      bio: profile.bio,
      hourlyRate: profile.hourly_rate === null ? null : Number(profile.hourly_rate),
      ratingAverage: Number(profile.rating_average),
      ratingCount: profile.rating_count,
      isAvailable: profile.is_available,
    };
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/search/search.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Controller + rotas**

Create `backend/src/modules/search/search.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SearchService } from './search.service.js';
import type { SearchQuery } from './search.schemas.js';

export class SearchController {
  constructor(private readonly service: SearchService) {}

  searchProfessionals = async (req: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) =>
    reply.send(await this.service.searchProfessionals(req.query));
}
```

Create `backend/src/modules/search/search.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import { paginatedResponse } from '../../shared/schemas.js';
import { searchQuerySchema, searchResultItemSchema } from './search.schemas.js';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  const service = new SearchService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    categoryLinks: app.dataSource.getRepository(ProfessionalCategory),
    serviceAreas: app.dataSource.getRepository(ProfessionalServiceArea),
  });
  const controller = new SearchController(service);

  app.get('/search/professionals', {
    schema: {
      tags: ['search'],
      summary: 'Busca publica de profissionais',
      querystring: searchQuerySchema,
      response: { 200: paginatedResponse(searchResultItemSchema) },
    },
    handler: controller.searchProfessionals,
  });
}
```

- [ ] **Step 7: Registrar em app.ts**

Add `import { searchRoutes } from './modules/search/search.routes.js';` and `await app.register(searchRoutes, { prefix: '/api' });`.

- [ ] **Step 8: Teste de integração**

Create `backend/src/modules/search/search.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';

describe('search routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app.close();
  });

  it('busca profissionais publicamente sem autenticacao', async () => {
    const email = `search-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Pro', email, phone: `+55519${Math.floor(10000000 + Math.random() * 89999999)}`, password: 'S3nh@Forte', role: 'professional' },
    });
    const headers = { authorization: `Bearer ${register.json().accessToken}` };
    await app.inject({
      method: 'PUT',
      url: '/api/professionals/me',
      headers,
      payload: { headline: 'Pedreiro experiente', bio: null, yearsExperience: null, hourlyRate: 80, serviceRadiusKm: null },
    });

    const res = await app.inject({ method: 'GET', url: '/api/search/professionals?q=pedreiro' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBeGreaterThan(0);
    expect(res.json().items[0].headline).toContain('Pedreiro');
  });

  it('pagina resultados respeitando limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/search/professionals?page=1&limit=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().limit).toBe(1);
    expect(res.json().items.length).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 9: Rodar, typecheck, lint, suíte completa**

Run: `cd backend && npx vitest run src/modules/search && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: tudo verde, sem regressão.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/search/ backend/src/app.ts backend/src/test/mocks/
git commit -m "feat(search): adiciona busca publica de profissionais com paginacao"
```

---

## Task 13: Frontend feature `professional` — schemas/api/queries + formulário de perfil

**Files:**
- Create: `frontend/src/features/professional/schemas.ts`
- Create: `frontend/src/features/professional/api.ts`
- Create: `frontend/src/features/professional/queries.ts`
- Create: `frontend/src/features/professional/components/ProfileForm.tsx`
- Create: `frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx`
- Test: `frontend/src/features/professional/professional.test.tsx`

**Interfaces:**
- Consumes: `http` de `../../lib/http` (axios, baseURL `/api`); `useAuthStore` de `../../stores/auth`; padrões já revisados em `features/settings/` (Task 13 da fase 7) para api/queries house style.
- Produces: `professionalApi = { getMyProfile, upsertProfile, listPublicCategories, listPublicTags, setCategories, setTags }`, hooks `useMyProfile`, `useUpsertProfile`, `useCategories`, `useTags`, `useSetCategories`, `useSetTags`; componente `ProfileForm`; página `ProfessionalDashboardPage`.

Antes de escrever qualquer código, leia `frontend/src/features/settings/{schemas,api,queries}.ts` e `frontend/src/features/settings/pages/SettingsPage.tsx` (já implementados e revisados na fase 7) como referência de estilo real deste frontend, e leia `backend/src/modules/professional/professional.schemas.ts` e `backend/src/modules/catalog/catalog.schemas.ts` (reais, já mesclados) para confirmar os nomes exatos de campo do contrato (`headline`, `bio`, `yearsExperience`, `hourlyRate`, `serviceRadiusKm`, `ratingAverage`, `ratingCount`, `isAvailable`, `verifiedAt`, `createdAt`, `userId`).

- [ ] **Step 1: Escrever schemas**

Create `frontend/src/features/professional/schemas.ts`:

```ts
import { z } from 'zod';

export const profileFormSchema = z.object({
  headline: z.string().min(5, 'Minimo 5 caracteres').max(255),
  bio: z.string().max(4000).nullable(),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  hourlyRate: z.number().nonnegative().nullable(),
  serviceRadiusKm: z.number().int().min(0).max(1000).nullable(),
});

export type ProfileForm = z.infer<typeof profileFormSchema>;
```

- [ ] **Step 2: Escrever api**

Create `frontend/src/features/professional/api.ts`:

```ts
import { http } from '../../lib/http';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  headline: string;
  bio: string | null;
  yearsExperience: number | null;
  hourlyRate: number | null;
  serviceRadiusKm: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CategoryOption {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
}

export interface TagOption {
  id: string;
  name: string;
  slug: string;
}

export const professionalApi = {
  async getMyProfile(): Promise<ProfessionalProfile> {
    const { data } = await http.get<ProfessionalProfile>('/professionals/me');
    return data;
  },
  async upsertProfile(payload: {
    headline: string;
    bio: string | null;
    yearsExperience: number | null;
    hourlyRate: number | null;
    serviceRadiusKm: number | null;
  }): Promise<ProfessionalProfile> {
    const { data } = await http.put<ProfessionalProfile>('/professionals/me', payload);
    return data;
  },
  async listPublicCategories(): Promise<CategoryOption[]> {
    const { data } = await http.get<CategoryOption[]>('/categories');
    return data;
  },
  async listPublicTags(): Promise<TagOption[]> {
    const { data } = await http.get<TagOption[]>('/tags');
    return data;
  },
  async setCategories(ids: string[]): Promise<void> {
    await http.put('/professionals/me/categories', { ids });
  },
  async setTags(ids: string[]): Promise<void> {
    await http.put('/professionals/me/tags', { ids });
  },
};
```

- [ ] **Step 3: Escrever queries**

Create `frontend/src/features/professional/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { professionalApi } from './api';

const keys = {
  myProfile: ['professional', 'me'] as const,
  categories: ['catalog', 'categories'] as const,
  tags: ['catalog', 'tags'] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: keys.myProfile, queryFn: professionalApi.getMyProfile, retry: false });
}

export function useUpsertProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.upsertProfile,
    onSuccess: (data) => client.setQueryData(keys.myProfile, data),
  });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: professionalApi.listPublicCategories });
}

export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: professionalApi.listPublicTags });
}

export function useSetCategories() {
  return useMutation({ mutationFn: professionalApi.setCategories });
}

export function useSetTags() {
  return useMutation({ mutationFn: professionalApi.setTags });
}
```

- [ ] **Step 4: Escrever ProfileForm**

Create `frontend/src/features/professional/components/ProfileForm.tsx`:

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileForm as FormValues } from '../schemas';
import { useMyProfile, useUpsertProfile } from '../queries';

export function ProfileForm() {
  const { data } = useMyProfile();
  const upsert = useUpsertProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (data) {
      reset({
        headline: data.headline,
        bio: data.bio,
        yearsExperience: data.yearsExperience,
        hourlyRate: data.hourlyRate,
        serviceRadiusKm: data.serviceRadiusKm,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => upsert.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Perfil profissional</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span>Titulo</span>
        <input className="rounded border px-3 py-2" {...register('headline')} />
        {errors.headline ? <span className="text-xs text-red-600">{errors.headline.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Biografia</span>
        <textarea className="rounded border px-3 py-2" {...register('bio')} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Anos de experiencia</span>
        <input type="number" className="rounded border px-3 py-2" {...register('yearsExperience', { valueAsNumber: true })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Valor por hora (R$)</span>
        <input type="number" className="rounded border px-3 py-2" {...register('hourlyRate', { valueAsNumber: true })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Raio de atendimento (km)</span>
        <input type="number" className="rounded border px-3 py-2" {...register('serviceRadiusKm', { valueAsNumber: true })} />
      </label>
      {upsert.isError ? <p className="text-sm text-red-600">Nao foi possivel salvar o perfil</p> : null}
      <button type="submit" disabled={upsert.isPending} className="rounded bg-slate-900 py-2 text-white disabled:opacity-50">
        {upsert.isPending ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </form>
  );
}
```

Note: `register('yearsExperience', { valueAsNumber: true })` produces `NaN` when the input is cleared to empty string, not `null` — before shipping, decide (and implement) how empty fields map back to `null` for the nullable numeric inputs (`yearsExperience`, `hourlyRate`, `serviceRadiusKm`), e.g. a `setValueAs` transform (`setValueAs: (v) => (v === '' ? null : Number(v))`) on each `register` call, since the backend schema requires `null` (not `NaN`/`undefined`) for an empty optional numeric field. Verify this with a real test in Step 6 before considering the task done.

- [ ] **Step 5: Escrever página do dashboard**

Create `frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx`:

```tsx
import { ProfileForm } from '../components/ProfileForm';

export default function ProfessionalDashboardPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Area do profissional</h1>
      <ProfileForm />
    </div>
  );
}
```

- [ ] **Step 6: Escrever teste falhando e ajustar o form até passar**

Create `frontend/src/features/professional/professional.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileForm } from './components/ProfileForm';
import { professionalApi } from './api';

vi.mock('./api', () => ({
  professionalApi: { getMyProfile: vi.fn(), upsertProfile: vi.fn() },
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileForm />
    </QueryClientProvider>,
  );
}

describe('ProfileForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega perfil existente e envia atualizacao com campos numericos vazios como null', async () => {
    vi.mocked(professionalApi.getMyProfile).mockResolvedValue({
      id: 'p1', userId: 'u1', headline: 'Antigo', bio: null, yearsExperience: 5,
      hourlyRate: 100, serviceRadiusKm: 20, ratingAverage: 0, ratingCount: 0,
      isAvailable: true, verifiedAt: null, createdAt: '2026-07-01T00:00:00Z',
    });
    vi.mocked(professionalApi.upsertProfile).mockResolvedValue({
      id: 'p1', userId: 'u1', headline: 'Novo titulo', bio: null, yearsExperience: null,
      hourlyRate: null, serviceRadiusKm: 20, ratingAverage: 0, ratingCount: 0,
      isAvailable: true, verifiedAt: null, createdAt: '2026-07-01T00:00:00Z',
    });

    renderForm();
    const headline = await screen.findByDisplayValue('Antigo');
    fireEvent.change(headline, { target: { value: 'Novo titulo' } });
    fireEvent.change(screen.getByLabelText(/anos de experiencia/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/valor por hora/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() =>
      expect(professionalApi.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({ headline: 'Novo titulo', yearsExperience: null, hourlyRate: null }),
      ),
    );
  });
});
```

Run: `cd frontend && npx vitest run src/features/professional/professional.test.tsx` — if it fails because `yearsExperience`/`hourlyRate` come through as `NaN` instead of `null`, fix `ProfileForm.tsx`'s `register(...)` calls with the `setValueAs` transform described in Step 4's note, then re-run until green.

- [ ] **Step 7: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/professional/schemas.ts frontend/src/features/professional/api.ts frontend/src/features/professional/queries.ts frontend/src/features/professional/components/ProfileForm.tsx frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx frontend/src/features/professional/professional.test.tsx
git commit -m "feat(professional-web): adiciona formulario de perfil profissional"
```

---

## Task 14: Frontend feature `professional` — portfolio, disponibilidade, áreas e perfil público

**Files:**
- Create: `frontend/src/features/professional/components/PortfolioManager.tsx`
- Create: `frontend/src/features/professional/components/AvailabilityManager.tsx`
- Create: `frontend/src/features/professional/components/ServiceAreaManager.tsx`
- Create: `frontend/src/features/professional/components/ProfessionalCard.tsx`
- Create: `frontend/src/features/professional/pages/PublicProfilePage.tsx`
- Modify: `frontend/src/features/professional/api.ts` (adicionar chamadas de portfolio/availability/service-area/public profile)
- Modify: `frontend/src/features/professional/queries.ts` (adicionar hooks correspondentes)
- Modify: `frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx` (compor os novos managers)
- Modify: `frontend/src/router/index.tsx` (rota protegida `/professional/dashboard` e rota pública `/professionals/:id`)

**Interfaces:**
- Consumes: `backend/src/modules/portfolio/portfolio.schemas.ts`, `backend/src/modules/availability/availability.schemas.ts`, `backend/src/modules/professional/professional.schemas.ts` (`publicProfileSchema`) — todos reais, já mesclados nas Tasks 8-11 — para os nomes exatos de campo.
- Produces: `professionalApi` ganha `listPortfolio(professionalId)`, `createPortfolioItem`, `removePortfolioItem`, `addPortfolioImage`, `removePortfolioImage`, `listSlots(professionalId)`, `addSlot`, `removeSlot`, `listServiceAreas` (via perfil público, não há endpoint próprio de listagem "minhas áreas" — reaproveitar `getPublicProfile` para exibir as áreas já cadastradas, e `addServiceArea`/`removeServiceArea` para editar), `getPublicProfile(id)`.

- [ ] **Step 1: Estender api.ts**

Add to `frontend/src/features/professional/api.ts` (mantendo as interfaces/exports já existentes da Task 13):

```ts
export interface PortfolioImage {
  id: string;
  imageUrl: string;
  position: number;
}

export interface PortfolioItem {
  id: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  completedAt: string | null;
  images: PortfolioImage[];
}

export interface AvailabilitySlot {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ServiceArea {
  id: string;
  city: string;
  state: string;
  radiusKm: number | null;
}

export interface PublicProfile extends ProfessionalProfile {
  categories: { id: string; name: string; slug: string }[];
  experiences: unknown[];
  education: unknown[];
  certifications: unknown[];
  serviceAreas: ServiceArea[];
}
```

And extend the `professionalApi` object (add these keys alongside the existing ones from Task 13, don't remove them):

```ts
  async getPublicProfile(id: string): Promise<PublicProfile> {
    const { data } = await http.get<PublicProfile>(`/professionals/${id}`);
    return data;
  },
  async listPortfolio(professionalId: string): Promise<PortfolioItem[]> {
    const { data } = await http.get<PortfolioItem[]>(`/portfolio/${professionalId}/items`);
    return data;
  },
  async createPortfolioItem(payload: { categoryId: string | null; title: string; description: string | null; completedAt: string | null }): Promise<PortfolioItem> {
    const { data } = await http.post<PortfolioItem>('/portfolio/me/items', payload);
    return data;
  },
  async removePortfolioItem(id: string): Promise<void> {
    await http.delete(`/portfolio/me/items/${id}`);
  },
  async addPortfolioImage(itemId: string, payload: { imageUrl: string; position: number }): Promise<PortfolioImage> {
    const { data } = await http.post<PortfolioImage>(`/portfolio/me/items/${itemId}/images`, payload);
    return data;
  },
  async removePortfolioImage(id: string): Promise<void> {
    await http.delete(`/portfolio/me/images/${id}`);
  },
  async listSlots(professionalId: string): Promise<AvailabilitySlot[]> {
    const { data } = await http.get<AvailabilitySlot[]>(`/availability/${professionalId}/slots`);
    return data;
  },
  async addSlot(payload: { weekday: number; startTime: string; endTime: string }): Promise<AvailabilitySlot> {
    const { data } = await http.post<AvailabilitySlot>('/availability/me/slots', payload);
    return data;
  },
  async removeSlot(id: string): Promise<void> {
    await http.delete(`/availability/me/slots/${id}`);
  },
  async addServiceArea(payload: { city: string; state: string; radiusKm: number | null }): Promise<ServiceArea> {
    const { data } = await http.post<ServiceArea>('/professionals/me/service-areas', payload);
    return data;
  },
  async removeServiceArea(id: string): Promise<void> {
    await http.delete(`/professionals/me/service-areas/${id}`);
  },
```

- [ ] **Step 2: Estender queries.ts**

Add to `frontend/src/features/professional/queries.ts`:

```ts
export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'public', id],
    queryFn: () => professionalApi.getPublicProfile(id as string),
    enabled: Boolean(id),
  });
}

export function usePortfolio(professionalId: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'portfolio', professionalId],
    queryFn: () => professionalApi.listPortfolio(professionalId as string),
    enabled: Boolean(professionalId),
  });
}

export function useCreatePortfolioItem(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.createPortfolioItem,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useRemovePortfolioItem(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removePortfolioItem,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useSlots(professionalId: string | undefined) {
  return useQuery({
    queryKey: ['professional', 'slots', professionalId],
    queryFn: () => professionalApi.listSlots(professionalId as string),
    enabled: Boolean(professionalId),
  });
}

export function useAddSlot(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.addSlot,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'slots', professionalId] }),
  });
}

export function useRemoveSlot(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removeSlot,
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'slots', professionalId] }),
  });
}

export function useAddServiceArea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.addServiceArea,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.myProfile }),
  });
}

export function useRemoveServiceArea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: professionalApi.removeServiceArea,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.myProfile }),
  });
}
```

`useMyProfile` (Task 13) returns `ProfileResponse`, which has no `id` usable as `professionalId` param name collision — it does have `id`. Use `data?.id` from `useMyProfile()` as the `professionalId` argument when composing `PortfolioManager`/`AvailabilityManager` in the dashboard (Step 6 below), since the dashboard operates on "my own" profile.

- [ ] **Step 3: PortfolioManager**

Create `frontend/src/features/professional/components/PortfolioManager.tsx`:

```tsx
import { useState } from 'react';
import { usePortfolio, useCreatePortfolioItem, useRemovePortfolioItem } from '../queries';

export function PortfolioManager({ professionalId }: { professionalId: string | undefined }) {
  const { data } = usePortfolio(professionalId);
  const create = useCreatePortfolioItem(professionalId);
  const remove = useRemovePortfolioItem(professionalId);
  const [title, setTitle] = useState('');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Portfolio</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Titulo do trabalho"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          disabled={!title || create.isPending}
          onClick={() => {
            create.mutate({ categoryId: null, title, description: null, completedAt: null });
            setTitle('');
          }}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>{item.title}</span>
            <button type="button" onClick={() => remove.mutate(item.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: AvailabilityManager**

Create `frontend/src/features/professional/components/AvailabilityManager.tsx`:

```tsx
import { useState } from 'react';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export function AvailabilityManager({ professionalId }: { professionalId: string | undefined }) {
  const { data } = useSlots(professionalId);
  const addSlot = useAddSlot(professionalId);
  const removeSlot = useRemoveSlot(professionalId);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Disponibilidade</h2>
      <div className="flex gap-2">
        <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="rounded border px-2 py-1">
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded border px-2 py-1" />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded border px-2 py-1" />
        <button
          type="button"
          disabled={addSlot.isPending}
          onClick={() => addSlot.mutate({ weekday, startTime, endTime })}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>{WEEKDAYS[slot.weekday]} {slot.startTime}-{slot.endTime}</span>
            <button type="button" onClick={() => removeSlot.mutate(slot.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: ServiceAreaManager e ProfessionalCard**

Create `frontend/src/features/professional/components/ServiceAreaManager.tsx`:

```tsx
import { useState } from 'react';
import { useMyProfile, useAddServiceArea, useRemoveServiceArea, usePublicProfile } from '../queries';

export function ServiceAreaManager() {
  const { data: profile } = useMyProfile();
  const { data: publicProfile } = usePublicProfile(profile?.id);
  const addArea = useAddServiceArea();
  const removeArea = useRemoveServiceArea();
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Areas de atendimento</h2>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="w-16 rounded border px-3 py-2" placeholder="UF" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
        <button
          type="button"
          disabled={!city || state.length !== 2 || addArea.isPending}
          onClick={() => addArea.mutate({ city, state, radiusKm: null })}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {publicProfile?.serviceAreas.map((area) => (
          <li key={area.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>{area.city} - {area.state}</span>
            <button type="button" onClick={() => removeArea.mutate(area.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `frontend/src/features/professional/components/ProfessionalCard.tsx`:

```tsx
import { Link } from 'react-router-dom';

interface ProfessionalCardProps {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
}

export function ProfessionalCard({ id, headline, bio, hourlyRate, ratingAverage, ratingCount }: ProfessionalCardProps) {
  return (
    <Link to={`/professionals/${id}`} className="flex flex-col gap-1 rounded border p-4 hover:border-slate-400">
      <h3 className="font-semibold">{headline}</h3>
      {bio ? <p className="text-sm text-slate-600">{bio}</p> : null}
      <div className="flex justify-between text-sm text-slate-500">
        <span>{hourlyRate !== null ? `R$ ${hourlyRate}/h` : 'Sob consulta'}</span>
        <span>{ratingAverage.toFixed(1)} ({ratingCount})</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 6: PublicProfilePage e composição do dashboard**

Create `frontend/src/features/professional/pages/PublicProfilePage.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { usePublicProfile, usePortfolio } from '../queries';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading, isError } = usePublicProfile(id);
  const { data: portfolio } = usePortfolio(id);

  if (isLoading) return <p className="p-6">Carregando...</p>;
  if (isError || !profile) return <p className="p-6">Perfil nao encontrado.</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{profile.headline}</h1>
      {profile.bio ? <p>{profile.bio}</p> : null}
      <p className="text-sm text-slate-500">
        {profile.ratingAverage.toFixed(1)} ({profile.ratingCount} avaliacoes)
      </p>
      <section>
        <h2 className="text-lg font-semibold">Areas de atendimento</h2>
        <ul>
          {profile.serviceAreas.map((area) => (
            <li key={area.id}>{area.city} - {area.state}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <ul className="flex flex-col gap-2">
          {portfolio?.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

Modify `frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx` to compose the new managers:

```tsx
import { ProfileForm } from '../components/ProfileForm';
import { PortfolioManager } from '../components/PortfolioManager';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { ServiceAreaManager } from '../components/ServiceAreaManager';
import { useMyProfile } from '../queries';

export default function ProfessionalDashboardPage() {
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Area do profissional</h1>
      <ProfileForm />
      <PortfolioManager professionalId={profile?.id} />
      <AvailabilityManager professionalId={profile?.id} />
      <ServiceAreaManager />
    </div>
  );
}
```

- [ ] **Step 7: Registrar rotas**

In `frontend/src/router/index.tsx`, import `PublicProfilePage` and `ProfessionalDashboardPage`, add `{ path: '/professionals/:id', element: <PublicProfilePage /> }` as a public sibling route (outside `ProtectedRoute`), and add `{ path: '/professional/dashboard', element: <ProfessionalDashboardPage /> }` inside the existing `ProtectedRoute` children array (alongside `/settings`).

- [ ] **Step 8: Rodar testes, typecheck, lint**

Run: `cd frontend && npx vitest run src/features/professional && npm run typecheck && npm run lint`
Expected: sem erros. Se `professional.test.tsx` (Task 13) quebrar por causa das novas chamadas em `ProfessionalDashboardPage`, ajuste o teste (ele renderiza `ProfileForm` isoladamente, não a página inteira, então não deve ser afetado — confirme lendo o teste antes de mexer).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/professional/ frontend/src/router/index.tsx
git commit -m "feat(professional-web): adiciona portfolio, disponibilidade, areas e perfil publico"
```

---

## Task 15: Frontend feature `landing` — busca pública e página inicial

**Files:**
- Create: `frontend/src/features/landing/schemas.ts`
- Create: `frontend/src/features/landing/api.ts`
- Create: `frontend/src/features/landing/queries.ts`
- Create: `frontend/src/features/landing/components/SearchBar.tsx`
- Create: `frontend/src/features/landing/components/CategoryGrid.tsx`
- Create: `frontend/src/features/landing/components/ProfessionalResults.tsx`
- Create: `frontend/src/features/landing/pages/LandingPage.tsx`
- Create: `frontend/src/features/landing/pages/SearchPage.tsx`
- Test: `frontend/src/features/landing/landing.test.tsx`
- Modify: `frontend/src/router/index.tsx` (rota pública `/` e `/search`)

**Interfaces:**
- Consumes: `professionalApi.listPublicCategories` (Task 13, reaproveitar em vez de duplicar) e `ProfessionalCard` (Task 14); `backend/src/modules/search/search.schemas.ts` (Task 12, real) para os nomes exatos de query/response (`categoryId`, `city`, `state`, `q`, `page`, `limit`, `items`, `total`).
- Produces: `landingApi = { searchProfessionals }`; hooks `useSearchProfessionals`; componentes `SearchBar`, `CategoryGrid`, `ProfessionalResults`; páginas `LandingPage`, `SearchPage`.

- [ ] **Step 1: Escrever schemas + api**

Create `frontend/src/features/landing/schemas.ts`:

```ts
import { z } from 'zod';

export const searchFormSchema = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(128).optional(),
  state: z.string().length(2).optional(),
  categoryId: z.string().uuid().optional(),
});

export type SearchForm = z.infer<typeof searchFormSchema>;
```

Create `frontend/src/features/landing/api.ts`:

```ts
import { http } from '../../lib/http';

export interface SearchResultItem {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
}

export interface SearchResponse {
  items: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}

export interface SearchParams {
  q?: string;
  city?: string;
  state?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export const landingApi = {
  async searchProfessionals(params: SearchParams): Promise<SearchResponse> {
    const { data } = await http.get<SearchResponse>('/search/professionals', { params });
    return data;
  },
};
```

- [ ] **Step 2: Escrever queries**

Create `frontend/src/features/landing/queries.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams } from './api';

export function useSearchProfessionals(params: SearchParams) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
  });
}
```

- [ ] **Step 3: Escrever componentes**

Create `frontend/src/features/landing/components/SearchBar.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { searchFormSchema, type SearchForm } from '../schemas';

export function SearchBar() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<SearchForm>({ resolver: zodResolver(searchFormSchema) });

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    if (values.q) params.set('q', values.q);
    if (values.city) params.set('city', values.city);
    if (values.state) params.set('state', values.state);
    navigate(`/search?${params.toString()}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex gap-2">
      <input className="flex-1 rounded border px-3 py-2" placeholder="O que voce precisa?" {...register('q')} />
      <input className="w-40 rounded border px-3 py-2" placeholder="Cidade" {...register('city')} />
      <input className="w-16 rounded border px-3 py-2" placeholder="UF" maxLength={2} {...register('state')} />
      <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
        Buscar
      </button>
    </form>
  );
}
```

Create `frontend/src/features/landing/components/CategoryGrid.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';

export function CategoryGrid() {
  const { data } = useCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {data
        ?.filter((category) => category.isActive)
        .map((category) => (
          <Link
            key={category.id}
            to={`/search?categoryId=${category.id}`}
            className="rounded border p-4 text-center hover:border-slate-400"
          >
            {category.name}
          </Link>
        ))}
    </div>
  );
}
```

Create `frontend/src/features/landing/components/ProfessionalResults.tsx`:

```tsx
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import type { SearchParams } from '../api';

export function ProfessionalResults({ params }: { params: SearchParams }) {
  const { data, isLoading, isError } = useSearchProfessionals(params);

  if (isLoading) return <p>Carregando...</p>;
  if (isError) return <p>Nao foi possivel carregar os resultados.</p>;
  if (!data || data.items.length === 0) return <p>Nenhum profissional encontrado.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.items.map((item) => (
        <ProfessionalCard
          key={item.id}
          id={item.id}
          headline={item.headline}
          bio={item.bio}
          hourlyRate={item.hourlyRate}
          ratingAverage={item.ratingAverage}
          ratingCount={item.ratingCount}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Escrever páginas**

Create `frontend/src/features/landing/pages/LandingPage.tsx`:

```tsx
import { SearchBar } from '../components/SearchBar';
import { CategoryGrid } from '../components/CategoryGrid';

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-3xl font-semibold">Encontre o profissional certo</h1>
      <SearchBar />
      <CategoryGrid />
    </div>
  );
}
```

Create `frontend/src/features/landing/pages/SearchPage.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { ProfessionalResults } from '../components/ProfessionalResults';

export default function SearchPage() {
  const [params] = useSearchParams();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <SearchBar />
      <ProfessionalResults
        params={{
          q: params.get('q') ?? undefined,
          city: params.get('city') ?? undefined,
          state: params.get('state') ?? undefined,
          categoryId: params.get('categoryId') ?? undefined,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Registrar rotas**

In `frontend/src/router/index.tsx`, import `LandingPage` and `SearchPage`, and add `{ path: '/', element: <LandingPage /> }` and `{ path: '/search', element: <SearchPage /> }` as public siblings (outside `ProtectedRoute`). This also closes the gap flagged during Fase 7's review, where a successful login's `navigate('/')` landed on `NotFound` because no `/` route existed — after this task, `/` resolves to `LandingPage`.

- [ ] **Step 6: Escrever teste falhando**

Create `frontend/src/features/landing/landing.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalResults } from './components/ProfessionalResults';
import { landingApi } from './api';

vi.mock('./api', () => ({ landingApi: { searchProfessionals: vi.fn() } }));

function renderResults() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalResults params={{ q: 'eletricista' }} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfessionalResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra profissionais retornados pela busca', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({
      items: [
        { id: 'p1', headline: 'Eletricista residencial', bio: null, hourlyRate: 100, ratingAverage: 4.5, ratingCount: 10, isAvailable: true },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderResults();
    await waitFor(() => expect(screen.getByText('Eletricista residencial')).toBeInTheDocument());
  });

  it('mostra mensagem quando nao ha resultados', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderResults();
    await waitFor(() => expect(screen.getByText('Nenhum profissional encontrado.')).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: Rodar, typecheck, lint, suíte completa**

Run: `cd frontend && npx vitest run src/features/landing && npm run typecheck && npm run lint && npx vitest run`
Expected: tudo verde, sem regressão nas features `auth`/`settings`/`professional`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/landing/ frontend/src/router/index.tsx
git commit -m "feat(landing-web): adiciona busca publica e pagina inicial"
```

---

## Verificação final da fase

- [ ] `cd backend && npm run typecheck && npm run lint && npx vitest run src/modules/catalog src/modules/professional src/modules/availability src/modules/portfolio src/modules/search`
- [ ] `cd frontend && npm run typecheck && npm run lint && npx vitest run src/features/professional src/features/landing`
- [ ] Marcar `- [x] Fase 8 — professional` em `plan_index.md`.

---
