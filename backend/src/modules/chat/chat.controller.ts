import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ChatService } from './chat.service.js';
import type { CreateRoomBody } from './chat.schemas.js';

export class ChatController {
  constructor(private readonly service: ChatService) {}

  createRoom = async (req: FastifyRequest<{ Body: CreateRoomBody }>, reply: FastifyReply) => {
    const result = await this.service.getOrCreateRoom(req.user.id, req.body.participantId, req.body.contractId ?? null);
    return reply.status(201).send(result);
  };

  listMessages = async (
    req: FastifyRequest<{ Params: { id: string }; Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.listMessages(req.params.id, req.user.id, req.query.page, req.query.limit);
    return reply.send(result);
  };
}
