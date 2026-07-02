import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity.js';
import { Report } from '../../infra/database/entities/report.entity.js';
import { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { RecordAudit } from '../audit/audit.service.js';
import type { EnqueueNotification } from '../notification/notification.service.js';
import type { DisputeService } from '../dispute/dispute.service.js';
import type {
  AdminDisputeResponse,
  AdminReportResponse,
  AdminUserResponse,
  ResolveDisputeBody,
  ResolveReportBody,
  SetUserStatusBody,
} from './admin.schemas.js';

interface AdminServiceDeps {
  users: Repository<User>;
  reports: Repository<Report>;
  disputes: Repository<ContractDispute>;
  disputeService: DisputeService;
  recordAudit: RecordAudit;
  enqueueNotification: EnqueueNotification;
}

interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export class AdminService {
  constructor(private readonly deps: AdminServiceDeps) {}

  private toReportResponse(report: Report): AdminReportResponse {
    return { id: report.id, status: report.status };
  }

  private toDisputeResponse(dispute: ContractDispute): AdminDisputeResponse {
    return { id: dispute.id, status: dispute.status, outcome: null };
  }

  async setUserStatus(adminId: string, userId: string, body: SetUserStatusBody): Promise<AdminUserResponse> {
    const user = await this.deps.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }

    await this.deps.users.update({ id: userId }, { status: body.status });

    await this.deps.recordAudit({
      userId: adminId,
      action: 'admin.user.status_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { status: body.status, reason: body.reason },
    });

    await this.deps.enqueueNotification({
      userId,
      type: 'account_moderated',
      title: 'Status da conta atualizado',
      body: `Novo status: ${body.status}`,
      channels: ['in_app', 'email'],
    });

    return { id: userId, status: body.status };
  }

  async listReports(
    status: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AdminReportResponse>> {
    const where = status ? { status: status as Report['status'] } : {};
    const [rows, total] = await this.deps.reports.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toReportResponse(row)), page, limit, total };
  }

  async resolveReport(adminId: string, reportId: string, body: ResolveReportBody): Promise<AdminReportResponse> {
    const report = await this.deps.reports.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundError('Denuncia nao encontrada');
    }

    await this.deps.reports.update(
      { id: reportId },
      { status: body.resolution, reviewed_by: adminId },
    );

    await this.deps.recordAudit({
      userId: adminId,
      action: 'admin.report.resolved',
      entityType: 'report',
      entityId: reportId,
      metadata: { resolution: body.resolution, note: body.note ?? null },
    });

    return { id: reportId, status: body.resolution };
  }

  async listDisputes(
    status: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AdminDisputeResponse>> {
    const where = status ? { status: status as ContractDispute['status'] } : {};
    const [rows, total] = await this.deps.disputes.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((row) => this.toDisputeResponse(row)),
      page,
      limit,
      total,
    };
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    body: ResolveDisputeBody,
  ): Promise<AdminDisputeResponse> {
    const dispute = await this.deps.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) {
      throw new NotFoundError('Disputa nao encontrada');
    }
    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      throw new UnprocessableError('Disputa ja encerrada');
    }

    const resolved = await this.deps.disputeService.resolve(disputeId, 'resolved', body.note);

    await this.deps.recordAudit({
      userId: adminId,
      action: 'admin.dispute.resolved',
      entityType: 'contract_dispute',
      entityId: disputeId,
      metadata: { outcome: body.outcome, note: body.note },
    });

    await this.deps.enqueueNotification({
      userId: dispute.opened_by,
      type: 'dispute_resolved',
      title: 'Disputa resolvida',
      body: `Resultado: ${body.outcome}`,
      channels: ['in_app', 'email'],
    });

    return { id: resolved.id, status: resolved.status, outcome: body.outcome };
  }
}
