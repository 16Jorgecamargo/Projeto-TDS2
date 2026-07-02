import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminService } from './admin.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type {
  AdminAuditQuery,
  AdminListQuery,
  ResolveDisputeBody,
  ResolveReportBody,
  SetUserStatusBody,
} from './admin.schemas.js';

export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly auditService: AuditService,
  ) {}

  setUserStatus = async (
    req: FastifyRequest<{ Params: { id: string }; Body: SetUserStatusBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.setUserStatus(req.user!.id, req.params.id, req.body);
    return reply.send(result);
  };

  listReports = async (req: FastifyRequest<{ Querystring: AdminListQuery }>, reply: FastifyReply) => {
    const { page, limit, status } = req.query;
    const result = await this.service.listReports(status, page, limit);
    return reply.send(result);
  };

  resolveReport = async (
    req: FastifyRequest<{ Params: { id: string }; Body: ResolveReportBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.resolveReport(req.user!.id, req.params.id, req.body);
    return reply.send(result);
  };

  listDisputes = async (req: FastifyRequest<{ Querystring: AdminListQuery }>, reply: FastifyReply) => {
    const { page, limit, status } = req.query;
    const result = await this.service.listDisputes(status, page, limit);
    return reply.send(result);
  };

  resolveDispute = async (
    req: FastifyRequest<{ Params: { id: string }; Body: ResolveDisputeBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.resolveDispute(req.user!.id, req.params.id, req.body);
    return reply.send(result);
  };

  listAudit = async (req: FastifyRequest<{ Querystring: AdminAuditQuery }>, reply: FastifyReply) => {
    const { page, limit, userId, action } = req.query;
    const result = await this.auditService.list({ userId, action }, page, limit);
    return reply.send(result);
  };
}
