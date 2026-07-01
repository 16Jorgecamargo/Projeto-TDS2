import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PortfolioService } from './portfolio.service.js';
import type { PortfolioItemInput, UpdatePortfolioItemInput, PortfolioImageInput } from './portfolio.schemas.js';

export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  createItem = async (req: FastifyRequest<{ Body: PortfolioItemInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.createItem(req.user!.id, req.body));

  updateItem = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdatePortfolioItemInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.updateItem(req.user!.id, req.params.id, req.body));

  removeItem = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeItem(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listItems = async (req: FastifyRequest<{ Params: { professionalId: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listItems(req.params.professionalId));

  addImage = async (
    req: FastifyRequest<{ Params: { id: string }; Body: PortfolioImageInput }>,
    reply: FastifyReply,
  ) => reply.status(201).send(await this.service.addImage(req.user!.id, req.params.id, req.body));

  removeImage = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeImage(req.user!.id, req.params.id);
    return reply.status(204).send();
  };
}
