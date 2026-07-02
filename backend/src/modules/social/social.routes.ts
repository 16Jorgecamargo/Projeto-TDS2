import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { Favorite } from '../../infra/database/entities/favorite.entity.js';
import { Report } from '../../infra/database/entities/report.entity.js';
import { UserBlock } from '../../infra/database/entities/user-block.entity.js';
import { SocialService, type RecordAudit } from './social.service.js';
import { SocialController } from './social.controller.js';
import { idParamSchema, paginationQuerySchema } from '../../shared/schemas.js';
import {
  createFavoriteBodySchema,
  favoriteResponseSchema,
  favoriteListResponseSchema,
  createReportBodySchema,
  reportResponseSchema,
  createBlockBodySchema,
  blockResponseSchema,
  blockListResponseSchema,
} from './social.schemas.js';

const recordAudit: RecordAudit = async () => undefined;

export async function socialRoutes(app: FastifyInstance): Promise<void> {
  const service = new SocialService({
    favorites: app.dataSource.getRepository(Favorite),
    reports: app.dataSource.getRepository(Report),
    blocks: app.dataSource.getRepository(UserBlock),
    recordAudit,
  });
  const controller = new SocialController(service);

  app.post('/favorites', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Favoritar profissional',
      body: createFavoriteBodySchema,
      response: { 201: favoriteResponseSchema },
    },
    handler: controller.addFavorite,
  });

  app.delete('/favorites/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Remover favorito',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.removeFavorite,
  });

  app.get('/favorites', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Listar favoritos',
      querystring: paginationQuerySchema,
      response: { 200: favoriteListResponseSchema },
    },
    handler: controller.listFavorites,
  });

  app.post('/reports', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Criar denuncia',
      body: createReportBodySchema,
      response: { 201: reportResponseSchema },
    },
    handler: controller.createReport,
  });

  app.post('/blocks', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Bloquear usuario',
      body: createBlockBodySchema,
      response: { 201: blockResponseSchema },
    },
    handler: controller.blockUser,
  });

  app.delete('/blocks/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Desbloquear usuario',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.unblockUser,
  });

  app.get('/blocks', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['social'],
      summary: 'Listar bloqueios',
      querystring: paginationQuerySchema,
      response: { 200: blockListResponseSchema },
    },
    handler: controller.listBlocks,
  });
}
