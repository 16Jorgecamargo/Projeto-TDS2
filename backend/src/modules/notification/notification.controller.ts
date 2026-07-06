import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NotificationService } from './notification.service.js';
import type { RegisterDeviceBody } from './notification.schemas.js';

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list = async (
    req: FastifyRequest<{ Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const { page, limit } = req.query;
    const { items, total } = await this.service.listForUser(req.user!.id, page, limit);
    return reply.send({ items, page, limit, total });
  };

  markRead = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.markRead(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  markAllRead = async (req: FastifyRequest, reply: FastifyReply) => {
    await this.service.markAllRead(req.user!.id);
    return reply.status(204).send();
  };

  registerDevice = async (
    req: FastifyRequest<{ Body: RegisterDeviceBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.registerDeviceToken(req.user!.id, req.body);
    return reply.status(201).send(result);
  };
}
