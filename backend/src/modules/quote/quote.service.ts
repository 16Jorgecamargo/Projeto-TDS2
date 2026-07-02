import type { Repository } from 'typeorm';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { QuoteItem } from '../../infra/database/entities/quote-item.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type { CreateQuoteInput, QuoteResponse } from './quote.schemas.js';

interface QuoteServiceDeps {
  quotes: Repository<Quote>;
  items: Repository<QuoteItem>;
  demands: Repository<ServiceDemand>;
}

export class QuoteService {
  constructor(private readonly deps: QuoteServiceDeps) {}

  private toResponse(quote: Quote, items: QuoteItem[]): QuoteResponse {
    return {
      id: quote.id,
      demandId: quote.demand_id,
      professionalId: quote.professional_id,
      message: quote.message,
      total: Number(quote.total_amount),
      status: quote.status,
      validUntil: quote.valid_until ? quote.valid_until.toISOString() : null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        subtotal: Number((i.quantity * Number(i.unit_price)).toFixed(2)),
      })),
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
    const computed = input.items.map((i) => ({
      ...i,
      subtotal: Number((i.quantity * i.unitPrice).toFixed(2)),
    }));
    const total = computed.reduce((acc, i) => acc + i.subtotal, 0);
    const quote = await this.deps.quotes.save(
      this.deps.quotes.create({
        demand_id: demandId,
        professional_id: professionalId,
        message: input.message,
        total_amount: total.toFixed(2),
        status: 'pending',
        valid_until: input.validUntil ? new Date(input.validUntil) : null,
      }),
    );
    const savedItems = await Promise.all(
      computed.map((i) =>
        this.deps.items.save(
          this.deps.items.create({
            quote_id: quote.id,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unitPrice.toFixed(2),
          }),
        ),
      ),
    );
    businessMetrics.quotesCreated.inc();
    return this.toResponse(quote, savedItems);
  }

  async listByDemand(demandId: string): Promise<QuoteResponse[]> {
    const rows = await this.deps.quotes.find({
      where: { demand_id: demandId },
      order: { created_at: 'DESC' },
    });
    return Promise.all(
      rows.map(async (q) => {
        const items = await this.deps.items.find({ where: { quote_id: q.id } });
        return this.toResponse(q, items);
      }),
    );
  }

  async getById(id: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orcamento nao encontrado');
    const items = await this.deps.items.find({ where: { quote_id: id } });
    return this.toResponse(quote, items);
  }

  async withdraw(id: string, professionalId: string): Promise<QuoteResponse> {
    const quote = await this.deps.quotes.findOne({ where: { id } });
    if (!quote) throw new NotFoundError('Orcamento nao encontrado');
    if (quote.professional_id !== professionalId) throw new ForbiddenError('Orcamento de outro profissional');
    if (quote.status !== 'pending') throw new UnprocessableError('Orcamento nao pode ser retirado');
    quote.status = 'withdrawn';
    const saved = await this.deps.quotes.save(quote);
    const items = await this.deps.items.find({ where: { quote_id: id } });
    return this.toResponse(saved, items);
  }
}
