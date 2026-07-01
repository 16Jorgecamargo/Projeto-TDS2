import type { Repository } from 'typeorm';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResponse,
  CategoryTreeNode,
  CreateTagInput,
  TagResponse,
} from './catalog.schemas.js';

interface CatalogDeps {
  categories: Repository<ServiceCategory>;
  tags: Repository<ServiceTag>;
}

export class CatalogService {
  constructor(private readonly deps: CatalogDeps) {}

  async createCategory(input: CreateCategoryInput): Promise<CategoryResponse> {
    const existing = await this.deps.categories.findOne({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictError('Slug de categoria ja em uso');
    }
    if (input.parentId) {
      const parent = await this.deps.categories.findOne({ where: { id: input.parentId } });
      if (!parent) {
        throw new NotFoundError('Categoria pai nao encontrada');
      }
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
    return this.toCategoryResponse(saved);
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
    const category = await this.deps.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundError('Categoria nao encontrada');
    }
    if (input.name !== undefined) category.name = input.name;
    if (input.icon !== undefined) category.icon = input.icon;
    if (input.description !== undefined) category.description = input.description;
    if (input.isActive !== undefined) category.is_active = input.isActive;
    const saved = await this.deps.categories.save(category);
    return this.toCategoryResponse(saved);
  }

  async listCategoryTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.deps.categories.find({ order: { name: 'ASC' } });
    const nodes = new Map<string, CategoryTreeNode>();
    for (const row of rows) {
      nodes.set(row.id, { ...this.toCategoryResponse(row), children: [] });
    }
    const roots: CategoryTreeNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async listCategories(): Promise<CategoryResponse[]> {
    const rows = await this.deps.categories.find({ order: { name: 'ASC' } });
    return rows.map((row) => this.toCategoryResponse(row));
  }

  async createTag(input: CreateTagInput): Promise<TagResponse> {
    const existing = await this.deps.tags.findOne({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictError('Slug de tag ja em uso');
    }
    const saved = await this.deps.tags.save(
      this.deps.tags.create({ name: input.name, slug: input.slug }),
    );
    return this.toTagResponse(saved);
  }

  async listTags(): Promise<TagResponse[]> {
    const rows = await this.deps.tags.find({ order: { name: 'ASC' } });
    return rows.map((row) => this.toTagResponse(row));
  }

  private toCategoryResponse(category: ServiceCategory): CategoryResponse {
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

  private toTagResponse(tag: ServiceTag): TagResponse {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    };
  }
}
