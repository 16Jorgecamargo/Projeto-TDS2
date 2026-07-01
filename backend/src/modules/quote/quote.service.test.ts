import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { QuoteService } from './quote.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { QuoteItem } from '../../infra/database/entities/quote-item.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';

describe('QuoteService', () => {
  let quotes: ReturnType<typeof mockRepo<Quote>>;
  let items: ReturnType<typeof mockRepo<QuoteItem>>;
  let demands: ReturnType<typeof mockRepo<ServiceDemand>>;
  let service: QuoteService;

  beforeEach(() => {
    quotes = mockRepo<Quote>();
    items = mockRepo<QuoteItem>();
    demands = mockRepo<ServiceDemand>();
    service = new QuoteService({
      quotes: quotes as unknown as Repository<Quote>,
      items: items as unknown as Repository<QuoteItem>,
      demands: demands as unknown as Repository<ServiceDemand>,
    });
  });

  describe('create', () => {
    it('soma subtotais e grava total com 2 casas', async () => {
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', status: 'open' } as ServiceDemand);
      quotes.findOne.mockResolvedValueOnce(null);
      quotes.save.mockImplementationOnce(async (value: Quote) => ({
        ...value,
        id: 'quote-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      }));
      items.save.mockImplementation(async (value: QuoteItem) => ({
        ...value,
        id: 'item-gen',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const result = await service.create('pro-1', 'demand-1', {
        message: 'orcamento',
        validUntil: null,
        items: [
          { description: 'mao de obra', quantity: 2, unitPrice: 150 },
          { description: 'material', quantity: 1, unitPrice: 50 },
        ],
      });

      expect(result.total).toBe(350);
      expect(result.items[0]?.subtotal).toBe(300);
      expect(typeof result.total).toBe('number');
      expect(quotes.save).toHaveBeenCalledWith(
        expect.objectContaining({ total_amount: '350.00', demand_id: 'demand-1', professional_id: 'pro-1' }),
      );
    });

    it('lanca NotFoundError quando demanda nao existe', async () => {
      demands.findOne.mockResolvedValueOnce(null);
      await expect(
        service.create('pro-1', 'demand-x', {
          message: 'orcamento valido',
          validUntil: null,
          items: [{ description: 'item', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejeita orcamento em demanda nao aberta', async () => {
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', status: 'in_progress' } as ServiceDemand);
      await expect(
        service.create('pro-1', 'demand-1', {
          message: 'orcamento valido',
          validUntil: null,
          items: [{ description: 'item', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('rejeita orcamento duplicado pendente do mesmo profissional', async () => {
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', status: 'open' } as ServiceDemand);
      quotes.findOne.mockResolvedValueOnce({ id: 'quote-existing', status: 'pending' } as Quote);
      await expect(
        service.create('pro-1', 'demand-1', {
          message: 'orcamento valido',
          validUntil: null,
          items: [{ description: 'item', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });
  });

  describe('listByDemand', () => {
    it('retorna orcamentos com itens calculados', async () => {
      quotes.find.mockResolvedValueOnce([
        {
          id: 'quote-1',
          demand_id: 'demand-1',
          professional_id: 'pro-1',
          message: 'orcamento',
          total_amount: '300.00',
          status: 'pending',
          valid_until: null,
          created_at: new Date('2026-07-01T12:00:00Z'),
          updated_at: new Date('2026-07-01T12:00:00Z'),
        } as Quote,
      ]);
      items.find.mockResolvedValueOnce([
        {
          id: 'item-1',
          quote_id: 'quote-1',
          description: 'mao de obra',
          quantity: 2,
          unit_price: '150.00',
          created_at: new Date('2026-07-01T12:00:00Z'),
        } as QuoteItem,
      ]);

      const result = await service.listByDemand('demand-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.total).toBe(300);
      expect(result[0]?.items[0]?.subtotal).toBe(300);
    });
  });

  describe('getById', () => {
    it('lanca NotFoundError quando orcamento nao existe', async () => {
      quotes.findOne.mockResolvedValueOnce(null);
      await expect(service.getById('quote-x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna o orcamento com itens', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        message: 'orcamento',
        total_amount: '300.00',
        status: 'pending',
        valid_until: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      } as Quote);
      items.find.mockResolvedValueOnce([]);

      const result = await service.getById('quote-1');

      expect(result.id).toBe('quote-1');
      expect(result.professionalId).toBe('pro-1');
    });
  });

  describe('withdraw', () => {
    it('lanca NotFoundError quando orcamento nao existe', async () => {
      quotes.findOne.mockResolvedValueOnce(null);
      await expect(service.withdraw('quote-x', 'pro-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanca ForbiddenError quando nao e o profissional dono', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        professional_id: 'pro-1',
        status: 'pending',
      } as Quote);
      await expect(service.withdraw('quote-1', 'pro-2')).rejects.toBeInstanceOf(ForbiddenError);
      expect(quotes.save).not.toHaveBeenCalled();
    });

    it('lanca UnprocessableError quando orcamento nao esta pendente', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        professional_id: 'pro-1',
        status: 'accepted',
      } as Quote);
      await expect(service.withdraw('quote-1', 'pro-1')).rejects.toBeInstanceOf(UnprocessableError);
      expect(quotes.save).not.toHaveBeenCalled();
    });

    it('retira o orcamento pendente do proprio profissional', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        message: 'orcamento',
        total_amount: '300.00',
        status: 'pending',
        valid_until: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      } as Quote);
      quotes.save.mockImplementationOnce(async (value: Quote) => value);
      items.find.mockResolvedValueOnce([]);

      const result = await service.withdraw('quote-1', 'pro-1');

      expect(result.status).toBe('withdrawn');
    });
  });
});
