import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from 'typeorm';
import type { ContractService } from './contract.service.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AcceptQuoteInput, ProgressUpdateInput, CancelContractInput } from './contract.schemas.js';

export class ContractController {
  constructor(
    private readonly service: ContractService,
    private readonly professionalProfiles: Repository<ProfessionalProfile>,
  ) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: userId } });
    if (!profile) {
      throw new NotFoundError('Perfil profissional nao encontrado');
    }
    return profile.id;
  }

  private async resolveOptionalProfileId(userId: string): Promise<string | null> {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: userId } });
    return profile ? profile.id : null;
  }

  acceptQuote = async (
    req: FastifyRequest<{ Params: { id: string }; Body: AcceptQuoteInput }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.acceptQuote(req.user!.id, req.params.id, req.body.schedule);
    return reply.status(201).send(result);
  };

  listContracts = async (req: FastifyRequest, reply: FastifyReply) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    const role = req.user!.role === 'professional' ? 'professional' : 'client';
    const result = await this.service.listMine({ userId: req.user!.id, professionalId }, role);
    return reply.send(result);
  };

  getContract = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    const result = await this.service.getById(req.params.id, { userId: req.user!.id, professionalId });
    return reply.send(result);
  };

  startContract = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const professionalId = await this.resolveProfileId(req.user!.id);
    return reply.send(await this.service.start(req.params.id, professionalId));
  };

  completeContract = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const professionalId = await this.resolveProfileId(req.user!.id);
    return reply.send(await this.service.complete(req.params.id, professionalId));
  };

  cancelContract = async (
    req: FastifyRequest<{ Params: { id: string }; Body: CancelContractInput }>,
    reply: FastifyReply,
  ) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    const result = await this.service.cancel(
      req.params.id,
      { userId: req.user!.id, professionalId },
      req.body.reason,
    );
    return reply.send(result);
  };

  addProgress = async (
    req: FastifyRequest<{ Params: { id: string }; Body: ProgressUpdateInput }>,
    reply: FastifyReply,
  ) => {
    const professionalId = await this.resolveProfileId(req.user!.id);
    const result = await this.service.addProgress(req.params.id, professionalId, req.user!.id, req.body);
    return reply.status(201).send(result);
  };

  listProgress = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const professionalId = await this.resolveOptionalProfileId(req.user!.id);
    await this.service.getById(req.params.id, { userId: req.user!.id, professionalId });
    return reply.send(await this.service.listProgress(req.params.id));
  };
}
