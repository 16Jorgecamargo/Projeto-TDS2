import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import type { Withdrawal } from '../../infra/database/entities/withdrawal.entity.js';
import type { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { RequestWithdrawalInput, WithdrawalResponse } from './withdrawals.schemas.js';

interface WithdrawalsServiceDeps {
  withdrawals: Repository<Withdrawal>;
  wallets: Repository<Wallet>;
  wallet: WalletService;
}

export class WithdrawalsService {
  constructor(private readonly deps: WithdrawalsServiceDeps) {}

  private toResponse(withdrawal: Withdrawal): WithdrawalResponse {
    return {
      id: withdrawal.id,
      walletId: withdrawal.wallet_id,
      amount: Number(withdrawal.amount),
      paymentMethod: withdrawal.payment_method,
      status: withdrawal.status,
      destination: withdrawal.destination,
      processedAt: withdrawal.processed_at ? withdrawal.processed_at.toISOString() : null,
      createdAt: withdrawal.created_at.toISOString(),
    };
  }

  async request(userId: string, input: RequestWithdrawalInput): Promise<WithdrawalResponse> {
    const wallet = await this.deps.wallet.ensureWallet(userId);
    const withdrawalId = randomUUID();

    await this.deps.wallet.debit(userId, input.amount, {
      type: 'withdrawal',
      id: withdrawalId,
      description: 'Saque solicitado',
    });

    const withdrawal = await this.deps.withdrawals.save(
      this.deps.withdrawals.create({
        id: withdrawalId,
        wallet_id: wallet.id,
        amount: input.amount.toFixed(2),
        payment_method: input.paymentMethod,
        status: 'pending',
        destination: input.destination,
        processed_at: null,
      }),
    );
    return this.toResponse(withdrawal);
  }

  async listMine(userId: string): Promise<WithdrawalResponse[]> {
    const wallet = await this.deps.wallet.ensureWallet(userId);
    const rows = await this.deps.withdrawals.find({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async process(id: string): Promise<WithdrawalResponse> {
    const withdrawal = await this.deps.withdrawals.findOne({ where: { id } });
    if (!withdrawal) throw new NotFoundError('Saque nao encontrado');
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      throw new UnprocessableError('Saque nao pode ser processado');
    }
    withdrawal.status = 'completed';
    withdrawal.processed_at = new Date();
    const saved = await this.deps.withdrawals.save(withdrawal);
    return this.toResponse(saved);
  }
}
