import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserService } from './user.service.js';
import type { UpdateProfileInput } from './user.schemas.js';

export class UserController {
  constructor(private readonly service: UserService) {}

  me = async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.service.getProfile(req.user.id));
  };

  update = async (req: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.updateProfile(req.user.id, req.body));
  };
}
