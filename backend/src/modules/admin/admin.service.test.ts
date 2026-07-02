import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AdminService } from './admin.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { User } from '../../infra/database/entities/user.entity.js';
import type { Report } from '../../infra/database/entities/report.entity.js';
import type { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import type { DisputeService } from '../dispute/dispute.service.js';

describe('AdminService', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let reports: ReturnType<typeof mockRepo<Report>>;
  let disputes: ReturnType<typeof mockRepo<ContractDispute>>;
  let disputeService: { resolve: ReturnType<typeof vi.fn> };
  let recordAudit: ReturnType<typeof vi.fn>;
  let enqueueNotification: ReturnType<typeof vi.fn>;
  let service: AdminService;

  beforeEach(() => {
    users = mockRepo<User>();
    reports = mockRepo<Report>();
    disputes = mockRepo<ContractDispute>();
    disputeService = { resolve: vi.fn() };
    recordAudit = vi.fn().mockResolvedValue(undefined);
    enqueueNotification = vi.fn().mockResolvedValue(undefined);
    service = new AdminService({
      users: users as unknown as Repository<User>,
      reports: reports as unknown as Repository<Report>,
      disputes: disputes as unknown as Repository<ContractDispute>,
      disputeService: disputeService as unknown as DisputeService,
      recordAudit,
      enqueueNotification,
    });
  });

  describe('setUserStatus', () => {
    it('suspende usuario, audita e notifica', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-1', status: 'active' });

      const result = await service.setUserStatus('admin-1', 'u-1', { status: 'suspended', reason: 'x' });

      expect(result.status).toBe('suspended');
      expect(users.update).toHaveBeenCalledWith({ id: 'u-1' }, { status: 'suspended' });
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', action: 'admin.user.status_changed', entityId: 'u-1' }),
      );
      expect(enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-1' }));
    });

    it('lanca NotFoundError ao moderar usuario inexistente', async () => {
      users.findOne.mockResolvedValueOnce(null);

      await expect(
        service.setUserStatus('admin-1', 'nope', { status: 'suspended', reason: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(users.update).not.toHaveBeenCalled();
    });
  });

  describe('resolveReport', () => {
    it('resolve denuncia e audita', async () => {
      reports.findOne.mockResolvedValueOnce({ id: 'rep-1', status: 'pending' });

      const result = await service.resolveReport('admin-1', 'rep-1', { resolution: 'actioned' });

      expect(result.status).toBe('actioned');
      expect(reports.update).toHaveBeenCalledWith({ id: 'rep-1' }, { status: 'actioned', reviewed_by: 'admin-1' });
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.report.resolved', entityId: 'rep-1' }),
      );
    });

    it('lanca NotFoundError para denuncia inexistente', async () => {
      reports.findOne.mockResolvedValueOnce(null);

      await expect(
        service.resolveReport('admin-1', 'nope', { resolution: 'dismissed' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('resolveDispute', () => {
    it('resolve disputa delegando ao DisputeService, audita e notifica com outcome', async () => {
      disputes.findOne.mockResolvedValueOnce({ id: 'disp-1', status: 'open', opened_by: 'client-1' });
      disputeService.resolve.mockResolvedValueOnce({ id: 'disp-1', status: 'resolved', resolution: 'Reembolso' });

      const result = await service.resolveDispute('admin-1', 'disp-1', {
        outcome: 'refund_client',
        note: 'Servico nao entregue',
      });

      expect(result.status).toBe('resolved');
      expect(result.outcome).toBe('refund_client');
      expect(disputeService.resolve).toHaveBeenCalledWith('disp-1', 'resolved', 'Servico nao entregue');
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.dispute.resolved',
          entityId: 'disp-1',
          metadata: expect.objectContaining({ outcome: 'refund_client' }),
        }),
      );
      expect(enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'client-1' }));
    });

    it('lanca NotFoundError para disputa inexistente', async () => {
      disputes.findOne.mockResolvedValueOnce(null);

      await expect(
        service.resolveDispute('admin-1', 'nope', { outcome: 'refund_client', note: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(disputeService.resolve).not.toHaveBeenCalled();
    });

    it('lanca UnprocessableError para disputa ja encerrada', async () => {
      disputes.findOne.mockResolvedValueOnce({ id: 'disp-1', status: 'resolved', opened_by: 'client-1' });

      await expect(
        service.resolveDispute('admin-1', 'disp-1', { outcome: 'refund_client', note: 'x' }),
      ).rejects.toBeInstanceOf(UnprocessableError);
      expect(disputeService.resolve).not.toHaveBeenCalled();
    });
  });
});
