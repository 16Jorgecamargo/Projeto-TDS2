import type { FastifyInstance } from 'fastify';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import { paginatedResponse } from '../../shared/schemas.js';
import { locationListSchema, searchQuerySchema, searchResultItemSchema } from './search.schemas.js';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  const service = new SearchService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    categoryLinks: app.dataSource.getRepository(ProfessionalCategory),
    serviceAreas: app.dataSource.getRepository(ProfessionalServiceArea),
  });
  const controller = new SearchController(service);

  app.get('/search/professionals', {
    schema: {
      tags: ['search'],
      summary: 'Busca publica de profissionais',
      querystring: searchQuerySchema,
      response: { 200: paginatedResponse(searchResultItemSchema) },
    },
    handler: controller.searchProfessionals,
  });

  app.get('/search/locations', {
    schema: {
      tags: ['search'],
      summary: 'Lista cidades e estados cadastrados nas areas de atendimento',
      response: { 200: locationListSchema },
    },
    handler: controller.listLocations,
  });
}
