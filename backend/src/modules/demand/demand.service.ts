import { In, type Repository } from 'typeorm';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { DemandImage } from '../../infra/database/entities/demand-image.entity.js';
import type { DemandTag } from '../../infra/database/entities/demand-tag.entity.js';
import type { DemandInvitation } from '../../infra/database/entities/demand-invitation.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { QuoteItem } from '../../infra/database/entities/quote-item.entity.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandResponse,
  DemandListQuery,
  DemandInvitationResponse,
} from './demand.schemas.js';

export interface DemandActor {
  userId: string;
  professionalId: string | null;
}

interface DemandServiceDeps {
  demands: Repository<ServiceDemand>;
  images: Repository<DemandImage>;
  tags: Repository<DemandTag>;
  invitations: Repository<DemandInvitation>;
  contracts: Repository<Contract>;
  quotes: Repository<Quote>;
  quoteItems: Repository<QuoteItem>;
}

export class DemandService {
  constructor(private readonly deps: DemandServiceDeps) {}

  private async canRevealFullAddress(demand: ServiceDemand, actor?: DemandActor): Promise<boolean> {
    if (!actor) return false;
    if (demand.client_id === actor.userId) return true;
    if (!actor.professionalId) return false;
    const contract = await this.deps.contracts.findOne({
      where: { demand_id: demand.id, professional_id: actor.professionalId, status: In(['active', 'completed']) },
    });
    return contract !== null;
  }

  private async toResponse(
    demand: ServiceDemand,
    images: DemandImage[],
    tagIds: string[],
    quotesCount: number,
    actor?: DemandActor,
  ): Promise<DemandResponse> {
    const revealAddress = await this.canRevealFullAddress(demand, actor);
    return {
      id: demand.id,
      clientId: demand.client_id,
      categoryId: demand.category_id,
      title: demand.title,
      description: demand.description,
      budgetMin: demand.budget_min !== null ? Number(demand.budget_min) : null,
      budgetMax: demand.budget_max !== null ? Number(demand.budget_max) : null,
      status: demand.status,
      city: demand.city ?? '',
      state: demand.state ?? '',
      street: revealAddress ? demand.street : null,
      number: revealAddress ? demand.number : null,
      complement: revealAddress ? demand.complement : null,
      district: revealAddress ? demand.district : null,
      zipCode: revealAddress ? demand.zip_code : null,
      images: [...images]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ url: i.image_url, position: i.position })),
      tagIds,
      quotesCount,
      createdAt: demand.created_at.toISOString(),
    };
  }

  private async countQuotes(demandId: string): Promise<number> {
    return this.deps.quotes.count({ where: { demand_id: demandId } });
  }

  private async countQuotesByDemand(demandIds: string[]): Promise<Map<string, number>> {
    if (demandIds.length === 0) return new Map();
    const rows = await this.deps.quotes
      .createQueryBuilder('quote')
      .select('quote.demand_id', 'demandId')
      .addSelect('COUNT(*)', 'count')
      .where('quote.demand_id IN (:...demandIds)', { demandIds })
      .groupBy('quote.demand_id')
      .getRawMany<{ demandId: string; count: string }>();
    return new Map(rows.map((row) => [row.demandId, Number(row.count)]));
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
        budget_min: input.budgetMin !== undefined ? input.budgetMin.toFixed(2) : null,
        budget_max: input.budgetMax !== undefined ? input.budgetMax.toFixed(2) : null,
        street: input.street,
        number: input.number,
        complement: input.complement,
        district: input.district,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        status: 'open',
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
    businessMetrics.demandsCreated.inc();
    return this.toResponse(demand, images, input.tagIds, 0, { userId: clientId, professionalId: null });
  }

  async list(query: DemandListQuery, actor: DemandActor): Promise<{ items: DemandResponse[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.category_id = query.categoryId;
    if (query.mine) where.client_id = actor.userId;
    if (query.city) where.city = query.city;
    if (query.state) where.state = query.state;
    const [rows, total] = await this.deps.demands.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const quotesByDemand = await this.countQuotesByDemand(rows.map((d) => d.id));
    const items = await Promise.all(
      rows.map(async (d) => {
        const { images, tagIds } = await this.loadAssociations(d.id);
        return this.toResponse(d, images, tagIds, quotesByDemand.get(d.id) ?? 0, actor);
      }),
    );
    return { items, total };
  }

  async getById(id: string, actor?: DemandActor): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    const { images, tagIds } = await this.loadAssociations(id);
    const quotesCount = await this.countQuotes(id);
    return this.toResponse(demand, images, tagIds, quotesCount, actor);
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
    if (input.street !== undefined) demand.street = input.street;
    if (input.number !== undefined) demand.number = input.number;
    if (input.complement !== undefined) demand.complement = input.complement;
    if (input.district !== undefined) demand.district = input.district;
    if (input.city !== undefined) demand.city = input.city;
    if (input.state !== undefined) demand.state = input.state;
    if (input.zipCode !== undefined) demand.zip_code = input.zipCode;
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    const quotesCount = await this.countQuotes(id);
    return this.toResponse(saved, images, tagIds, quotesCount, { userId: clientId, professionalId: null });
  }

  async cancel(id: string, clientId: string): Promise<DemandResponse> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    demand.status = 'cancelled';
    const saved = await this.deps.demands.save(demand);
    const { images, tagIds } = await this.loadAssociations(id);
    const quotesCount = await this.countQuotes(id);
    return this.toResponse(saved, images, tagIds, quotesCount, { userId: clientId, professionalId: null });
  }

  async remove(id: string, clientId: string): Promise<void> {
    const demand = await this.deps.demands.findOne({ where: { id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    const contract = await this.deps.contracts.findOne({ where: { demand_id: id } });
    if (contract) throw new ConflictError('Demanda possui contrato e nao pode ser excluida');
    const quotes = await this.deps.quotes.find({ where: { demand_id: id } });
    if (quotes.length > 0) {
      await this.deps.quoteItems.delete({ quote_id: In(quotes.map((q) => q.id)) });
      await this.deps.quotes.delete({ id: In(quotes.map((q) => q.id)) });
    }
    await this.deps.invitations.delete({ demand_id: id });
    await this.deps.images.delete({ demand_id: id });
    await this.deps.tags.delete({ demand_id: id });
    await this.deps.demands.delete({ id });
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
