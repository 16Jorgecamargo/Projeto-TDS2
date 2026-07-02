import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { FeesService, DEFAULT_PLATFORM_FEE_PERCENTAGE } from './fees.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { PlatformFee } from '../../infra/database/entities/platform-fee.entity.js';

describe('FeesService', () => {
  let fees: ReturnType<typeof mockRepo<PlatformFee>>;
  let service: FeesService;

  beforeEach(() => {
    fees = mockRepo<PlatformFee>();
    service = new FeesService({ fees: fees as unknown as Repository<PlatformFee> });
  });

  it('usa percentual padrao', () => {
    expect(DEFAULT_PLATFORM_FEE_PERCENTAGE).toBe(10);
  });

  it('computa taxa arredondada em 2 casas para valor exato', () => {
    expect(service.computeFee(300)).toEqual({ percentage: 10, amount: 30 });
  });

  it('computa taxa arredondada em 2 casas para valor quebrado', () => {
    expect(service.computeFee(99.99)).toEqual({ percentage: 10, amount: 10 });
  });

  describe('recordFee', () => {
    it('grava taxa com formato DECIMAL e retorna amount como number', async () => {
      fees.save.mockImplementationOnce(async (value: PlatformFee) => ({
        ...value,
        id: 'f1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const result = await service.recordFee('p1', 300);

      expect(fees.create).toHaveBeenCalledWith({
        payment_id: 'p1',
        percentage: '10.00',
        amount: '30.00',
      });
      expect(fees.save).toHaveBeenCalledWith(
        expect.objectContaining({ payment_id: 'p1', percentage: '10.00', amount: '30.00' }),
      );
      expect(result.amount).toBe(30);
      expect(typeof result.amount).toBe('number');
      expect(result.paymentId).toBe('p1');
      expect(result.createdAt).toBe('2026-07-01T12:00:00.000Z');
    });
  });

  describe('findByPayment', () => {
    it('retorna null quando nao existe taxa para o pagamento', async () => {
      fees.findOne.mockResolvedValueOnce(null);

      const result = await service.findByPayment('p-inexistente');

      expect(result).toBeNull();
      expect(fees.findOne).toHaveBeenCalledWith({ where: { payment_id: 'p-inexistente' } });
    });

    it('retorna a taxa mapeada quando existe', async () => {
      fees.findOne.mockResolvedValueOnce({
        id: 'f2',
        payment_id: 'p2',
        percentage: '10.00',
        amount: '30.00',
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as PlatformFee);

      const result = await service.findByPayment('p2');

      expect(result).toEqual({
        id: 'f2',
        paymentId: 'p2',
        percentage: 10,
        amount: 30,
        createdAt: '2026-07-01T12:00:00.000Z',
      });
    });
  });
});
