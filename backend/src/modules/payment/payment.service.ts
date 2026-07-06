import type { Repository } from 'typeorm';
import type { Payment } from '../../infra/database/entities/payment.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { NotFoundError, ForbiddenError, ConflictError, UnprocessableError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { FeesService } from '../fees/fees.service.js';
import type { PlatformFeeResponse } from '../fees/fees.schemas.js';
import type { PayContractInput, PaymentResponse } from './payment.schemas.js';

interface PaymentServiceDeps {
  payments: Repository<Payment>;
  contracts: Repository<Contract>;
  professionals: Repository<ProfessionalProfile>;
  wallet: WalletService;
  fees: FeesService;
}

export class PaymentService {
  constructor(private readonly deps: PaymentServiceDeps) {}

  private toResponse(payment: Payment): PaymentResponse {
    return {
      id: payment.id,
      contractId: payment.contract_id,
      payerId: payment.payer_id,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      paidAt: payment.paid_at ? payment.paid_at.toISOString() : null,
      createdAt: payment.created_at.toISOString(),
    };
  }

  async payContract(
    clientId: string,
    contractId: string,
    input: PayContractInput,
  ): Promise<PaymentResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.client_id !== clientId) throw new ForbiddenError('Não é o cliente do contrato');
    if (contract.status === 'cancelled' || contract.status === 'disputed') {
      throw new UnprocessableError('Contrato não pode ser pago');
    }

    const existing = await this.deps.payments.findOne({
      where: { contract_id: contractId, status: 'captured' },
    });
    if (existing) throw new ConflictError('Contrato já pago');

    const professional = await this.deps.professionals.findOne({
      where: { id: contract.professional_id },
    });
    if (!professional) throw new NotFoundError('Profissional não encontrado');

    const amount = Number(contract.total_amount);

    let payment = await this.deps.payments.save(
      this.deps.payments.create({
        contract_id: contractId,
        payer_id: clientId,
        amount: amount.toFixed(2),
        status: 'pending',
        method: input.method,
        external_reference: null,
        paid_at: null,
      }),
    );

    if (input.method === 'wallet') {
      await this.deps.wallet.debit(clientId, amount, {
        type: 'payment',
        id: payment.id,
        description: 'Pagamento de contrato',
      });
    }

    await this.deps.fees.recordFee(payment.id, amount);

    await this.deps.wallet.hold(professional.user_id, amount, {
      type: 'payment',
      id: payment.id,
      description: 'Recebimento de contrato',
    });

    payment.status = 'captured';
    payment.paid_at = new Date();
    payment = await this.deps.payments.save(payment);

    businessMetrics.paymentsProcessed.inc();
    return this.toResponse(payment);
  }

  async getById(id: string): Promise<PaymentResponse> {
    const payment = await this.deps.payments.findOne({ where: { id } });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    return this.toResponse(payment);
  }

  async getByContract(contractId: string): Promise<PaymentResponse> {
    const payment = await this.deps.payments.findOne({
      where: { contract_id: contractId },
      order: { created_at: 'DESC' },
    });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    return this.toResponse(payment);
  }

  async getFee(paymentId: string): Promise<PlatformFeeResponse> {
    const fee = await this.deps.fees.findByPayment(paymentId);
    if (!fee) throw new NotFoundError('Taxa não encontrada');
    return fee;
  }
}
