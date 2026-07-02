import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { WithdrawalsService } from './withdrawals.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { Withdrawal } from '../../infra/database/entities/withdrawal.entity.js';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
import type { WalletService } from '../wallet/wallet.service.js';

describe('WithdrawalsService', () => {
  let withdrawals: ReturnType<typeof mockRepo<Withdrawal>>;
  let wallets: ReturnType<typeof mockRepo<Wallet>>;
  let wallet: { debit: ReturnType<typeof vi.fn>; ensureWallet: ReturnType<typeof vi.fn> };
  let service: WithdrawalsService;

  beforeEach(() => {
    withdrawals = mockRepo<Withdrawal>();
    wallets = mockRepo<Wallet>();
    wallet = {
      debit: vi.fn(async () => ({})),
      ensureWallet: vi.fn(async () => ({ id: 'w1', user_id: 'u1', balance: '300.00' })),
    };
    service = new WithdrawalsService({
      withdrawals: withdrawals as unknown as Repository<Withdrawal>,
      wallets: wallets as unknown as Repository<Wallet>,
      wallet: wallet as unknown as WalletService,
    });
  });

  describe('request', () => {
    it('debita a carteira e cria saque pending com a mesma referencia', async () => {
      withdrawals.save.mockImplementationOnce(async (x: Partial<Withdrawal>) => ({
        created_at: new Date('2026-07-01T12:00:00Z'),
        ...x,
      }));

      const result = await service.request('u1', { amount: 200, paymentMethod: 'pix', destination: 'user@pix.com' });

      expect(result.status).toBe('pending');
      expect(result.amount).toBe(200);
      expect(result.paymentMethod).toBe('pix');
      expect(wallet.debit).toHaveBeenCalledWith('u1', 200, expect.objectContaining({ type: 'withdrawal' }));

      const debitRef = wallet.debit.mock.calls[0]?.[2];
      expect(debitRef.id).toBe(result.id);
      expect(withdrawals.save).toHaveBeenCalledWith(expect.objectContaining({ id: result.id }));
    });

    it('propaga saldo insuficiente sem persistir nenhum saque', async () => {
      wallet.debit.mockRejectedValueOnce(new UnprocessableError('Saldo insuficiente'));

      await expect(
        service.request('u1', { amount: 999, paymentMethod: 'pix', destination: 'x' }),
      ).rejects.toBeInstanceOf(UnprocessableError);

      expect(withdrawals.create).not.toHaveBeenCalled();
      expect(withdrawals.save).not.toHaveBeenCalled();
    });
  });

  describe('listMine', () => {
    it('retorna saques da propria carteira ordenados por data', async () => {
      withdrawals.find.mockResolvedValueOnce([
        {
          id: 'wd2',
          wallet_id: 'w1',
          amount: '150.00',
          payment_method: 'pix',
          status: 'completed',
          destination: 'x',
          processed_at: new Date('2026-07-02T12:00:00Z'),
          created_at: new Date('2026-07-02T12:00:00Z'),
        },
        {
          id: 'wd1',
          wallet_id: 'w1',
          amount: '200.00',
          payment_method: 'pix',
          status: 'pending',
          destination: 'x',
          processed_at: null,
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ]);

      const result = await service.listMine('u1');

      expect(result).toHaveLength(2);
      expect(withdrawals.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { wallet_id: 'w1' },
          order: { created_at: 'DESC' },
        }),
      );
      expect(result[0]?.id).toBe('wd2');
    });
  });

  describe('process', () => {
    it('conclui saque pendente', async () => {
      withdrawals.findOne.mockResolvedValueOnce({
        id: 'wd1',
        wallet_id: 'w1',
        amount: '200.00',
        payment_method: 'pix',
        status: 'pending',
        destination: 'x',
        processed_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      });
      withdrawals.save.mockImplementationOnce(async (x: Partial<Withdrawal>) => x as Withdrawal);

      const result = await service.process('wd1');

      expect(result.status).toBe('completed');
      expect(result.processedAt).not.toBeNull();
    });

    it('conclui saque em processing', async () => {
      withdrawals.findOne.mockResolvedValueOnce({
        id: 'wd1',
        wallet_id: 'w1',
        amount: '200.00',
        payment_method: 'pix',
        status: 'processing',
        destination: 'x',
        processed_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      });
      withdrawals.save.mockImplementationOnce(async (x: Partial<Withdrawal>) => x as Withdrawal);

      const result = await service.process('wd1');

      expect(result.status).toBe('completed');
    });

    it('rejeita saque ja concluido', async () => {
      withdrawals.findOne.mockResolvedValueOnce({
        id: 'wd1',
        wallet_id: 'w1',
        amount: '200.00',
        payment_method: 'pix',
        status: 'completed',
        destination: 'x',
        processed_at: new Date('2026-07-01T12:00:00Z'),
        created_at: new Date('2026-07-01T12:00:00Z'),
      });

      await expect(service.process('wd1')).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('rejeita saque ja falho', async () => {
      withdrawals.findOne.mockResolvedValueOnce({
        id: 'wd1',
        wallet_id: 'w1',
        amount: '200.00',
        payment_method: 'pix',
        status: 'failed',
        destination: 'x',
        processed_at: new Date('2026-07-01T12:00:00Z'),
        created_at: new Date('2026-07-01T12:00:00Z'),
      });

      await expect(service.process('wd1')).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('lanca NotFoundError quando saque nao existe', async () => {
      withdrawals.findOne.mockResolvedValueOnce(null);

      await expect(service.process('wd1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
