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
