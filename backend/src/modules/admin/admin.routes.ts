import type { FastifyInstance } from 'fastify';
import { User } from '../../infra/database/entities/user.entity.js';
import { Report } from '../../infra/database/entities/report.entity.js';
import { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { AuditLog } from '../../infra/database/entities/audit-log.entity.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AuditService, buildRecordAudit } from '../audit/audit.service.js';
import { buildEnqueueNotification } from '../notification/notification.service.js';
import { notificationQueue } from '../notification/notification.queue.js';
import { DisputeService } from '../dispute/dispute.service.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import {
  setUserStatusBodySchema,
  adminUserResponseSchema,
  resolveReportBodySchema,
  adminReportResponseSchema,
  adminReportListResponseSchema,
  resolveDisputeBodySchema,
  adminDisputeResponseSchema,
  adminDisputeListResponseSchema,
  adminListQuerySchema,
  adminAuditQuerySchema,
} from './admin.schemas.js';
import { auditLogListResponseSchema } from '../audit/audit.schemas.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const disputeService = new DisputeService({
    disputes: app.dataSource.getRepository(ContractDispute),
    contracts: app.dataSource.getRepository(Contract),
  });
  const service = new AdminService({
    users: app.dataSource.getRepository(User),
    reports: app.dataSource.getRepository(Report),
    disputes: app.dataSource.getRepository(ContractDispute),
    disputeService,
    recordAudit: buildRecordAudit(app.dataSource.getRepository(AuditLog)),
    enqueueNotification: buildEnqueueNotification(notificationQueue),
  });
  const auditService = new AuditService({ auditLogs: app.dataSource.getRepository(AuditLog) });
  const controller = new AdminController(service, auditService);

  const guard = { onRequest: [app.authenticate, requireRole('admin')] };

  app.patch('/admin/users/:id/status', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Alterar status de moderacao do usuario',
      params: idParamSchema,
      body: setUserStatusBodySchema,
      response: { 200: adminUserResponseSchema },
    },
    handler: controller.setUserStatus,
  });

  app.get('/admin/reports', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Listar denuncias',
      querystring: adminListQuerySchema,
      response: { 200: adminReportListResponseSchema },
    },
    handler: controller.listReports,
  });

  app.patch('/admin/reports/:id', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Resolver denuncia',
      params: idParamSchema,
      body: resolveReportBodySchema,
      response: { 200: adminReportResponseSchema },
    },
    handler: controller.resolveReport,
  });

  app.get('/admin/disputes', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Listar disputas de contrato',
      querystring: adminListQuerySchema,
      response: { 200: adminDisputeListResponseSchema },
    },
    handler: controller.listDisputes,
  });

  app.patch('/admin/disputes/:id', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Resolver disputa de contrato',
      params: idParamSchema,
      body: resolveDisputeBodySchema,
      response: { 200: adminDisputeResponseSchema },
    },
    handler: controller.resolveDispute,
  });

  app.get('/admin/audit', {
    ...guard,
    schema: {
      tags: ['admin'],
      summary: 'Consultar trilha de auditoria',
      querystring: adminAuditQuerySchema,
      response: { 200: auditLogListResponseSchema },
    },
    handler: controller.listAudit,
  });
}
