import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { ContractService } from './contract.service.js';
import { ContractController } from './contract.controller.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { Quote } from '../../infra/database/entities/quote.entity.js';
import { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import { Schedule } from '../../infra/database/entities/schedule.entity.js';
import { ContractProgressUpdate } from '../../infra/database/entities/contract-progress-update.entity.js';
import { ContractProgressImage } from '../../infra/database/entities/contract-progress-image.entity.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { emptyBodySchema, idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  acceptQuoteSchema,
  contractResponseSchema,
  progressUpdateSchema,
  progressUpdateResponseSchema,
  cancelContractSchema,
} from './contract.schemas.js';

export async function contractRoutes(app: FastifyInstance): Promise<void> {
  const service = new ContractService({
    contracts: app.dataSource.getRepository(Contract),
    quotes: app.dataSource.getRepository(Quote),
    demands: app.dataSource.getRepository(ServiceDemand),
    schedules: app.dataSource.getRepository(Schedule),
    progress: app.dataSource.getRepository(ContractProgressUpdate),
    progressImages: app.dataSource.getRepository(ContractProgressImage),
    users: app.dataSource.getRepository(User),
    professionalProfiles: app.dataSource.getRepository(ProfessionalProfile),
  });
  const controller = new ContractController(service, app.dataSource.getRepository(ProfessionalProfile));

  app.post('/quotes/:id/accept', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['contracts'],
      summary: 'Aceitar orcamento',
      params: idParamSchema,
      body: acceptQuoteSchema,
      response: { 201: contractResponseSchema },
    },
    handler: controller.acceptQuote,
  });

  app.get('/contracts', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['contracts'],
      summary: 'Meus contratos',
      response: { 200: z.array(contractResponseSchema) },
    },
    handler: controller.listContracts,
  });

  app.get('/contracts/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['contracts'],
      summary: 'Detalhe do contrato',
      params: idParamSchema,
      response: { 200: contractResponseSchema },
    },
    handler: controller.getContract,
  });

  app.post('/contracts/:id/start', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['contracts'],
      summary: 'Iniciar execucao',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 200: contractResponseSchema },
    },
    handler: controller.startContract,
  });

  app.post('/contracts/:id/complete', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['contracts'],
      summary: 'Concluir contrato',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 200: contractResponseSchema },
    },
    handler: controller.completeContract,
  });

  app.post('/contracts/:id/cancel', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['contracts'],
      summary: 'Cancelar contrato',
      params: idParamSchema,
      body: cancelContractSchema,
      response: { 200: contractResponseSchema },
    },
    handler: controller.cancelContract,
  });

  app.post('/contracts/:id/progress', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['contracts'],
      summary: 'Registrar progresso',
      params: idParamSchema,
      body: progressUpdateSchema,
      response: { 201: progressUpdateResponseSchema },
    },
    handler: controller.addProgress,
  });

  app.get('/contracts/:id/progress', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['contracts'],
      summary: 'Listar progresso',
      params: idParamSchema,
      response: { 200: z.array(progressUpdateResponseSchema) },
    },
    handler: controller.listProgress,
  });
}
