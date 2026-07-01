import type { Repository } from 'typeorm';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { DemandImage } from '../../infra/database/entities/demand-image.entity.js';
import type { DemandTag } from '../../infra/database/entities/demand-tag.entity.js';
import type { DemandInvitation } from '../../infra/database/entities/demand-invitation.entity.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors.js';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandResponse,
  DemandListQuery,
  DemandInvitationResponse,
} from './demand.schemas.js';

interface DemandServiceDeps {
  demands: Repository<ServiceDemand>;
  images: Repository<DemandImage>;
  tags: Repository<DemandTag>;
  invitations: Repository<DemandInvitation>;
}

export class DemandService {
  constructor(private readonly deps: DemandServiceDeps) {}

  private toResponse(
    demand: ServiceDemand,
    images: DemandImage[],
    tagIds: string[],
  ): DemandResponse {
    return {
      id: demand.id,
      clientId: demand.client_id,
      categoryId: demand.category_id,
      title: demand.title,
      description: demand.description,
      budgetMin: Number(demand.budget_min),
      budgetMax: Number(demand.budget_max),
      status: demand.status,
      addressId: demand.address_id,
      images: [...images]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ url: i.image_url, position: i.position })),
      tagIds,
      createdAt: demand.created_at.toISOString(),
    };
  }

  private async loadAssociations(demandId: string): Promise<{ images: DemandImage[]; tagIds: string[] }> {
    const images = await this.deps.images.find({ where: { demand_id: demandId } });
    const tagRows = await this.deps.tags.find({ where: { demand_id: demandId } });
    return { images, tagIds: tagRows.map((t) => t.tag_id) };
  }

  async create(clientId: string, input: CreateDemandInput): Promise<DemandResponse> {
    const demand = await this.deps.demands.save(
      this.deps.demands.create({
        client_id: clientId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        budget_min: input.budgetMin.toFixed(2),
        budget_max: input.budgetMax.toFixed(2),
        status: 'open',
        address_id: input.addressId,
      }),
    );
    const images = await Promise.all(
      input.images.map((i) =>
        this.deps.images.save(
          this.deps.images.create({ demand_id: demand.id, image_url: i.url, position: i.position }),
        ),
      ),
    );
    await Promise.all(
      input.tagIds.map((tagId) =>
        this.deps.tags.save(this.deps.tags.create({ demand_id: demand.id, tag_id: tagId })),
      ),
    );
    return this.toResponse(demand, images, input.tagIds);
  }

  async list(
    query: DemandListQuery,
    requesterId: string,
  ): Promise<{ items: DemandResponse[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.category_id = query.categoryId;
    if (query.mine) where.client_id = requesterId;
    const [rows, total] = await this.deps.demands.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const items = await Promise.all(
      rows.map(async (d) => {
        const { images, tagIds } = await this.loadAssociations(d.id);
        return this.toResponse(d, images, tagIds);
      }),
    );
    return { items, total };
  }

  async getById(id: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(demand, images, tagIds);
  }

  async update(id: string, clientId: string, input: UpdateDemandInput): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda nao editavel');
    if (input.title !== undefined) demand.title = input.title;
    if (input.description !== undefined) demand.description = input.description;
    if (input.budgetMin !== undefined) demand.budget_min = input.budgetMin.toFixed(2);
    if (input.budgetMax !== undefined) demand.budget_max = input.budgetMax.toFixed(2);
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(saved, images, tagIds);
  }

  async cancel(id: string, clientId: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    demand.status = 'cancelled';
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    return this.toResponse(saved, images, tagIds);
  }

  private invitationToResponse(inv: DemandInvitation): DemandInvitationResponse {
    return {
      id: inv.id,
      demandId: inv.demand_id,
      professionalId: inv.professional_id,
      status: inv.status,
    };
  }

  async invite(
    demandId: string,
    clientId: string,
    professionalId: string,
  ): Promise<DemandInvitationResponse> {
    const demand = await this.deps.demands.findOne({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    if (demand.status !== 'open') throw new ForbiddenError('Demanda nao aceita convites');
    const existing = await this.deps.invitations.findOne({
      where: { demand_id: demandId, professional_id: professionalId },
    });
    if (existing) throw new ConflictError('Profissional ja convidado');
    const saved = await this.deps.invitations.save(
      this.deps.invitations.create({
        demand_id: demandId,
        professional_id: professionalId,
        status: 'pending',
        invited_at: new Date(),
      }),
    );
    return this.invitationToResponse(saved);
  }

  async respondInvitation(
    invitationId: string,
    professionalId: string,
    accept: boolean,
  ): Promise<DemandInvitationResponse> {
    const invitation = await this.deps.invitations.findOne({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundError('Convite nao encontrado');
    if (invitation.professional_id !== professionalId) throw new ForbiddenError('Convite de outro profissional');
    if (invitation.status !== 'pending') throw new ForbiddenError('Convite ja respondido');
    invitation.status = accept ? 'accepted' : 'declined';
    invitation.responded_at = new Date();
    const saved = await this.deps.invitations.save(invitation);
    return this.invitationToResponse(saved);
  }

  async listInvitations(demandId: string): Promise<DemandInvitationResponse[]> {
    const rows = await this.deps.invitations.find({ where: { demand_id: demandId } });
    return rows.map((invitation) => this.invitationToResponse(invitation));
  }
}
