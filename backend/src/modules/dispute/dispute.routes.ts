import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { DisputeService } from './dispute.service.js';
import { DisputeController } from './dispute.controller.js';
import { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { openDisputeSchema, resolveDisputeSchema, disputeResponseSchema } from './dispute.schemas.js';

export async function disputeRoutes(app: FastifyInstance): Promise<void> {
  const service = new DisputeService({
    disputes: app.dataSource.getRepository(ContractDispute),
    contracts: app.dataSource.getRepository(Contract),
  });
  const controller = new DisputeController(service, app.dataSource.getRepository(ProfessionalProfile));

  app.post('/contracts/:id/disputes', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['disputes'],
      summary: 'Abrir disputa',
      params: idParamSchema,
      body: openDisputeSchema,
      response: { 201: disputeResponseSchema },
    },
    handler: controller.openDispute,
  });

  app.get('/contracts/:id/disputes', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['disputes'],
      summary: 'Listar disputas do contrato',
      params: idParamSchema,
      response: { 200: z.array(disputeResponseSchema) },
    },
    handler: controller.listContractDisputes,
  });

  app.post('/disputes/:id/resolve', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['disputes'],
      summary: 'Resolver disputa',
      params: idParamSchema,
      body: resolveDisputeSchema,
      response: { 200: disputeResponseSchema },
    },
    handler: controller.resolveDispute,
  });
}
