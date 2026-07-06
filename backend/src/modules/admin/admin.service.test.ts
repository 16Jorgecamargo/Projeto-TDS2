import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AdminService, fillDateGaps } from './admin.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { User } from '../../infra/database/entities/user.entity.js';
import type { Report } from '../../infra/database/entities/report.entity.js';
import type { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import type { Payment } from '../../infra/database/entities/payment.entity.js';
import type { Withdrawal } from '../../infra/database/entities/withdrawal.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { Refund } from '../../infra/database/entities/refund.entity.js';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
import type { DisputeService } from '../dispute/dispute.service.js';

describe('AdminService', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let reports: ReturnType<typeof mockRepo<Report>>;
  let disputes: ReturnType<typeof mockRepo<ContractDispute>>;
  let payments: ReturnType<typeof mockRepo<Payment>>;
  let withdrawals: ReturnType<typeof mockRepo<Withdrawal>>;
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let demands: ReturnType<typeof mockRepo<ServiceDemand>>;
  let refunds: ReturnType<typeof mockRepo<Refund>>;
  let wallets: ReturnType<typeof mockRepo<Wallet>>;
  let disputeService: { resolve: ReturnType<typeof vi.fn> };
  let recordAudit: ReturnType<typeof vi.fn>;
  let enqueueNotification: ReturnType<typeof vi.fn>;
  let service: AdminService;

  beforeEach(() => {
    users = mockRepo<User>();
    reports = mockRepo<Report>();
    disputes = mockRepo<ContractDispute>();
    payments = mockRepo<Payment>();
    withdrawals = mockRepo<Withdrawal>();
    contracts = mockRepo<Contract>();
    demands = mockRepo<ServiceDemand>();
    refunds = mockRepo<Refund>();
    wallets = mockRepo<Wallet>();
    disputeService = { resolve: vi.fn() };
    recordAudit = vi.fn().mockResolvedValue(undefined);
    enqueueNotification = vi.fn().mockResolvedValue(undefined);
    service = new AdminService({
      users: users as unknown as Repository<User>,
      reports: reports as unknown as Repository<Report>,
      disputes: disputes as unknown as Repository<ContractDispute>,
      payments: payments as unknown as Repository<Payment>,
      withdrawals: withdrawals as unknown as Repository<Withdrawal>,
      contracts: contracts as unknown as Repository<Contract>,
      demands: demands as unknown as Repository<ServiceDemand>,
      refunds: refunds as unknown as Repository<Refund>,
      wallets: wallets as unknown as Repository<Wallet>,
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

  describe('listUsers', () => {
    it('lista usuarios paginados com filtros de busca, role e status', async () => {
      const qb = users.createQueryBuilder();
      vi.mocked(qb.getManyAndCount).mockResolvedValueOnce([
        [
          {
            id: 'u-1',
            full_name: 'Joao Silva',
            email: 'joao@example.com',
            role: 'client',
            status: 'active',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        1,
      ] as never);

      const result = await service.listUsers('joao', 'client', 'active', 1, 20);

      expect(result).toEqual({
        items: [
          {
            id: 'u-1',
            full_name: 'Joao Silva',
            email: 'joao@example.com',
            role: 'client',
            status: 'active',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: 'client' });
      expect(qb.andWhere).toHaveBeenCalledWith('user.status = :status', { status: 'active' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(user.full_name LIKE :search OR user.email LIKE :search)',
        { search: '%joao%' },
      );
    });

    it('sem filtros nao chama andWhere', async () => {
      const qb = users.createQueryBuilder();
      vi.mocked(qb.getManyAndCount).mockResolvedValueOnce([[], 0] as never);

      await service.listUsers(undefined, undefined, undefined, 1, 20);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('listPayments', () => {
    it('lista pagamentos paginados filtrando por status', async () => {
      payments.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'pay-1',
            contract_id: 'c-1',
            payer_id: 'u-1',
            amount: '150.00',
            status: 'captured',
            method: 'pix',
            paid_at: new Date('2026-01-02T00:00:00.000Z'),
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        1,
      ]);

      const result = await service.listPayments('captured', 1, 20);

      expect(result).toEqual({
        items: [
          {
            id: 'pay-1',
            contract_id: 'c-1',
            payer_id: 'u-1',
            amount: '150.00',
            status: 'captured',
            method: 'pix',
            paid_at: '2026-01-02T00:00:00.000Z',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
      expect(payments.findAndCount).toHaveBeenCalledWith({
        where: { status: 'captured' },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('sem status usa where vazio', async () => {
      payments.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.listPayments(undefined, 1, 20);

      expect(payments.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('listWithdrawals', () => {
    it('lista saques com status default pending quando nao informado', async () => {
      withdrawals.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'w-1',
            wallet_id: 'wal-1',
            amount: '200.00',
            payment_method: 'pix',
            status: 'pending',
            destination: 'chave-pix',
            processed_at: null,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        1,
      ]);

      const result = await service.listWithdrawals(undefined, 1, 20);

      expect(result).toEqual({
        items: [
          {
            id: 'w-1',
            wallet_id: 'wal-1',
            amount: '200.00',
            payment_method: 'pix',
            status: 'pending',
            destination: 'chave-pix',
            processed_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
      expect(withdrawals.findAndCount).toHaveBeenCalledWith({
        where: { status: 'pending' },
        order: { created_at: 'ASC' },
        skip: 0,
        take: 20,
      });
    });

    it('filtra por status explicito quando informado', async () => {
      withdrawals.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.listWithdrawals('completed', 1, 20);

      expect(withdrawals.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'completed' } }),
      );
    });
  });

  describe('fillDateGaps', () => {
    it('preenche dias sem registro com count 0, mantendo ordem cronologica', () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-03T00:00:00.000Z');
      const rows = [{ date: '2026-01-01', count: '3' }];

      const result = fillDateGaps(rows, from, to);

      expect(result).toEqual([
        { date: '2026-01-01', count: 3 },
        { date: '2026-01-02', count: 0 },
        { date: '2026-01-03', count: 0 },
      ]);
    });

    it('retorna array vazio quando from e to sao invertidos', () => {
      const from = new Date('2026-01-03T00:00:00.000Z');
      const to = new Date('2026-01-01T00:00:00.000Z');

      expect(fillDateGaps([], from, to)).toEqual([]);
    });
  });

  describe('getDashboard', () => {
    it('agrega contadores, pendencias, atividade e financeiro', async () => {
      users.count.mockResolvedValueOnce(42);
      contracts.count.mockResolvedValueOnce(10);
      demands.count.mockResolvedValueOnce(5);
      reports.count.mockResolvedValueOnce(3);
      withdrawals.count.mockResolvedValueOnce(2);

      const paymentsQb = payments.createQueryBuilder();
      vi.mocked(paymentsQb.getRawOne).mockResolvedValueOnce({ total: '18000.00' } as never);

      const refundsQb = refunds.createQueryBuilder();
      vi.mocked(refundsQb.getRawOne).mockResolvedValueOnce({ total: '2679.50' } as never);

      const disputesQb = disputes.createQueryBuilder();
      vi.mocked(disputesQb.getCount).mockResolvedValueOnce(4);

      const walletsQb = wallets.createQueryBuilder();
      vi.mocked(walletsQb.getRawOne).mockResolvedValueOnce({ total: '9450.00' } as never);

      const withdrawalsQb = withdrawals.createQueryBuilder();
      vi.mocked(withdrawalsQb.getRawOne).mockResolvedValueOnce({ total: '1200.00' } as never);

      const usersQb = users.createQueryBuilder();
      vi.mocked(usersQb.getRawMany).mockResolvedValueOnce([
        { date: '2026-01-01', count: '2' },
      ] as never);

      const contractsQb = contracts.createQueryBuilder();
      vi.mocked(contractsQb.getRawMany).mockResolvedValueOnce([
        { date: '2026-01-01', count: '1' },
      ] as never);

      const result = await service.getDashboard();

      expect(result.counters).toEqual({
        totalUsers: 42,
        activeContracts: 10,
        openDemands: 5,
        gmvLast30Days: '15320.50',
      });
      expect(result.pending).toEqual({ reports: 3, disputes: 4, withdrawals: 2 });
      expect(result.finance).toEqual({
        totalCaptured30d: '18000.00',
        totalRefunded30d: '2679.50',
        walletBalanceSum: '9450.00',
        pendingWithdrawalsAmount: '1200.00',
      });
      expect(result.activity.newUsersByDay.length).toBeGreaterThan(0);
      expect(result.activity.completedContractsByDay.length).toBeGreaterThan(0);
    });

    it('retorna "0.00" nas somas quando nao ha linhas', async () => {
      users.count.mockResolvedValueOnce(0);
      contracts.count.mockResolvedValueOnce(0);
      demands.count.mockResolvedValueOnce(0);
      reports.count.mockResolvedValueOnce(0);
      withdrawals.count.mockResolvedValueOnce(0);

      const paymentsQb = payments.createQueryBuilder();
      vi.mocked(paymentsQb.getRawOne).mockResolvedValueOnce({ total: '0' } as never);
      const refundsQb = refunds.createQueryBuilder();
      vi.mocked(refundsQb.getRawOne).mockResolvedValueOnce({ total: '0' } as never);
      const disputesQb = disputes.createQueryBuilder();
      vi.mocked(disputesQb.getCount).mockResolvedValueOnce(0);
      const walletsQb = wallets.createQueryBuilder();
      vi.mocked(walletsQb.getRawOne).mockResolvedValueOnce({ total: '0' } as never);
      const withdrawalsQb = withdrawals.createQueryBuilder();
      vi.mocked(withdrawalsQb.getRawOne).mockResolvedValueOnce({ total: '0' } as never);
      const usersQb = users.createQueryBuilder();
      vi.mocked(usersQb.getRawMany).mockResolvedValueOnce([] as never);
      const contractsQb = contracts.createQueryBuilder();
      vi.mocked(contractsQb.getRawMany).mockResolvedValueOnce([] as never);

      const result = await service.getDashboard();

      expect(result.counters.gmvLast30Days).toBe('0.00');
      expect(result.finance).toEqual({
        totalCaptured30d: '0.00',
        totalRefunded30d: '0.00',
        walletBalanceSum: '0.00',
        pendingWithdrawalsAmount: '0.00',
      });
    });
  });
});
