import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from 'typeorm';
import type { DisputeService } from './dispute.service.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { OpenDisputeInput, ResolveDisputeInput } from './dispute.schemas.js';

export class DisputeController {
  constructor(
    private readonly service: DisputeService,
    private readonly professionalProfiles: Repository<ProfessionalProfile>,
  ) {}

  private async resolveOptionalProfileId(userId: string): Promise<string | null> {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: userId } });
    return profile ? profile.id : null;
  }

  openDispute = async (
    req: FastifyRequest<{ Params: { id: string }; Body: OpenDisputeInput }>,
    reply: FastifyReply,
  ) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    const result = await this.service.open(
      req.params.id,
      { userId: req.user!.id, professionalId },
      req.body.reason,
    );
    return reply.status(201).send(result);
  };

  listContractDisputes = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    const result = await this.service.listByContract(req.params.id, { userId: req.user!.id, professionalId });
    return reply.send(result);
  };

  resolveDispute = async (
    req: FastifyRequest<{ Params: { id: string }; Body: ResolveDisputeInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.resolve(req.params.id, req.body.status, req.body.resolution);
    return reply.send(result);
  };
}
