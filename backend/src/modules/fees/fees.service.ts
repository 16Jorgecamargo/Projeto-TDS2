import type { Repository } from 'typeorm';
import type { PlatformFee } from '../../infra/database/entities/platform-fee.entity.js';
import type { PlatformFeeResponse } from './fees.schemas.js';

export const DEFAULT_PLATFORM_FEE_PERCENTAGE = 10;

interface FeesServiceDeps {
  fees: Repository<PlatformFee>;
}

export class FeesService {
  constructor(private readonly deps: FeesServiceDeps) {}

  private toResponse(fee: PlatformFee): PlatformFeeResponse {
    return {
      id: fee.id,
      paymentId: fee.payment_id,
      percentage: Number(fee.percentage),
      amount: Number(fee.amount),
      createdAt: fee.created_at.toISOString(),
    };
  }

  computeFee(baseAmount: number): { percentage: number; amount: number } {
    const percentage = DEFAULT_PLATFORM_FEE_PERCENTAGE;
    const amount = Number(((baseAmount * percentage) / 100).toFixed(2));
    return { percentage, amount };
  }

  async recordFee(paymentId: string, baseAmount: number): Promise<PlatformFeeResponse> {
    const { percentage, amount } = this.computeFee(baseAmount);
    const fee = await this.deps.fees.save(
      this.deps.fees.create({
        payment_id: paymentId,
        percentage: percentage.toFixed(2),
        amount: amount.toFixed(2),
      }),
    );
    return this.toResponse(fee);
  }

  async findByPayment(paymentId: string): Promise<PlatformFeeResponse | null> {
    const fee = await this.deps.fees.findOne({ where: { payment_id: paymentId } });
    return fee ? this.toResponse(fee) : null;
  }
}
