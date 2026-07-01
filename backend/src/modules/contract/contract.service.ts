import type { Repository } from 'typeorm';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { Schedule } from '../../infra/database/entities/schedule.entity.js';
import type { ContractProgressUpdate } from '../../infra/database/entities/contract-progress-update.entity.js';
import type { ContractProgressImage } from '../../infra/database/entities/contract-progress-image.entity.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import type {
  ScheduleInput,
  ProgressUpdateInput,
  ContractResponse,
  ProgressUpdateResponse,
} from './contract.schemas.js';

interface ContractServiceDeps {
  contracts: Repository<Contract>;
  quotes: Repository<Quote>;
  demands: Repository<ServiceDemand>;
  schedules: Repository<Schedule>;
  progress: Repository<ContractProgressUpdate>;
  progressImages: Repository<ContractProgressImage>;
}

export class ContractService {
  constructor(private readonly deps: ContractServiceDeps) {}

  private async toResponse(contract: Contract): Promise<ContractResponse> {
    const schedule = await this.deps.schedules.findOne({ where: { contract_id: contract.id } });
    return {
      id: contract.id,
      demandId: contract.demand_id,
      quoteId: contract.quote_id,
      clientId: contract.client_id,
      professionalId: contract.professional_id,
      total: Number(contract.total_amount),
      status: contract.status,
      cancelledBy: contract.cancelled_by,
      cancellationReason: contract.cancellation_reason,
      startedAt: contract.started_at ? contract.started_at.toISOString() : null,
      completedAt: contract.completed_at ? contract.completed_at.toISOString() : null,
      cancelledAt: contract.cancelled_at ? contract.cancelled_at.toISOString() : null,
      schedule: schedule
        ? {
            id: schedule.id,
            scheduledDate: schedule.scheduled_date.toISOString(),
            durationMinutes: schedule.duration_minutes,
            notes: schedule.notes,
            status: schedule.status,
          }
        : null,
      createdAt: contract.created_at.toISOString(),
    };
  }

  private assertActorIsParticipant(
    contract: Contract,
    actor: { userId: string; professionalId: string | null },
  ): void {
    const isClient = contract.client_id === actor.userId;
    const isProfessional = actor.professionalId !== null && contract.professional_id === actor.professionalId;
    if (!isClient && !isProfessional) {
      throw new ForbiddenError('Sem acesso ao contrato');
    }
  }

  async acceptQuote(
    clientId: string,
    quoteId: string,
    schedule: ScheduleInput | null,
  ): Promise<ContractResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundError('Orcamento nao encontrado');
    if (quote.status !== 'pending') throw new UnprocessableError('Orcamento nao esta pendente');
    const demand = await this.deps.demands.findOne({ where: { id: quote.demand_id } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.client_id !== clientId) throw new ForbiddenError('Nao e o autor da demanda');
    if (demand.status !== 'open') throw new UnprocessableError('Demanda nao esta aberta');

    quote.status = 'accepted';
    await this.deps.quotes.save(quote);
    await this.deps.quotes.update({ demand_id: demand.id, status: 'pending' }, { status: 'rejected' });

    demand.status = 'in_progress';
    await this.deps.demands.save(demand);

    const contract = await this.deps.contracts.save(
      this.deps.contracts.create({
        demand_id: demand.id,
        quote_id: quote.id,
        client_id: clientId,
        professional_id: quote.professional_id,
        total_amount: Number(quote.total_amount).toFixed(2),
        status: 'active',
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
      }),
    );

    if (schedule) {
      await this.deps.schedules.save(
        this.deps.schedules.create({
          contract_id: contract.id,
          scheduled_date: new Date(schedule.scheduledDate),
          duration_minutes: schedule.durationMinutes,
          status: 'scheduled',
          notes: schedule.notes,
        }),
      );
    }

    return this.toResponse(contract);
  }

  async getById(
    id: string,
    actor: { userId: string; professionalId: string | null },
  ): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    this.assertActorIsParticipant(contract, actor);
    return this.toResponse(contract);
  }

  async listMine(
    actor: { userId: string; professionalId: string | null },
    role: 'client' | 'professional',
  ): Promise<ContractResponse[]> {
    if (role === 'professional' && actor.professionalId === null) {
      return [];
    }
    const where =
      role === 'client' ? { client_id: actor.userId } : { professional_id: actor.professionalId as string };
    const rows = await this.deps.contracts.find({ where, order: { created_at: 'DESC' } });
    return Promise.all(rows.map((c) => this.toResponse(c)));
  }

  async start(id: string, professionalId: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    if (contract.professional_id !== professionalId) throw new ForbiddenError('Nao e o profissional do contrato');
    if (contract.status !== 'active' || contract.started_at !== null) {
      throw new UnprocessableError('Contrato nao pode ser iniciado');
    }
    contract.started_at = new Date();
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async complete(id: string, professionalId: string): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    if (contract.professional_id !== professionalId) throw new ForbiddenError('Nao e o profissional do contrato');
    if (contract.status !== 'active' || contract.started_at === null) {
      throw new UnprocessableError('Contrato nao esta em execucao');
    }
    contract.status = 'completed';
    contract.completed_at = new Date();
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async cancel(
    id: string,
    actor: { userId: string; professionalId: string | null },
    reason: string,
  ): Promise<ContractResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    this.assertActorIsParticipant(contract, actor);
    if (contract.status === 'completed' || contract.status === 'cancelled') {
      throw new UnprocessableError('Contrato nao pode ser cancelado');
    }
    contract.status = 'cancelled';
    contract.cancelled_at = new Date();
    contract.cancelled_by = actor.userId;
    contract.cancellation_reason = reason;
    return this.toResponse(await this.deps.contracts.save(contract));
  }

  async addProgress(
    id: string,
    professionalId: string,
    userId: string,
    input: ProgressUpdateInput,
  ): Promise<ProgressUpdateResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    if (contract.professional_id !== professionalId) throw new ForbiddenError('Nao e o profissional do contrato');
    if (contract.status !== 'active' || contract.started_at === null) {
      throw new UnprocessableError('Contrato nao esta em execucao');
    }
    const update = await this.deps.progress.save(
      this.deps.progress.create({
        contract_id: id,
        author_id: userId,
        description: input.description,
        percentage: input.percentage,
      }),
    );
    const images = await Promise.all(
      input.images.map((url) =>
        this.deps.progressImages.save(
          this.deps.progressImages.create({ progress_update_id: update.id, image_url: url }),
        ),
      ),
    );
    return {
      id: update.id,
      contractId: id,
      authorId: userId,
      description: update.description,
      percentage: update.percentage,
      images: images.map((i) => i.image_url),
      createdAt: update.created_at.toISOString(),
    };
  }

  async listProgress(id: string): Promise<ProgressUpdateResponse[]> {
    const rows = await this.deps.progress.find({ where: { contract_id: id }, order: { created_at: 'ASC' } });
    return Promise.all(
      rows.map(async (u) => {
        const images = await this.deps.progressImages.find({ where: { progress_update_id: u.id } });
        return {
          id: u.id,
          contractId: id,
          authorId: u.author_id,
          description: u.description,
          percentage: u.percentage,
          images: images.map((i) => i.image_url),
          createdAt: u.created_at.toISOString(),
        };
      }),
    );
  }
}
