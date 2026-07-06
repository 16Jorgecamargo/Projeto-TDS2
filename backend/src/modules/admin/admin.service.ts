import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity.js';
import { Report } from '../../infra/database/entities/report.entity.js';
import { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import { Payment } from '../../infra/database/entities/payment.entity.js';
import { Withdrawal } from '../../infra/database/entities/withdrawal.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { Refund } from '../../infra/database/entities/refund.entity.js';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
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
  AdminUserListItem,
  AdminPaymentListItem,
  AdminWithdrawalListItem,
  AdminDashboardResponse,
} from './admin.schemas.js';

export function fillDateGaps(
  rows: { date: string; count: string }[],
  from: Date,
  to: Date,
): { date: string; count: number }[] {
  const countByDate = new Map(rows.map((row) => [row.date, Number(row.count)]));
  const result: { date: string; count: number }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (cursor <= end) {
    const dateKey = cursor.toISOString().slice(0, 10);
    result.push({ date: dateKey, count: countByDate.get(dateKey) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

interface AdminServiceDeps {
  users: Repository<User>;
  reports: Repository<Report>;
  disputes: Repository<ContractDispute>;
  payments: Repository<Payment>;
  withdrawals: Repository<Withdrawal>;
  contracts: Repository<Contract>;
  demands: Repository<ServiceDemand>;
  refunds: Repository<Refund>;
  wallets: Repository<Wallet>;
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

  private toUserListItem(user: User): AdminUserListItem {
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at.toISOString(),
    };
  }

  async listUsers(
    search: string | undefined,
    role: User['role'] | undefined,
    status: User['status'] | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AdminUserListItem>> {
    const qb = this.deps.users.createQueryBuilder('user');
    if (role) qb.andWhere('user.role = :role', { role });
    if (status) qb.andWhere('user.status = :status', { status });
    if (search) {
      qb.andWhere('(user.full_name LIKE :search OR user.email LIKE :search)', {
        search: `%${search}%`,
      });
    }
    qb.orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map((row) => this.toUserListItem(row)), page, limit, total };
  }

  private toPaymentListItem(payment: Payment): AdminPaymentListItem {
    return {
      id: payment.id,
      contract_id: payment.contract_id,
      payer_id: payment.payer_id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      paid_at: payment.paid_at ? payment.paid_at.toISOString() : null,
      created_at: payment.created_at.toISOString(),
    };
  }

  async listPayments(
    status: Payment['status'] | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AdminPaymentListItem>> {
    const where = status ? { status } : {};
    const [rows, total] = await this.deps.payments.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toPaymentListItem(row)), page, limit, total };
  }

  private toWithdrawalListItem(withdrawal: Withdrawal): AdminWithdrawalListItem {
    return {
      id: withdrawal.id,
      wallet_id: withdrawal.wallet_id,
      amount: withdrawal.amount,
      payment_method: withdrawal.payment_method,
      status: withdrawal.status,
      destination: withdrawal.destination,
      processed_at: withdrawal.processed_at ? withdrawal.processed_at.toISOString() : null,
      created_at: withdrawal.created_at.toISOString(),
    };
  }

  async listWithdrawals(
    status: Withdrawal['status'] | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AdminWithdrawalListItem>> {
    const effectiveStatus = status ?? 'pending';
    const [rows, total] = await this.deps.withdrawals.findAndCount({
      where: { status: effectiveStatus },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toWithdrawalListItem(row)), page, limit, total };
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

  async getDashboard(): Promise<AdminDashboardResponse> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = await this.deps.users.count();
    const activeContracts = await this.deps.contracts.count({ where: { status: 'active' } });
    const openDemands = await this.deps.demands.count({ where: { status: 'open' } });

    const capturedRow = await this.deps.payments
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.status = :status', { status: 'captured' })
      .andWhere('payment.paid_at >= :cutoff', { cutoff: thirtyDaysAgo })
      .getRawOne<{ total: string }>();

    const refundedRow = await this.deps.refunds
      .createQueryBuilder('refund')
      .select('COALESCE(SUM(refund.amount), 0)', 'total')
      .where('refund.status = :status', { status: 'completed' })
      .andWhere('refund.processed_at >= :cutoff', { cutoff: thirtyDaysAgo })
      .getRawOne<{ total: string }>();

    const totalCaptured30d = Number(capturedRow?.total ?? 0).toFixed(2);
    const totalRefunded30d = Number(refundedRow?.total ?? 0).toFixed(2);
    const gmvLast30Days = (Number(totalCaptured30d) - Number(totalRefunded30d)).toFixed(2);

    const pendingReports = await this.deps.reports.count({ where: { status: 'pending' } });
    const pendingDisputes = await this.deps.disputes
      .createQueryBuilder('dispute')
      .where('dispute.status IN (:...statuses)', { statuses: ['open', 'under_review'] })
      .getCount();
    const pendingWithdrawals = await this.deps.withdrawals.count({ where: { status: 'pending' } });

    const walletRow = await this.deps.wallets
      .createQueryBuilder('wallet')
      .select('COALESCE(SUM(wallet.balance), 0)', 'total')
      .getRawOne<{ total: string }>();
    const walletBalanceSum = Number(walletRow?.total ?? 0).toFixed(2);

    const pendingWithdrawalsRow = await this.deps.withdrawals
      .createQueryBuilder('withdrawal')
      .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
      .where('withdrawal.status = :status', { status: 'pending' })
      .getRawOne<{ total: string }>();
    const pendingWithdrawalsAmount = Number(pendingWithdrawalsRow?.total ?? 0).toFixed(2);

    const newUsersRows = await this.deps.users
      .createQueryBuilder('user')
      .select('DATE(user.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.created_at >= :cutoff', { cutoff: thirtyDaysAgo })
      .groupBy('DATE(user.created_at)')
      .getRawMany<{ date: string; count: string }>();

    const completedContractsRows = await this.deps.contracts
      .createQueryBuilder('contract')
      .select('DATE(contract.updated_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('contract.status = :status', { status: 'completed' })
      .andWhere('contract.updated_at >= :cutoff', { cutoff: thirtyDaysAgo })
      .groupBy('DATE(contract.updated_at)')
      .getRawMany<{ date: string; count: string }>();

    return {
      counters: { totalUsers, activeContracts, openDemands, gmvLast30Days },
      pending: { reports: pendingReports, disputes: pendingDisputes, withdrawals: pendingWithdrawals },
      activity: {
        newUsersByDay: fillDateGaps(newUsersRows, thirtyDaysAgo, now),
        completedContractsByDay: fillDateGaps(completedContractsRows, thirtyDaysAgo, now),
      },
      finance: { totalCaptured30d, totalRefunded30d, walletBalanceSum, pendingWithdrawalsAmount },
    };
  }
}
