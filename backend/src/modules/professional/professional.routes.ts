import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProfessionalService } from './professional.service.js';
import { ProfessionalController } from './professional.controller.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalDocument } from '../../infra/database/entities/professional-document.entity.js';
import { ProfessionalExperience } from '../../infra/database/entities/professional-experience.entity.js';
import { ProfessionalEducation } from '../../infra/database/entities/professional-education.entity.js';
import { ProfessionalCertification } from '../../infra/database/entities/professional-certification.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalTag } from '../../infra/database/entities/professional-tag.entity.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  upsertProfileSchema,
  profileResponseSchema,
  publicProfileSchema,
  setAssociationsSchema,
  experienceSchema,
  experienceResponseSchema,
  educationSchema,
  educationResponseSchema,
  certificationSchema,
  certificationResponseSchema,
  serviceAreaSchema,
  serviceAreaResponseSchema,
  documentSchema,
  documentResponseSchema,
} from './professional.schemas.js';

export async function professionalRoutes(app: FastifyInstance): Promise<void> {
  const service = new ProfessionalService({
    profiles: app.dataSource.getRepository(ProfessionalProfile),
    documents: app.dataSource.getRepository(ProfessionalDocument),
    experiences: app.dataSource.getRepository(ProfessionalExperience),
    education: app.dataSource.getRepository(ProfessionalEducation),
    certifications: app.dataSource.getRepository(ProfessionalCertification),
    serviceAreas: app.dataSource.getRepository(ProfessionalServiceArea),
    categories: app.dataSource.getRepository(ProfessionalCategory),
    tags: app.dataSource.getRepository(ProfessionalTag),
    serviceCategories: app.dataSource.getRepository(ServiceCategory),
    serviceTags: app.dataSource.getRepository(ServiceTag),
  });
  const controller = new ProfessionalController(service);
  const guard = [app.authenticate, requireRole('professional')];

  app.get('/professionals/me', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Meu perfil profissional', response: { 200: profileResponseSchema } },
    handler: controller.getMyProfile,
  });

  app.put('/professionals/me', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Cria ou atualiza perfil profissional',
      body: upsertProfileSchema,
      response: { 200: profileResponseSchema },
    },
    handler: controller.upsertProfile,
  });

  app.get('/professionals/:id', {
    schema: {
      tags: ['professional'],
      summary: 'Perfil publico do profissional',
      params: idParamSchema,
      response: { 200: publicProfileSchema },
    },
    handler: controller.getPublicProfile,
  });

  app.put('/professionals/me/categories', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Define categorias atendidas',
      body: setAssociationsSchema,
      response: { 204: z.void() },
    },
    handler: controller.setCategories,
  });

  app.put('/professionals/me/tags', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Define tags atendidas',
      body: setAssociationsSchema,
      response: { 204: z.void() },
    },
    handler: controller.setTags,
  });

  app.post('/professionals/me/experiences', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona experiencia',
      body: experienceSchema,
      response: { 201: experienceResponseSchema },
    },
    handler: controller.addExperience,
  });

  app.delete('/professionals/me/experiences/:id', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Remove experiencia', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeExperience,
  });

  app.post('/professionals/me/education', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona formacao',
      body: educationSchema,
      response: { 201: educationResponseSchema },
    },
    handler: controller.addEducation,
  });

  app.delete('/professionals/me/education/:id', {
    onRequest: guard,
    schema: { tags: ['professional'], summary: 'Remove formacao', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.removeEducation,
  });

  app.post('/professionals/me/certifications', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona certificacao',
      body: certificationSchema,
      response: { 201: certificationResponseSchema },
    },
    handler: controller.addCertification,
  });

  app.delete('/professionals/me/certifications/:id', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Remove certificacao',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.removeCertification,
  });

  app.post('/professionals/me/service-areas', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Adiciona area de atendimento',
      body: serviceAreaSchema,
      response: { 201: serviceAreaResponseSchema },
    },
    handler: controller.addServiceArea,
  });

  app.delete('/professionals/me/service-areas/:id', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Remove area de atendimento',
      params: idParamSchema,
      response: { 204: z.void() },
    },
    handler: controller.removeServiceArea,
  });

  app.post('/professionals/me/documents', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Envia documento para analise',
      body: documentSchema,
      response: { 201: documentResponseSchema },
    },
    handler: controller.addDocument,
  });

  app.get('/professionals/me/documents', {
    onRequest: guard,
    schema: {
      tags: ['professional'],
      summary: 'Lista documentos enviados',
      response: { 200: z.array(documentResponseSchema) },
    },
    handler: controller.listDocuments,
  });
}
