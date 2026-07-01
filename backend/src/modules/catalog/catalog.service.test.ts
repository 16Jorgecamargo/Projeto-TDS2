import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { CatalogService } from './catalog.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import type { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';

describe('CatalogService', () => {
  let categories: ReturnType<typeof mockRepo<ServiceCategory>>;
  let tags: ReturnType<typeof mockRepo<ServiceTag>>;
  let service: CatalogService;

  beforeEach(() => {
    categories = mockRepo<ServiceCategory>();
    tags = mockRepo<ServiceTag>();
    service = new CatalogService({
      categories: categories as unknown as Repository<ServiceCategory>,
      tags: tags as unknown as Repository<ServiceTag>,
    });
  });

  it('cria categoria com sucesso', async () => {
    categories.findOne.mockResolvedValueOnce(null);
    categories.save.mockResolvedValueOnce({
      id: 'cat-1',
      parent_id: null,
      name: 'Eletrica',
      slug: 'eletrica',
      icon: 'bolt',
      description: null,
      is_active: true,
    } as ServiceCategory);

    const created = await service.createCategory({
      parentId: null,
      name: 'Eletrica',
      slug: 'eletrica',
      icon: 'bolt',
      description: null,
    });

    expect(created.slug).toBe('eletrica');
    expect(created.isActive).toBe(true);
    expect(created.parentId).toBeNull();
  });

  it('rejeita slug duplicado ao criar categoria', async () => {
    categories.findOne.mockResolvedValueOnce({ id: 'cat-1' } as ServiceCategory);

    await expect(
      service.createCategory({ parentId: null, name: 'X', slug: 'eletrica', icon: null, description: null }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita categoria pai inexistente', async () => {
    categories.findOne.mockResolvedValueOnce(null);
    categories.findOne.mockResolvedValueOnce(null);

    await expect(
      service.createCategory({
        parentId: 'nao-existe',
        name: 'Sub',
        slug: 'sub',
        icon: null,
        description: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('atualiza somente campos enviados', async () => {
    categories.findOne.mockResolvedValueOnce({
      id: 'cat-1',
      parent_id: null,
      name: 'Eletrica',
      slug: 'eletrica',
      icon: 'bolt',
      description: null,
      is_active: true,
    } as ServiceCategory);
    categories.save.mockImplementation((value) => Promise.resolve(value as ServiceCategory));

    const updated = await service.updateCategory('cat-1', { isActive: false });

    expect(updated.isActive).toBe(false);
    expect(updated.name).toBe('Eletrica');
  });

  it('lanca 404 ao atualizar categoria inexistente', async () => {
    categories.findOne.mockResolvedValueOnce(null);

    await expect(service.updateCategory('nao-existe', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('monta arvore aninhando filhos sob o pai', async () => {
    categories.find.mockResolvedValueOnce([
      {
        id: 'root',
        parent_id: null,
        name: 'Casa',
        slug: 'casa',
        icon: null,
        description: null,
        is_active: true,
      },
      {
        id: 'child',
        parent_id: 'root',
        name: 'Eletrica',
        slug: 'eletrica',
        icon: null,
        description: null,
        is_active: true,
      },
    ] as ServiceCategory[]);

    const tree = await service.listCategoryTree();

    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('root');
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.id).toBe('child');
  });

  it('lista categorias', async () => {
    categories.find.mockResolvedValueOnce([
      {
        id: 'cat-1',
        parent_id: null,
        name: 'Casa',
        slug: 'casa',
        icon: null,
        description: null,
        is_active: true,
      },
    ] as ServiceCategory[]);

    const list = await service.listCategories();

    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe('casa');
  });

  it('cria tag e rejeita slug duplicado', async () => {
    tags.findOne.mockResolvedValueOnce(null);
    tags.save.mockResolvedValueOnce({ id: 'tag-1', name: 'Instalacao', slug: 'instalacao' } as ServiceTag);

    const created = await service.createTag({ name: 'Instalacao', slug: 'instalacao' });

    expect(created.id).toBe('tag-1');

    tags.findOne.mockResolvedValueOnce({ id: 'tag-1' } as ServiceTag);
    await expect(
      service.createTag({ name: 'Outra', slug: 'instalacao' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('lista tags', async () => {
    tags.find.mockResolvedValueOnce([{ id: 'tag-1', name: 'Instalacao', slug: 'instalacao' }] as ServiceTag[]);

    const list = await service.listTags();

    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe('instalacao');
  });
});
