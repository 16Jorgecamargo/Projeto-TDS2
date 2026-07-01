import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from 'typeorm';
import type { DemandService } from './demand.service.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { CreateDemandInput, UpdateDemandInput, DemandListQuery, InviteProfessionalInput } from './demand.schemas.js';

export class DemandController {
  constructor(
    private readonly service: DemandService,
    private readonly professionalProfiles: Repository<ProfessionalProfile>,
  ) {}

  create = async (req: FastifyRequest<{ Body: CreateDemandInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.create(req.user!.id, req.body));

  list = async (req: FastifyRequest<{ Querystring: DemandListQuery }>, reply: FastifyReply) => {
    const { items, total } = await this.service.list(req.query, req.user!.id);
    return reply.send({ items, page: req.query.page, limit: req.query.limit, total });
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.getById(req.params.id));

  update = async (req: FastifyRequest<{ Params: { id: string }; Body: UpdateDemandInput }>, reply: FastifyReply) =>
    reply.send(await this.service.update(req.params.id, req.user!.id, req.body));

  cancel = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.cancel(req.params.id, req.user!.id));

  invite = async (req: FastifyRequest<{ Params: { id: string }; Body: InviteProfessionalInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.invite(req.params.id, req.user!.id, req.body.professionalId));

  listInvitations = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const demand = await this.service.getById(req.params.id);
    if (demand.clientId !== req.user!.id) {
      throw new ForbiddenError('Nao e o autor da demanda');
    }
    return reply.send(await this.service.listInvitations(req.params.id));
  };

  respondInvitation = async (req: FastifyRequest<{ Params: { id: string }; Body: { accept: boolean } }>, reply: FastifyReply) => {
    const profile = await this.professionalProfiles.findOne({ where: { user_id: req.user!.id } });
    if (!profile) {
      throw new NotFoundError('Perfil profissional nao encontrado');
    }
    return reply.send(await this.service.respondInvitation(req.params.id, profile.id, req.body.accept));
  };
}
