import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { QuoteService } from './quote.service.js';
import { QuoteController } from './quote.controller.js';
import { Quote } from '../../infra/database/entities/quote.entity.js';
import { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { emptyBodySchema, idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { createQuoteSchema, myQuoteResponseSchema, quoteResponseSchema } from './quote.schemas.js';

export async function quoteRoutes(app: FastifyInstance): Promise<void> {
  const service = new QuoteService({
    quotes: app.dataSource.getRepository(Quote),
    demands: app.dataSource.getRepository(ServiceDemand),
  });
  const controller = new QuoteController(service, app.dataSource.getRepository(ProfessionalProfile));

  app.post('/demands/:id/quotes', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['quotes'],
      summary: 'Enviar orcamento',
      params: idParamSchema,
      body: createQuoteSchema,
      response: { 201: quoteResponseSchema },
    },
    handler: controller.create,
  });

  app.get('/demands/:id/quotes', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['quotes'],
      summary: 'Listar orcamentos da demanda',
      params: idParamSchema,
      response: { 200: z.array(quoteResponseSchema) },
    },
    handler: controller.listByDemand,
  });

  app.get('/quotes/me', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['quotes'],
      summary: 'Listar meus orcamentos pendentes',
      response: { 200: z.array(myQuoteResponseSchema) },
    },
    handler: controller.listMinePending,
  });

  app.get('/quotes/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['quotes'],
      summary: 'Detalhe do orcamento',
      params: idParamSchema,
      response: { 200: quoteResponseSchema },
    },
    handler: controller.getById,
  });

  app.post('/quotes/:id/withdraw', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['quotes'],
      summary: 'Retirar orcamento',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 200: quoteResponseSchema },
    },
    handler: controller.withdraw,
  });
}
