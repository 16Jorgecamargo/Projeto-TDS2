import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { DemandService } from './demand.service.js';
import { DemandController } from './demand.controller.js';
import { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import { DemandImage } from '../../infra/database/entities/demand-image.entity.js';
import { DemandTag } from '../../infra/database/entities/demand-tag.entity.js';
import { DemandInvitation } from '../../infra/database/entities/demand-invitation.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { Quote } from '../../infra/database/entities/quote.entity.js';
import { QuoteItem } from '../../infra/database/entities/quote-item.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { emptyBodySchema, idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  createDemandSchema,
  updateDemandSchema,
  demandResponseSchema,
  demandListQuerySchema,
  demandListResponseSchema,
  inviteProfessionalSchema,
  demandInvitationResponseSchema,
} from './demand.schemas.js';

export async function demandRoutes(app: FastifyInstance): Promise<void> {
  const service = new DemandService({
    demands: app.dataSource.getRepository(ServiceDemand),
    images: app.dataSource.getRepository(DemandImage),
    tags: app.dataSource.getRepository(DemandTag),
    invitations: app.dataSource.getRepository(DemandInvitation),
    contracts: app.dataSource.getRepository(Contract),
    quotes: app.dataSource.getRepository(Quote),
    quoteItems: app.dataSource.getRepository(QuoteItem),
  });
  const controller = new DemandController(service, app.dataSource.getRepository(ProfessionalProfile));

  app.post('/demands', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['demands'],
      summary: 'Publicar demanda',
      body: createDemandSchema,
      response: { 201: demandResponseSchema },
    },
    handler: controller.create,
  });

  app.get('/demands', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['demands'],
      summary: 'Listar demandas',
      querystring: demandListQuerySchema,
      response: { 200: demandListResponseSchema },
    },
    handler: controller.list,
  });

  app.get('/demands/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['demands'],
      summary: 'Detalhe da demanda',
      params: idParamSchema,
      response: { 200: demandResponseSchema },
    },
    handler: controller.getById,
  });

  app.patch('/demands/:id', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['demands'],
      summary: 'Editar demanda',
      params: idParamSchema,
      body: updateDemandSchema,
      response: { 200: demandResponseSchema },
    },
    handler: controller.update,
  });

  app.post('/demands/:id/cancel', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['demands'],
      summary: 'Cancelar demanda',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 200: demandResponseSchema },
    },
    handler: controller.cancel,
  });

  app.delete('/demands/:id', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['demands'],
      summary: 'Excluir demanda',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.remove,
  });

  app.post('/demands/:id/invitations', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['demands'],
      summary: 'Convidar profissional',
      params: idParamSchema,
      body: inviteProfessionalSchema,
      response: { 201: demandInvitationResponseSchema },
    },
    handler: controller.invite,
  });

  app.get('/demands/:id/invitations', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['demands'],
      summary: 'Listar convites da demanda',
      params: idParamSchema,
      response: { 200: z.array(demandInvitationResponseSchema) },
    },
    handler: controller.listInvitations,
  });

  app.post('/invitations/:id/respond', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['demands'],
      summary: 'Responder convite',
      params: idParamSchema,
      body: z.object({ accept: z.boolean().describe('Aceitar convite').openapi({ example: true }) }),
      response: { 200: demandInvitationResponseSchema },
    },
    handler: controller.respondInvitation,
  });
}
