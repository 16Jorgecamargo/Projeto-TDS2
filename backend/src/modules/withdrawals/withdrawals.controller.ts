import type { FastifyReply, FastifyRequest } from 'fastify';
import type { WithdrawalsService } from './withdrawals.service.js';
import type { RequestWithdrawalInput } from './withdrawals.schemas.js';

export class WithdrawalsController {
  constructor(private readonly service: WithdrawalsService) {}

  requestWithdrawal = async (
    req: FastifyRequest<{ Body: RequestWithdrawalInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.request(req.user!.id, req.body);
    return reply.status(201).send(result);
  };

  listWithdrawals = async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.service.listMine(req.user!.id));
  };

  processWithdrawal = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    return reply.send(await this.service.process(req.params.id));
  };
}
