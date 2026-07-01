import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CatalogService } from './catalog.service.js';
import { CatalogController } from './catalog.controller.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryResponseSchema,
  categoryTreeNodeSchema,
  createTagSchema,
  tagResponseSchema,
} from './catalog.schemas.js';

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  const service = new CatalogService({
    categories: app.dataSource.getRepository(ServiceCategory),
    tags: app.dataSource.getRepository(ServiceTag),
  });
  const controller = new CatalogController(service);

  app.get('/categories', {
    schema: { tags: ['catalog'], summary: 'Lista categorias', response: { 200: z.array(categoryResponseSchema) } },
    handler: controller.listCategories,
  });

  app.get('/categories/tree', {
    schema: {
      tags: ['catalog'],
      summary: 'Arvore de categorias',
      response: { 200: z.array(categoryTreeNodeSchema) },
    },
    handler: controller.listCategoryTree,
  });

  app.post('/categories', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['catalog'],
      summary: 'Cria categoria',
      body: createCategorySchema,
      response: { 201: categoryResponseSchema },
    },
    handler: controller.createCategory,
  });

  app.patch('/categories/:id', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['catalog'],
      summary: 'Atualiza categoria',
      params: idParamSchema,
      body: updateCategorySchema,
      response: { 200: categoryResponseSchema },
    },
    handler: controller.updateCategory,
  });

  app.get('/tags', {
    schema: { tags: ['catalog'], summary: 'Lista tags', response: { 200: z.array(tagResponseSchema) } },
    handler: controller.listTags,
  });

  app.post('/tags', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: { tags: ['catalog'], summary: 'Cria tag', body: createTagSchema, response: { 201: tagResponseSchema } },
    handler: controller.createTag,
  });
}
