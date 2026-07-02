import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RefundsService } from './refunds.service.js';
import type { CreateRefundInput } from './refunds.schemas.js';

export class RefundsController {
  constructor(private readonly service: RefundsService) {}

  createRefund = async (
    req: FastifyRequest<{ Params: { id: string }; Body: CreateRefundInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.refund(req.params.id, req.body);
    return reply.status(201).send(result);
  };

  listPaymentRefunds = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.listByPayment(req.params.id));
  };
}
