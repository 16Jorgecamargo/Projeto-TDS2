import { QueryFailedError, type Repository } from 'typeorm';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
import type { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';
import { UnprocessableError } from '../../shared/errors.js';
import type {
  WalletResponse,
  WalletTransactionResponse,
  TransactionListQuery,
} from './wallet.schemas.js';

export interface TransactionRef {
  type: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment';
  id: string | null;
  description?: string;
}

export const HOLD_RELEASE_DELAY_MS = 10_000;

interface WalletServiceDeps {
  wallets: Repository<Wallet>;
  transactions: Repository<WalletTransaction>;
}

export class WalletService {
  constructor(private readonly deps: WalletServiceDeps) {}

  private toResponse(wallet: Wallet): WalletResponse {
    return {
      id: wallet.id,
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      pendingBalance: Number(wallet.pending_balance),
      currency: wallet.currency,
      createdAt: wallet.created_at.toISOString(),
      updatedAt: wallet.updated_at.toISOString(),
    };
  }

  private transactionToResponse(tx: WalletTransaction): WalletTransactionResponse {
    return {
      id: tx.id,
      walletId: tx.wallet_id,
      type: tx.type,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balance_after),
      referenceType: tx.reference_type,
      referenceId: tx.reference_id,
      description: tx.description,
      createdAt: tx.created_at.toISOString(),
    };
  }

  async ensureWallet(userId: string): Promise<Wallet> {
    const existing = await this.deps.wallets.findOne({ where: { user_id: userId } });
    if (existing) return existing;
    try {
      return await this.deps.wallets.save(
        this.deps.wallets.create({
          user_id: userId,
          balance: '0.00',
          pending_balance: '0.00',
          currency: 'BRL',
        }),
      );
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const created = await this.deps.wallets.findOne({ where: { user_id: userId } });
        if (created) return created;
      }
      throw error;
    }
  }

  async getByUserId(userId: string): Promise<WalletResponse> {
    const wallet = await this.ensureWallet(userId);
    return this.toResponse(wallet);
  }

  async listTransactions(
    userId: string,
    query: TransactionListQuery,
  ): Promise<{ items: WalletTransactionResponse[]; total: number }> {
    const wallet = await this.ensureWallet(userId);
    const where: Record<string, unknown> = { wallet_id: wallet.id };
    if (query.type) where.type = query.type;
    const [rows, total] = await this.deps.transactions.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: rows.map((row) => this.transactionToResponse(row)), total };
  }

  async credit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    const nextBalance = Number(wallet.balance) + amount;
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'credit',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }

  async hold(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    const nextPending = Number(wallet.pending_balance) + amount;
    wallet.pending_balance = nextPending.toFixed(2);
    await this.deps.wallets.save(wallet);
    const tx = await this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'hold',
        amount: amount.toFixed(2),
        balance_after: nextPending.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
    setTimeout(() => {
      void this.release(userId, amount, ref);
    }, HOLD_RELEASE_DELAY_MS).unref();
    return tx;
  }

  async release(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    const nextPending = Number(wallet.pending_balance) - amount;
    const nextBalance = Number(wallet.balance) + amount;
    wallet.pending_balance = nextPending.toFixed(2);
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'release',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }

  async reverseHold(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    const pending = Number(wallet.pending_balance);
    const fromPending = Math.min(pending, amount);
    const fromBalance = Number((amount - fromPending).toFixed(2));
    if (fromBalance > 0 && Number(wallet.balance) < fromBalance) {
      throw new UnprocessableError('Saldo insuficiente para estorno');
    }
    const nextPending = Number((pending - fromPending).toFixed(2));
    const nextBalance = Number((Number(wallet.balance) - fromBalance).toFixed(2));
    wallet.pending_balance = nextPending.toFixed(2);
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'debit',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }

  async debit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    if (Number(wallet.balance) < amount) {
      throw new UnprocessableError('Saldo insuficiente');
    }
    const nextBalance = Number(wallet.balance) - amount;
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'debit',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }
}
