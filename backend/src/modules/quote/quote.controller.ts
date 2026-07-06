import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from 'typeorm';
import type { QuoteService } from './quote.service.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type { CreateQuoteInput } from './quote.schemas.js';

export class QuoteController {
  constructor(
    private readonly service: QuoteService,
    private readonly professionalProfiles: Repository<ProfessionalProfile>,
  ) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: userId } });
    if (!profile) {
      throw new NotFoundError('Perfil profissional nao encontrado');
    }
    return profile.id;
  }

  create = async (
    req: FastifyRequest<{ Params: { id: string }; Body: CreateQuoteInput }>,
    reply: FastifyReply,
  ) => {
    const profileId = await this.resolveProfileId(req.user!.id);
    return reply.status(201).send(await this.service.create(profileId, req.params.id, req.body));
  };

  listByDemand = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.listByDemand(req.params.id));

  listMinePending = async (req: FastifyRequest, reply: FastifyReply) => {
    const profileId = await this.resolveProfileId(req.user!.id);
    return reply.send(await this.service.listMinePending(profileId));
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.getById(req.params.id));

  withdraw = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const profileId = await this.resolveProfileId(req.user!.id);
    return reply.send(await this.service.withdraw(req.params.id, profileId));
  };
}
