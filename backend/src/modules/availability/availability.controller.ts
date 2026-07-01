import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AvailabilityService } from './availability.service.js';
import type { SlotInput, ExceptionInput } from './availability.schemas.js';

export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  addSlot = async (req: FastifyRequest<{ Body: SlotInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addSlot(req.user!.id, req.body));

  removeSlot = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeSlot(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listSlots = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listSlots(req.params.professionalId));

  addException = async (req: FastifyRequest<{ Body: ExceptionInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addException(req.user!.id, req.body));

  removeException = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeException(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listExceptions = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listExceptions(req.params.professionalId));
}
