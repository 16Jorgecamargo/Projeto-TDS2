import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AddressService } from './address.service.js';
import type { CreateAddressInput, UpdateAddressInput } from './address.schemas.js';

export class AddressController {
  constructor(private readonly service: AddressService) {}

  list = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.list(req.user.id));

  create = async (req: FastifyRequest<{ Body: CreateAddressInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.create(req.user.id, req.body));

  update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateAddressInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.update(req.user.id, req.params.id, req.body));

  remove = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.remove(req.user.id, req.params.id);
    return reply.status(204).send();
  };

  setDefault = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.setDefault(req.user.id, req.params.id);
    return reply.status(204).send();
  };
}
