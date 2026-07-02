import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { WalletService } from './wallet.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { UnprocessableError } from '../../shared/errors.js';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
import type { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';

describe('WalletService', () => {
  let wallets: ReturnType<typeof mockRepo<Wallet>>;
  let transactions: ReturnType<typeof mockRepo<WalletTransaction>>;
  let service: WalletService;

  beforeEach(() => {
    wallets = mockRepo<Wallet>();
    transactions = mockRepo<WalletTransaction>();
    service = new WalletService({
      wallets: wallets as unknown as Repository<Wallet>,
      transactions: transactions as unknown as Repository<WalletTransaction>,
    });
  });

  describe('ensureWallet', () => {
    it('retorna carteira existente sem criar duplicata', async () => {
      wallets.findOne.mockResolvedValueOnce({
        id: 'w1',
        user_id: 'u1',
        balance: '100.00',
        pending_balance: '0.00',
        currency: 'BRL',
      } as Wallet);

      const wallet = await service.ensureWallet('u1');

      expect(wallet.id).toBe('w1');
      expect(wallets.save).not.toHaveBeenCalled();
    });

    it('cria nova carteira com saldos zerados quando nao existe', async () => {
      wallets.findOne.mockResolvedValueOnce(null);
      wallets.save.mockImplementationOnce(async (value: Wallet) => ({
        ...value,
        id: 'w2',
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const wallet = await service.ensureWallet('u2');

      expect(wallets.create).toHaveBeenCalledWith({
        user_id: 'u2',
        balance: '0.00',
        pending_balance: '0.00',
        currency: 'BRL',
      });
      expect(wallet.id).toBe('w2');
    });
  });

  describe('getByUserId', () => {
    it('aciona ensureWallet para auto-provisionar carteira', async () => {
      wallets.findOne.mockResolvedValueOnce(null);
      wallets.save.mockImplementationOnce(async (value: Wallet) => ({
        ...value,
        id: 'w3',
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const response = await service.getByUserId('u3');

      expect(response.userId).toBe('u3');
      expect(response.balance).toBe(0);
      expect(response.updatedAt).toBe('2026-07-01T12:00:00.000Z');
    });
  });

  describe('listTransactions', () => {
    it('filtra por tipo e pagina corretamente', async () => {
      wallets.findOne.mockResolvedValueOnce({
        id: 'w1',
        user_id: 'u1',
        balance: '100.00',
        pending_balance: '0.00',
        currency: 'BRL',
      } as Wallet);
      transactions.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 't1',
            wallet_id: 'w1',
            type: 'credit',
            amount: '50.00',
            balance_after: '150.00',
            reference_type: 'payment',
            reference_id: 'p1',
            description: null,
            created_at: new Date('2026-07-01T12:00:00Z'),
          } as WalletTransaction,
        ],
        1,
      ]);

      const result = await service.listTransactions('u1', { type: 'credit', page: 2, limit: 5 });

      expect(transactions.findAndCount).toHaveBeenCalledWith({
        where: { wallet_id: 'w1', type: 'credit' },
        order: { created_at: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]?.amount).toBe(50);
    });
  });

  describe('credit', () => {
    it('soma ao saldo e grava balance_after (string DECIMAL -> Number)', async () => {
      wallets.findOne.mockResolvedValueOnce({
        id: 'w1',
        user_id: 'u1',
        balance: '100.00',
        pending_balance: '0.00',
        currency: 'BRL',
      } as Wallet);
      wallets.save.mockImplementationOnce(async (value: Wallet) => value);
      transactions.save.mockImplementationOnce(async (value: WalletTransaction) => ({
        ...value,
        id: 't1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const tx = await service.credit('u1', 170, { type: 'payment', id: 'p1' });

      expect(tx.amount).toBe('170.00');
      expect(tx.balance_after).toBe('270.00');
      expect(wallets.save).toHaveBeenCalledWith(expect.objectContaining({ balance: '270.00' }));
    });
  });

  describe('debit', () => {
    it('rejeita saldo insuficiente', async () => {
      wallets.findOne.mockResolvedValueOnce({
        id: 'w1',
        user_id: 'u1',
        balance: '50.00',
        pending_balance: '0.00',
        currency: 'BRL',
      } as Wallet);

      await expect(service.debit('u1', 100, { type: 'withdrawal', id: 'wd1' })).rejects.toBeInstanceOf(
        UnprocessableError,
      );
      expect(wallets.save).not.toHaveBeenCalled();
    });

    it('subtrai do saldo quando suficiente', async () => {
      wallets.findOne.mockResolvedValueOnce({
        id: 'w1',
        user_id: 'u1',
        balance: '300.00',
        pending_balance: '0.00',
        currency: 'BRL',
      } as Wallet);
      wallets.save.mockImplementationOnce(async (value: Wallet) => value);
      transactions.save.mockImplementationOnce(async (value: WalletTransaction) => ({
        ...value,
        id: 't2',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const tx = await service.debit('u1', 120, { type: 'withdrawal', id: 'wd1' });

      expect(tx.balance_after).toBe('180.00');
    });
  });
});
