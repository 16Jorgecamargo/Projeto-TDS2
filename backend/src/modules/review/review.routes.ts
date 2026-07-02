import type { FastifyInstance } from 'fastify';
import { Review } from '../../infra/database/entities/review.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { idParamSchema, paginationQuerySchema } from '../../shared/schemas.js';
import { createReviewBodySchema, reviewListResponseSchema, reviewResponseSchema } from './review.schemas.js';

export async function reviewRoutes(app: FastifyInstance): Promise<void> {
  const service = new ReviewService({
    reviews: app.dataSource.getRepository(Review),
    contracts: app.dataSource.getRepository(Contract),
    professionalProfiles: app.dataSource.getRepository(ProfessionalProfile),
    enqueueNotification: async () => undefined,
    recordAudit: async () => undefined,
  });
  const controller = new ReviewController(service);

  app.post('/reviews', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['review'],
      summary: 'Criar avaliacao mutua de um contrato concluido',
      body: createReviewBodySchema,
      response: { 201: reviewResponseSchema },
    },
    handler: controller.create,
  });

  app.get('/professionals/:id/reviews', {
    schema: {
      tags: ['review'],
      summary: 'Listar avaliacoes de um profissional',
      params: idParamSchema,
      querystring: paginationQuerySchema,
      response: { 200: reviewListResponseSchema },
    },
    handler: controller.listForProfessional,
  });
}
