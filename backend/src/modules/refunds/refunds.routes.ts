import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RefundsService } from './refunds.service.js';
import { RefundsController } from './refunds.controller.js';
import { WalletService } from '../wallet/wallet.service.js';
import { FeesService } from '../fees/fees.service.js';
import { Refund } from '../../infra/database/entities/refund.entity.js';
import { Payment } from '../../infra/database/entities/payment.entity.js';
import { Contract } from '../../infra/database/entities/contract.entity.js';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { PlatformFee } from '../../infra/database/entities/platform-fee.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';
import { idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { createRefundSchema, refundResponseSchema } from './refunds.schemas.js';

export async function refundsRoutes(app: FastifyInstance): Promise<void> {
  const wallet = new WalletService({
    wallets: app.dataSource.getRepository(Wallet),
    transactions: app.dataSource.getRepository(WalletTransaction),
  });
  const fees = new FeesService({ fees: app.dataSource.getRepository(PlatformFee) });
  const service = new RefundsService({
    refunds: app.dataSource.getRepository(Refund),
    payments: app.dataSource.getRepository(Payment),
    contracts: app.dataSource.getRepository(Contract),
    professionals: app.dataSource.getRepository(ProfessionalProfile),
    wallet,
    fees,
  });
  const controller = new RefundsController(service);

  app.post('/payments/:id/refund', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['refunds'],
      summary: 'Estornar pagamento',
      params: idParamSchema,
      body: createRefundSchema,
      response: { 201: refundResponseSchema },
    },
    handler: controller.createRefund,
  });

  app.get('/payments/:id/refunds', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['refunds'],
      summary: 'Estornos do pagamento',
      params: idParamSchema,
      response: { 200: z.array(refundResponseSchema) },
    },
    handler: controller.listPaymentRefunds,
  });
}
