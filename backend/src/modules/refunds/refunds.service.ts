import type { Repository } from 'typeorm';
import type { Refund } from '../../infra/database/entities/refund.entity.js';
import type { Payment } from '../../infra/database/entities/payment.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { NotFoundError, UnprocessableError } from '../../shared/errors.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { CreateRefundInput, RefundResponse } from './refunds.schemas.js';

interface RefundsServiceDeps {
  refunds: Repository<Refund>;
  payments: Repository<Payment>;
  contracts: Repository<Contract>;
  professionals: Repository<ProfessionalProfile>;
  wallet: WalletService;
}

export class RefundsService {
  constructor(private readonly deps: RefundsServiceDeps) {}

  private toResponse(refund: Refund): RefundResponse {
    return {
      id: refund.id,
      paymentId: refund.payment_id,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      processedAt: refund.processed_at ? refund.processed_at.toISOString() : null,
      createdAt: refund.created_at.toISOString(),
    };
  }

  async refund(paymentId: string, input: CreateRefundInput): Promise<RefundResponse> {
    const payment = await this.deps.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    if (payment.status !== 'captured') throw new UnprocessableError('Pagamento não pode ser estornado');

    const contract = await this.deps.contracts.findOne({ where: { id: payment.contract_id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    const professional = await this.deps.professionals.findOne({ where: { id: contract.professional_id } });
    if (!professional) throw new NotFoundError('Profissional não encontrado');

    const amount = Number(payment.amount);

    await this.deps.wallet.reverseHold(professional.user_id, amount, {
      type: 'refund',
      id: paymentId,
      description: 'Estorno de contrato',
    });
    if (payment.method === 'wallet') {
      await this.deps.wallet.credit(payment.payer_id, amount, {
        type: 'refund',
        id: paymentId,
        description: 'Estorno de pagamento',
      });
    }

    payment.status = 'refunded';
    await this.deps.payments.save(payment);

    const refund = await this.deps.refunds.save(
      this.deps.refunds.create({
        payment_id: paymentId,
        amount: amount.toFixed(2),
        reason: input.reason,
        status: 'completed',
        processed_at: new Date(),
      }),
    );
    return this.toResponse(refund);
  }

  async listByPayment(paymentId: string): Promise<RefundResponse[]> {
    const rows = await this.deps.refunds.find({
      where: { payment_id: paymentId },
      order: { created_at: 'DESC' },
    });
    return rows.map((refund) => this.toResponse(refund));
  }
}
