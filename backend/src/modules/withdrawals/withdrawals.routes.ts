import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WithdrawalsService } from './withdrawals.service.js';
import { WithdrawalsController } from './withdrawals.controller.js';
import { WalletService } from '../wallet/wallet.service.js';
import { Withdrawal } from '../../infra/database/entities/withdrawal.entity.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';
import { emptyBodySchema, idParamSchema } from '../../shared/schemas.js';
import { requireRole } from '../../plugins/auth.js';
import { requestWithdrawalSchema, withdrawalResponseSchema } from './withdrawals.schemas.js';

export async function withdrawalsRoutes(app: FastifyInstance): Promise<void> {
  const wallet = new WalletService({
    wallets: app.dataSource.getRepository(Wallet),
    transactions: app.dataSource.getRepository(WalletTransaction),
  });
  const service = new WithdrawalsService({
    withdrawals: app.dataSource.getRepository(Withdrawal),
    wallets: app.dataSource.getRepository(Wallet),
    wallet,
  });
  const controller = new WithdrawalsController(service);

  app.post('/withdrawals', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['withdrawals'],
      summary: 'Solicitar saque',
      body: requestWithdrawalSchema,
      response: { 201: withdrawalResponseSchema },
    },
    handler: controller.requestWithdrawal,
  });

  app.get('/withdrawals', {
    onRequest: [app.authenticate, requireRole('professional')],
    schema: {
      tags: ['withdrawals'],
      summary: 'Meus saques',
      response: { 200: z.array(withdrawalResponseSchema) },
    },
    handler: controller.listWithdrawals,
  });

  app.post('/withdrawals/:id/process', {
    onRequest: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['withdrawals'],
      summary: 'Processar saque',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 200: withdrawalResponseSchema },
    },
    handler: controller.processWithdrawal,
  });
}
