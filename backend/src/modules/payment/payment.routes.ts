import type { FastifyInstance } from 'fastify';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { WalletService } from '../wallet/wallet.service.js';
import { FeesService } from '../fees/fees.service.js';
import { Payment } from '../../infra/database/entities/payment.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { PlatformFee } from '../../infra/database/entities/platform-fee.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { platformFeeResponseSchema } from '../fees/fees.schemas.js';
import { payContractSchema, paymentResponseSchema } from './payment.schemas.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  const wallet = new WalletService({
    wallets: app.dataSource.getRepository(Wallet),
    transactions: app.dataSource.getRepository(WalletTransaction),
  });
  const fees = new FeesService({ fees: app.dataSource.getRepository(PlatformFee) });
  const service = new PaymentService({
    payments: app.dataSource.getRepository(Payment),
    contracts: app.dataSource.getRepository(Contract),
    professionals: app.dataSource.getRepository(ProfessionalProfile),
    wallet,
    fees,
  });
  const controller = new PaymentController(service);

  app.post('/contracts/:id/payment', {
    onRequest: [app.authenticate, requireRole('client')],
    schema: {
      tags: ['payment'],
      summary: 'Pagar contrato',
      params: idParamSchema,
      body: payContractSchema,
      response: { 201: paymentResponseSchema },
    },
    handler: controller.payContract,
  });

  app.get('/contracts/:id/payment', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['payment'],
      summary: 'Pagamento do contrato',
      params: idParamSchema,
      response: { 200: paymentResponseSchema },
    },
    handler: controller.getContractPayment,
  });

  app.get('/payments/:id', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['payment'],
      summary: 'Detalhe do pagamento',
      params: idParamSchema,
      response: { 200: paymentResponseSchema },
    },
    handler: controller.getPayment,
  });

  app.get('/payments/:id/fee', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['payment'],
      summary: 'Taxa do pagamento',
      params: idParamSchema,
      response: { 200: platformFeeResponseSchema },
    },
    handler: controller.getPaymentFee,
  });
}
