import type { FastifyReply, FastifyRequest } from 'fastify';
import type { WalletService } from './wallet.service.js';
import type { TransactionListQuery } from './wallet.schemas.js';

export class WalletController {
  constructor(private readonly service: WalletService) {}

  getWallet = async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.service.getByUserId(req.user!.id));
  };

  listTransactions = async (
    req: FastifyRequest<{ Querystring: TransactionListQuery }>,
    reply: FastifyReply,
  ) => {
    const { items, total } = await this.service.listTransactions(req.user!.id, req.query);
    return reply.send({ items, page: req.query.page, limit: req.query.limit, total });
  };
}
