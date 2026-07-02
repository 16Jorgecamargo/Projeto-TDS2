import type { Repository } from 'typeorm';
import { AuditLog } from '../../infra/database/entities/audit-log.entity.js';
import { AppDataSource } from '../../infra/database/data-source.js';
import type { AuditLogResponse } from './audit.schemas.js';

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type RecordAudit = (input: RecordAuditInput) => Promise<void>;

export function buildRecordAudit(repo: Repository<AuditLog>): RecordAudit {
  return async (input) => {
    await repo.save(
      repo.create({
        user_id: input.userId ?? null,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        metadata: input.metadata ?? null,
      }),
    );
  };
}

export const recordAudit: RecordAudit = (input) =>
  buildRecordAudit(AppDataSource.getRepository(AuditLog))(input);

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
}

interface AuditServiceDeps {
  auditLogs: Repository<AuditLog>;
}

export class AuditService {
  constructor(private readonly deps: AuditServiceDeps) {}

  private toResponse(log: AuditLog): AuditLogResponse {
    return {
      id: log.id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      metadata: log.metadata,
      createdAt: log.created_at.toISOString(),
    };
  }

  async list(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Promise<{ items: AuditLogResponse[]; page: number; limit: number; total: number }> {
    const where: Record<string, string> = {};
    if (filters.userId) where.user_id = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;

    const [rows, total] = await this.deps.auditLogs.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map((row) => this.toResponse(row)),
      page,
      limit,
      total,
    };
  }
}
