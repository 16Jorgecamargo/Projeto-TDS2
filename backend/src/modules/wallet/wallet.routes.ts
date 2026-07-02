import type { FastifyInstance } from 'fastify';
import { WalletService } from './wallet.service.js';
import { WalletController } from './wallet.controller.js';
import { Wallet } from '../../infra/database/entities/wallet.entity.js';
import { WalletTransaction } from '../../infra/database/entities/wallet-transaction.entity.js';
import {
  walletResponseSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
} from './wallet.schemas.js';

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  const service = new WalletService({
    wallets: app.dataSource.getRepository(Wallet),
    transactions: app.dataSource.getRepository(WalletTransaction),
  });
  const controller = new WalletController(service);

  app.get('/wallet', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['wallet'],
      summary: 'Minha carteira',
      response: { 200: walletResponseSchema },
    },
    handler: controller.getWallet,
  });

  app.get('/wallet/transactions', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['wallet'],
      summary: 'Extrato da carteira',
      querystring: transactionListQuerySchema,
      response: { 200: transactionListResponseSchema },
    },
    handler: controller.listTransactions,
  });
}
