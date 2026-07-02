import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildRecordAudit, AuditService } from './audit.service.js';

function makeRepo() {
  return {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({
      ...value,
      id: 'a-1',
      created_at: new Date('2026-07-01T12:00:00.000Z'),
    })),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
}

describe('buildRecordAudit', () => {
  it('records a log with null userId for system actions', async () => {
    const repo = makeRepo();
    const record = buildRecordAudit(repo as never);

    await record({ action: 'system.cron', entityType: 'job', entityId: 'j-1' });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null, action: 'system.cron' }),
    );
  });

  it('records a log with userId for user actions', async () => {
    const repo = makeRepo();
    const record = buildRecordAudit(repo as never);

    await record({ userId: 'u-1', action: 'review.created', entityType: 'review', entityId: 'r-1' });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u-1' }));
  });

  it('defaults optional fields to null', async () => {
    const repo = makeRepo();
    const record = buildRecordAudit(repo as never);

    await record({ action: 'user.login', entityType: null, entityId: null });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: null,
        entity_id: null,
        ip_address: null,
        user_agent: null,
        metadata: null,
      }),
    );
  });
});

describe('AuditService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: AuditService;

  beforeEach(() => {
    repo = makeRepo();
    service = new AuditService({ auditLogs: repo as never });
  });

  it('lists audit logs with pagination and no filters', async () => {
    await service.list({}, 1, 20);

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { created_at: 'DESC' },
      skip: 0,
      take: 20,
    });
  });

  it('applies filters when provided', async () => {
    await service.list({ userId: 'u-1', action: 'review.created' }, 2, 10);

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { user_id: 'u-1', action: 'review.created' },
      order: { created_at: 'DESC' },
      skip: 10,
      take: 10,
    });
  });

  it('maps rows to response shape', async () => {
    repo.findAndCount.mockResolvedValueOnce([
      [
        {
          id: 'a-1',
          user_id: null,
          action: 'system.cron',
          entity_type: 'job',
          entity_id: 'j-1',
          ip_address: null,
          user_agent: null,
          metadata: null,
          created_at: new Date('2026-07-01T12:00:00.000Z'),
        },
      ],
      1,
    ]);

    const result = await service.list({}, 1, 20);

    expect(result).toEqual({
      items: [
        {
          id: 'a-1',
          userId: null,
          action: 'system.cron',
          entityType: 'job',
          entityId: 'j-1',
          ipAddress: null,
          userAgent: null,
          metadata: null,
          createdAt: '2026-07-01T12:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
  });
});
