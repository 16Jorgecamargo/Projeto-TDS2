import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { RefundsService } from './refunds.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { Refund } from '../../infra/database/entities/refund.entity.js';
import type { Payment } from '../../infra/database/entities/payment.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { FeesService } from '../fees/fees.service.js';

describe('RefundsService', () => {
  let refunds: ReturnType<typeof mockRepo<Refund>>;
  let payments: ReturnType<typeof mockRepo<Payment>>;
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let professionals: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let wallet: { debit: ReturnType<typeof vi.fn>; credit: ReturnType<typeof vi.fn> };
  let fees: { findByPayment: ReturnType<typeof vi.fn> };
  let service: RefundsService;

  beforeEach(() => {
    refunds = mockRepo<Refund>();
    payments = mockRepo<Payment>();
    contracts = mockRepo<Contract>();
    professionals = mockRepo<ProfessionalProfile>();
    wallet = {
      debit: vi.fn(async () => ({})),
      credit: vi.fn(async () => ({})),
    };
    fees = {
      findByPayment: vi.fn(async () => ({
        id: 'f1',
        paymentId: 'p1',
        percentage: 10,
        amount: 30,
        createdAt: '2026-07-01T12:00:00Z',
      })),
    };
    service = new RefundsService({
      refunds: refunds as unknown as Repository<Refund>,
      payments: payments as unknown as Repository<Payment>,
      contracts: contracts as unknown as Repository<Contract>,
      professionals: professionals as unknown as Repository<ProfessionalProfile>,
      wallet: wallet as unknown as WalletService,
      fees: fees as unknown as FeesService,
    });
  });

  describe('refund', () => {
    it('estorna profissional pelo líquido e devolve ao pagador quando carteira', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'wallet',
      });
      contracts.findOne.mockResolvedValueOnce({ id: 'c1', professional_id: 'prof1' });
      professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
      payments.save.mockImplementationOnce(async (x: Partial<Payment>) => x);
      refunds.save.mockImplementationOnce(async (x: Partial<Refund>) => ({
        id: 'r1',
        created_at: new Date('2026-07-01T12:00:00Z'),
        ...x,
      }));

      const result = await service.refund('p1', { reason: 'cancelado' });

      expect(wallet.debit).toHaveBeenCalledWith('prouser1', 270, expect.objectContaining({ type: 'refund' }));
      expect(wallet.credit).toHaveBeenCalledWith('cl1', 300, expect.objectContaining({ type: 'refund' }));
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(300);
      expect(typeof result.amount).toBe('number');
    });

    it('não credita pagador quando método externo', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'pix',
      });
      contracts.findOne.mockResolvedValueOnce({ id: 'c1', professional_id: 'prof1' });
      professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
      payments.save.mockImplementationOnce(async (x: Partial<Payment>) => x);
      refunds.save.mockImplementationOnce(async (x: Partial<Refund>) => ({
        id: 'r1',
        created_at: new Date('2026-07-01T12:00:00Z'),
        ...x,
      }));

      await service.refund('p1', { reason: null });

      expect(wallet.credit).not.toHaveBeenCalled();
      expect(wallet.debit).toHaveBeenCalledWith('prouser1', 270, expect.objectContaining({ type: 'refund' }));
    });

    it('rejeita estorno de pagamento não capturado', async () => {
      payments.findOne.mockResolvedValueOnce({ id: 'p1', status: 'pending', method: 'wallet' });

      await expect(service.refund('p1', { reason: null })).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('lança NotFoundError quando pagamento não existe', async () => {
      payments.findOne.mockResolvedValueOnce(null);

      await expect(service.refund('p1', { reason: null })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lança NotFoundError quando contrato não existe', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'wallet',
      });
      contracts.findOne.mockResolvedValueOnce(null);

      await expect(service.refund('p1', { reason: null })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lança NotFoundError quando profissional não existe', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'wallet',
      });
      contracts.findOne.mockResolvedValueOnce({ id: 'c1', professional_id: 'prof1' });
      professionals.findOne.mockResolvedValueOnce(null);

      await expect(service.refund('p1', { reason: null })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('listByPayment', () => {
    it('retorna estornos do pagamento ordenados por data', async () => {
      refunds.find.mockResolvedValueOnce([
        {
          id: 'r2',
          payment_id: 'p1',
          amount: '300.00',
          reason: null,
          status: 'completed',
          processed_at: new Date('2026-07-02T12:00:00Z'),
          created_at: new Date('2026-07-02T12:00:00Z'),
        },
        {
          id: 'r1',
          payment_id: 'p1',
          amount: '300.00',
          reason: 'cancelado',
          status: 'completed',
          processed_at: new Date('2026-07-01T12:00:00Z'),
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ]);

      const result = await service.listByPayment('p1');

      expect(result).toHaveLength(2);
      expect(refunds.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { payment_id: 'p1' },
          order: { created_at: 'DESC' },
        }),
      );
      expect(result[0]?.id).toBe('r2');
    });
  });
});
