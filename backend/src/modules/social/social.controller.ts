import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SocialService } from './social.service.js';
import type { CreateFavoriteBody, CreateReportBody, CreateBlockBody } from './social.schemas.js';

export class SocialController {
  constructor(private readonly service: SocialService) {}

  addFavorite = async (req: FastifyRequest<{ Body: CreateFavoriteBody }>, reply: FastifyReply) => {
    const result = await this.service.addFavorite(req.user!.id, req.body.professionalId);
    return reply.status(201).send(result);
  };

  removeFavorite = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeFavorite(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listFavorites = async (
    req: FastifyRequest<{ Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const { page, limit } = req.query;
    const { items, total } = await this.service.listFavorites(req.user!.id, page, limit);
    return reply.send({ items, page, limit, total });
  };

  createReport = async (req: FastifyRequest<{ Body: CreateReportBody }>, reply: FastifyReply) => {
    const result = await this.service.createReport(req.user!.id, req.body);
    return reply.status(201).send(result);
  };

  blockUser = async (req: FastifyRequest<{ Body: CreateBlockBody }>, reply: FastifyReply) => {
    const result = await this.service.blockUser(req.user!.id, req.body.blockedId);
    return reply.status(201).send(result);
  };

  unblockUser = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.unblockUser(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  listBlocks = async (
    req: FastifyRequest<{ Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const { page, limit } = req.query;
    const { items, total } = await this.service.listBlocks(req.user!.id, page, limit);
    return reply.send({ items, page, limit, total });
  };
}
