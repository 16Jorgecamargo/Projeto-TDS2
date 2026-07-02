import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { PaymentService } from './payment.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { Payment } from '../../infra/database/entities/payment.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { FeesService } from '../fees/fees.service.js';

describe('PaymentService', () => {
  let payments: ReturnType<typeof mockRepo<Payment>>;
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let professionals: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let wallet: { debit: ReturnType<typeof vi.fn>; credit: ReturnType<typeof vi.fn> };
  let fees: { recordFee: ReturnType<typeof vi.fn>; findByPayment: ReturnType<typeof vi.fn> };
  let service: PaymentService;

  beforeEach(() => {
    payments = mockRepo<Payment>();
    contracts = mockRepo<Contract>();
    professionals = mockRepo<ProfessionalProfile>();
    wallet = {
      debit: vi.fn(async () => ({})),
      credit: vi.fn(async () => ({})),
    };
    fees = {
      recordFee: vi.fn(async () => ({
        id: 'f1',
        paymentId: 'p1',
        percentage: 10,
        amount: 30,
        createdAt: '2026-07-01T12:00:00Z',
      })),
      findByPayment: vi.fn(async () => null),
    };
    service = new PaymentService({
      payments: payments as unknown as Repository<Payment>,
      contracts: contracts as unknown as Repository<Contract>,
      professionals: professionals as unknown as Repository<ProfessionalProfile>,
      wallet: wallet as unknown as WalletService,
      fees: fees as unknown as FeesService,
    });
  });

  describe('payContract', () => {
    it('debita pagador, registra taxa e credita profissional pelo líquido', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'c1',
        client_id: 'cl1',
        professional_id: 'prof1',
        total_amount: '300.00',
        status: 'completed',
      });
      payments.findOne.mockResolvedValueOnce(null);
      professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
      payments.save
        .mockImplementationOnce(async (x: Partial<Payment>) => ({
          id: 'p1',
          created_at: new Date('2026-07-01T12:00:00Z'),
          ...x,
        }))
        .mockImplementationOnce(async (x: Partial<Payment>) => ({ ...x }));

      const result = await service.payContract('cl1', 'c1', { method: 'wallet' });

      expect(wallet.debit).toHaveBeenCalledWith('cl1', 300, expect.objectContaining({ type: 'payment' }));
      expect(fees.recordFee).toHaveBeenCalledWith('p1', 300);
      expect(wallet.credit).toHaveBeenCalledWith(
        'prouser1',
        270,
        expect.objectContaining({ type: 'payment' }),
      );
      expect(result.status).toBe('captured');
      expect(result.amount).toBe(300);
      expect(typeof result.amount).toBe('number');
    });

    it('não debita carteira quando método externo', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'c1',
        client_id: 'cl1',
        professional_id: 'prof1',
        total_amount: '300.00',
        status: 'completed',
      });
      payments.findOne.mockResolvedValueOnce(null);
      professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
      payments.save.mockImplementation(async (x: Partial<Payment>) => ({
        id: 'p1',
        created_at: new Date('2026-07-01T12:00:00Z'),
        ...x,
      }));

      await service.payContract('cl1', 'c1', { method: 'pix' });

      expect(wallet.debit).not.toHaveBeenCalled();
      expect(wallet.credit).toHaveBeenCalledWith(
        'prouser1',
        270,
        expect.objectContaining({ type: 'payment' }),
      );
    });

    it('rejeita pagamento já capturado', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'c1',
        client_id: 'cl1',
        professional_id: 'prof1',
        total_amount: '300.00',
        status: 'completed',
      });
      payments.findOne.mockResolvedValueOnce({ id: 'p0', status: 'captured' });

      await expect(service.payContract('cl1', 'c1', { method: 'wallet' })).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('rejeita contrato inexistente', async () => {
      contracts.findOne.mockResolvedValueOnce(null);

      await expect(service.payContract('cl1', 'c1', { method: 'wallet' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('rejeita pagador que não é o cliente do contrato', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'c1',
        client_id: 'other',
        professional_id: 'prof1',
        total_amount: '300.00',
        status: 'completed',
      });

      await expect(service.payContract('cl1', 'c1', { method: 'wallet' })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it.each(['cancelled', 'disputed'] as const)(
      'rejeita contrato com status %s',
      async (status) => {
        contracts.findOne.mockResolvedValueOnce({
          id: 'c1',
          client_id: 'cl1',
          professional_id: 'prof1',
          total_amount: '300.00',
          status,
        });

        await expect(service.payContract('cl1', 'c1', { method: 'wallet' })).rejects.toBeInstanceOf(
          UnprocessableError,
        );
      },
    );
  });

  describe('getById', () => {
    it('retorna pagamento existente', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'wallet',
        paid_at: new Date('2026-07-01T12:00:00Z'),
        created_at: new Date('2026-07-01T12:00:00Z'),
      });

      const result = await service.getById('p1');

      expect(result.id).toBe('p1');
      expect(result.amount).toBe(300);
    });

    it('lança NotFoundError quando pagamento não existe', async () => {
      payments.findOne.mockResolvedValueOnce(null);

      await expect(service.getById('p1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getByContract', () => {
    it('retorna pagamento mais recente do contrato', async () => {
      payments.findOne.mockResolvedValueOnce({
        id: 'p1',
        contract_id: 'c1',
        payer_id: 'cl1',
        amount: '300.00',
        status: 'captured',
        method: 'wallet',
        paid_at: new Date('2026-07-01T12:00:00Z'),
        created_at: new Date('2026-07-01T12:00:00Z'),
      });

      const result = await service.getByContract('c1');

      expect(result.contractId).toBe('c1');
    });

    it('lança NotFoundError quando contrato não tem pagamento', async () => {
      payments.findOne.mockResolvedValueOnce(null);

      await expect(service.getByContract('c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getFee', () => {
    it('retorna taxa do pagamento', async () => {
      fees.findByPayment.mockResolvedValueOnce({
        id: 'f1',
        paymentId: 'p1',
        percentage: 10,
        amount: 30,
        createdAt: '2026-07-01T12:00:00Z',
      });

      const result = await service.getFee('p1');

      expect(result.id).toBe('f1');
    });

    it('lança NotFoundError quando taxa não existe', async () => {
      fees.findByPayment.mockResolvedValueOnce(null);

      await expect(service.getFee('p1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
