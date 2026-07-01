import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { DisputeService } from './dispute.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import type { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';

describe('DisputeService', () => {
  let disputes: ReturnType<typeof mockRepo<ContractDispute>>;
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let service: DisputeService;

  beforeEach(() => {
    disputes = mockRepo<ContractDispute>();
    contracts = mockRepo<Contract>();
    service = new DisputeService({
      disputes: disputes as unknown as Repository<ContractDispute>,
      contracts: contracts as unknown as Repository<Contract>,
    });
  });

  describe('open', () => {
    it('abre disputa e marca contrato como disputed usando o proprio user id do cliente', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      disputes.findOne.mockResolvedValueOnce(null);
      disputes.save.mockImplementationOnce(async (value: ContractDispute) => ({
        ...value,
        id: 'dispute-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      contracts.save.mockImplementationOnce(async (value: Contract) => value);

      const result = await service.open(
        'contract-1',
        { userId: 'client-1', professionalId: null },
        'x'.repeat(10),
      );

      expect(result.status).toBe('open');
      expect(result.openedBy).toBe('client-1');
      expect(contracts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'disputed' }));
    });

    it('permite ao profissional abrir disputa usando o profile id, nao o user id', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      disputes.findOne.mockResolvedValueOnce(null);
      disputes.save.mockImplementationOnce(async (value: ContractDispute) => ({
        ...value,
        id: 'dispute-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      contracts.save.mockImplementationOnce(async (value: Contract) => value);

      const result = await service.open(
        'contract-1',
        { userId: 'user-pro-1', professionalId: 'pro-1' },
        'x'.repeat(10),
      );

      expect(result.status).toBe('open');
      expect(result.openedBy).toBe('user-pro-1');
    });

    it('lanca ForbiddenError quando profissional informa o proprio user id em vez do profile id', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.open('contract-1', { userId: 'pro-1', professionalId: null }, 'x'.repeat(10)),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(disputes.save).not.toHaveBeenCalled();
    });

    it('bloqueia nao-participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.open('contract-1', { userId: 'estranho', professionalId: null }, 'x'.repeat(10)),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca NotFoundError quando contrato nao existe', async () => {
      contracts.findOne.mockResolvedValueOnce(null);
      await expect(
        service.open('contract-x', { userId: 'client-1', professionalId: null }, 'x'.repeat(10)),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('bloqueia abertura em contrato com status terminal', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'cancelled',
      } as Contract);
      await expect(
        service.open('contract-1', { userId: 'client-1', professionalId: null }, 'x'.repeat(10)),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('bloqueia disputa duplicada quando ja existe disputa aberta', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      disputes.findOne.mockResolvedValueOnce({
        id: 'dispute-existing',
        contract_id: 'contract-1',
        status: 'open',
      } as ContractDispute);
      await expect(
        service.open('contract-1', { userId: 'client-1', professionalId: null }, 'x'.repeat(10)),
      ).rejects.toBeInstanceOf(UnprocessableError);
      expect(contracts.save).not.toHaveBeenCalled();
    });
  });

  describe('listByContract', () => {
    it('lanca NotFoundError quando contrato nao existe', async () => {
      contracts.findOne.mockResolvedValueOnce(null);
      await expect(
        service.listByContract('contract-x', { userId: 'client-1', professionalId: null }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanca ForbiddenError quando nao e participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'disputed',
      } as Contract);
      await expect(
        service.listByContract('contract-1', { userId: 'estranho', professionalId: null }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('permite ao profissional listar usando o profile id', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'disputed',
      } as Contract);
      disputes.find.mockResolvedValueOnce([
        {
          id: 'dispute-1',
          contract_id: 'contract-1',
          opened_by: 'client-1',
          reason: 'x'.repeat(10),
          status: 'open',
          resolution: null,
          created_at: new Date('2026-07-01T12:00:00Z'),
        } as ContractDispute,
      ]);
      const result = await service.listByContract('contract-1', { userId: 'user-pro-1', professionalId: 'pro-1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('resolve', () => {
    it('lanca NotFoundError quando disputa nao existe', async () => {
      disputes.findOne.mockResolvedValueOnce(null);
      await expect(service.resolve('dispute-x', 'resolved', 'motivo')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('resolve disputa aberta', async () => {
      disputes.findOne.mockResolvedValueOnce({
        id: 'dispute-1',
        contract_id: 'contract-1',
        opened_by: 'client-1',
        reason: 'x'.repeat(10),
        status: 'open',
        resolution: null,
        resolved_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ContractDispute);
      disputes.save.mockImplementationOnce(async (value: ContractDispute) => value);

      const result = await service.resolve('dispute-1', 'resolved', 'Reembolso parcial');

      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('Reembolso parcial');
    });

    it('lanca UnprocessableError quando disputa ja esta encerrada', async () => {
      disputes.findOne.mockResolvedValueOnce({
        id: 'dispute-1',
        contract_id: 'contract-1',
        opened_by: 'client-1',
        reason: 'x'.repeat(10),
        status: 'resolved',
        resolution: 'ja resolvido',
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ContractDispute);
      await expect(service.resolve('dispute-1', 'rejected', 'motivo')).rejects.toBeInstanceOf(UnprocessableError);
    });
  });
});
