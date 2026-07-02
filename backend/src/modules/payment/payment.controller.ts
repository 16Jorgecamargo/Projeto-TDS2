import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PaymentService } from './payment.service.js';
import type { PayContractInput } from './payment.schemas.js';

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  payContract = async (
    req: FastifyRequest<{ Params: { id: string }; Body: PayContractInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.payContract(req.user!.id, req.params.id, req.body);
    return reply.status(201).send(result);
  };

  getContractPayment = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.getByContract(req.params.id));
  };

  getPayment = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id));
  };

  getPaymentFee = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.send(await this.service.getFee(req.params.id));
  };
}
