import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import 'zod-openapi/extend';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityController } from './availability.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { slotSchema, slotResponseSchema, exceptionSchema, exceptionResponseSchema } from './availability.schemas.js';

const professionalIdParamSchema = z.object({
  professionalId: z.string().uuid().describe('ID do perfil profissional').openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
});

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  const service = new AvailabilityService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    slots: app.dataSource.getRepository(AvailabilitySlot),
    exceptions: app.dataSource.getRepository(AvailabilityException),
  });
  const controller = new AvailabilityController(service);
  const guard = [app.authenticate, requireRole('professional')];

  app.post('/availability/me/slots', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Adiciona slot', body: slotSchema, response: { 201: slotResponseSchema } },
    handler: controller.addSlot,
  });

  app.delete('/availability/me/slots/:id', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Remove slot', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeSlot,
  });

  app.get('/availability/:professionalId/slots', {
    schema: {
      tags: ['availability'],
      summary: 'Lista slots publicos do profissional',
      params: professionalIdParamSchema,
      response: { 200: z.array(slotResponseSchema) },
    },
    handler: controller.listSlots,
  });

  app.post('/availability/me/exceptions', {
    onRequest: guard,
    schema: {
      tags: ['availability'],
      summary: 'Adiciona excecao',
      body: exceptionSchema,
      response: { 201: exceptionResponseSchema },
    },
    handler: controller.addException,
  });

  app.delete('/availability/me/exceptions/:id', {
    onRequest: guard,
    schema: { tags: ['availability'], summary: 'Remove excecao', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeException,
  });

  app.get('/availability/:professionalId/exceptions', {
    schema: {
      tags: ['availability'],
      summary: 'Lista excecoes publicas do profissional',
      params: professionalIdParamSchema,
      response: { 200: z.array(exceptionResponseSchema) },
    },
    handler: controller.listExceptions,
  });
}
