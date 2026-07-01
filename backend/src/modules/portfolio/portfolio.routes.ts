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
