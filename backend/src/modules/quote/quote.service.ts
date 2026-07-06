import type { Repository } from 'typeorm';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type { CreateQuoteInput, MyQuoteResponse, QuoteResponse } from './quote.schemas.js';

interface QuoteServiceDeps {
  quotes: Repository<Quote>;
  demands: Repository<ServiceDemand>;
}

export class QuoteService {
  constructor(private readonly deps: QuoteServiceDeps) {}

  private toResponse(quote: Quote): QuoteResponse {
    return {
      id: quote.id,
      demandId: quote.demand_id,
      professionalId: quote.professional_id,
      message: quote.message,
      total: Number(quote.total_amount),
      status: quote.status,
      validUntil: quote.valid_until ? quote.valid_until.toISOString() : null,
      createdAt: quote.created_at.toISOString(),
    };
  }

  async create(
    professionalId: string,
    demandId: string,
    input: CreateQuoteInput,
  ): Promise<QuoteResponse> {
    const demand = await this.deps.demands.findOne({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('Demanda nao encontrada');
    if (demand.status !== 'open') throw new UnprocessableError('Demanda nao aceita orcamentos');
    const existing = await this.deps.quotes.findOne({
      where: { demand_id: demandId, professional_id: professionalId, status: 'pending' },
    });
    if (existing) throw new UnprocessableError('Ja existe orcamento pendente');
    const quote = await this.deps.quotes.save(
      this.deps.quotes.create({
        demand_id: demandId,
        professional_id: professionalId,
        message: input.message,
        total_amount: input.total.toFixed(2),
        status: 'pending',
        valid_until: input.validUntil ? new Date(input.validUntil) : null,
      }),
    );
    businessMetrics.quotesCreated.inc();
    return this.toResponse(quote);
  }

  async listByDemand(demandId: string): Promise<QuoteResponse[]> {
    const rows = await this.deps.quotes.find({
      where: { demand_id: demandId },
      order: { created_at: 'DESC' },
    });
    return rows.map((q) => this.toResponse(q));
  }

  async listMinePending(professionalId: string): Promise<MyQuoteResponse[]> {
    const rows = await this.deps.quotes.find({
      where: { professional_id: professionalId, status: 'pending' },
      relations: ['demand'],
      order: { created_at: 'DESC' },
    });
    return rows.map((q) => ({ ...this.toResponse(q), demandTitle: q.demand.title }));
  }

  async getById(id: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orcamento nao encontrado');
    return this.toResponse(quote);
  }

  async withdraw(id: string, professionalId: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orcamento nao encontrado');
    if (quote.professional_id !== professionalId) throw new ForbiddenError('Orcamento de outro profissional');
    if (quote.status !== 'pending') throw new UnprocessableError('Orcamento nao pode ser retirado');
    quote.status = 'withdrawn';
    const saved = await this.deps.quotes.save(quote);
    return this.toResponse(saved);
  }
}
