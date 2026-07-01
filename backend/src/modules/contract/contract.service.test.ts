import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { ContractService } from './contract.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { Schedule } from '../../infra/database/entities/schedule.entity.js';
import type { ContractProgressUpdate } from '../../infra/database/entities/contract-progress-update.entity.js';
import type { ContractProgressImage } from '../../infra/database/entities/contract-progress-image.entity.js';

describe('ContractService', () => {
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let quotes: ReturnType<typeof mockRepo<Quote>>;
  let demands: ReturnType<typeof mockRepo<ServiceDemand>>;
  let schedules: ReturnType<typeof mockRepo<Schedule>>;
  let progress: ReturnType<typeof mockRepo<ContractProgressUpdate>>;
  let progressImages: ReturnType<typeof mockRepo<ContractProgressImage>>;
  let service: ContractService;

  beforeEach(() => {
    contracts = mockRepo<Contract>();
    quotes = mockRepo<Quote>();
    demands = mockRepo<ServiceDemand>();
    schedules = mockRepo<Schedule>();
    progress = mockRepo<ContractProgressUpdate>();
    progressImages = mockRepo<ContractProgressImage>();
    service = new ContractService({
      contracts: contracts as unknown as Repository<Contract>,
      quotes: quotes as unknown as Repository<Quote>,
      demands: demands as unknown as Repository<ServiceDemand>,
      schedules: schedules as unknown as Repository<Schedule>,
      progress: progress as unknown as Repository<ContractProgressUpdate>,
      progressImages: progressImages as unknown as Repository<ContractProgressImage>,
    });
  });

  describe('acceptQuote', () => {
    it('aceita orcamento, cria contrato ativo e rejeita os demais', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'pending',
      } as Quote);
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);
      quotes.save.mockImplementationOnce(async (value: Quote) => value);
      demands.save.mockImplementationOnce(async (value: ServiceDemand) => value);
      contracts.save.mockImplementationOnce(async (value: Contract) => ({
        ...value,
        id: 'contract-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      schedules.findOne.mockResolvedValueOnce(null);

      const result = await service.acceptQuote('client-1', 'quote-1', null);

      expect(result.status).toBe('active');
      expect(result.total).toBe(300);
      expect(quotes.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'quote-1', status: 'accepted' }));
      expect(quotes.update).toHaveBeenCalledWith(
        { demand_id: 'demand-1', status: 'pending' },
        { status: 'rejected' },
      );
      expect(demands.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
      expect(contracts.save).toHaveBeenCalledWith(
        expect.objectContaining({
          demand_id: 'demand-1',
          quote_id: 'quote-1',
          client_id: 'client-1',
          professional_id: 'pro-1',
          total_amount: '300.00',
          status: 'active',
        }),
      );
    });

    it('cria agendamento quando informado', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'pending',
      } as Quote);
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', client_id: 'client-1', status: 'open' } as ServiceDemand);
      contracts.save.mockImplementationOnce(async (value: Contract) => ({
        ...value,
        id: 'contract-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      schedules.save.mockImplementationOnce(async (value: Schedule) => ({
        ...value,
        id: 'schedule-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
        updated_at: new Date('2026-07-01T12:00:00Z'),
      }));
      schedules.findOne.mockResolvedValueOnce({
        id: 'schedule-1',
        contract_id: 'contract-1',
        scheduled_date: new Date('2026-07-05T09:00:00Z'),
        duration_minutes: 120,
        status: 'scheduled',
        notes: null,
      } as Schedule);

      const result = await service.acceptQuote('client-1', 'quote-1', {
        scheduledDate: '2026-07-05T09:00:00Z',
        durationMinutes: 120,
        notes: null,
      });

      expect(schedules.save).toHaveBeenCalledWith(
        expect.objectContaining({ contract_id: 'contract-1', duration_minutes: 120 }),
      );
      expect(result.schedule).toEqual({
        id: 'schedule-1',
        scheduledDate: '2026-07-05T09:00:00.000Z',
        durationMinutes: 120,
        notes: null,
        status: 'scheduled',
      });
    });

    it('lanca NotFoundError quando orcamento nao existe', async () => {
      quotes.findOne.mockResolvedValueOnce(null);
      await expect(service.acceptQuote('client-1', 'quote-x', null)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanca UnprocessableError quando orcamento nao esta pendente', async () => {
      quotes.findOne.mockResolvedValueOnce({ id: 'quote-1', demand_id: 'demand-1', status: 'accepted' } as Quote);
      await expect(service.acceptQuote('client-1', 'quote-1', null)).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('impede aceitar orcamento de demanda de outro cliente', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'pending',
      } as Quote);
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', client_id: 'outro', status: 'open' } as ServiceDemand);
      await expect(service.acceptQuote('client-1', 'quote-1', null)).rejects.toBeInstanceOf(ForbiddenError);
      expect(contracts.save).not.toHaveBeenCalled();
    });

    it('lanca UnprocessableError quando demanda nao esta aberta', async () => {
      quotes.findOne.mockResolvedValueOnce({
        id: 'quote-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'pending',
      } as Quote);
      demands.findOne.mockResolvedValueOnce({ id: 'demand-1', client_id: 'client-1', status: 'in_progress' } as ServiceDemand);
      await expect(service.acceptQuote('client-1', 'quote-1', null)).rejects.toBeInstanceOf(UnprocessableError);
    });
  });

  describe('getById', () => {
    it('lanca NotFoundError quando contrato nao existe', async () => {
      contracts.findOne.mockResolvedValueOnce(null);
      await expect(service.getById('contract-x', 'client-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('permite acesso ao cliente participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'active',
        cancelled_by: null,
        cancellation_reason: null,
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      schedules.findOne.mockResolvedValueOnce(null);
      const result = await service.getById('contract-1', 'client-1');
      expect(result.id).toBe('contract-1');
    });

    it('permite acesso ao profissional participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'active',
        cancelled_by: null,
        cancellation_reason: null,
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      schedules.findOne.mockResolvedValueOnce(null);
      const result = await service.getById('contract-1', 'pro-1');
      expect(result.id).toBe('contract-1');
    });

    it('lanca ForbiddenError quando nao e participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(service.getById('contract-1', 'estranho')).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('listMine', () => {
    it('filtra por cliente', async () => {
      contracts.find.mockResolvedValueOnce([]);
      await service.listMine('client-1', 'client');
      expect(contracts.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client_id: 'client-1' } }),
      );
    });

    it('filtra por profissional', async () => {
      contracts.find.mockResolvedValueOnce([]);
      await service.listMine('pro-1', 'professional');
      expect(contracts.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { professional_id: 'pro-1' } }),
      );
    });
  });

  describe('start', () => {
    it('lanca NotFoundError quando contrato nao existe', async () => {
      contracts.findOne.mockResolvedValueOnce(null);
      await expect(service.start('contract-x', 'pro-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanca ForbiddenError quando nao e o profissional do contrato', async () => {
      contracts.findOne.mockResolvedValueOnce({ id: 'contract-1', professional_id: 'pro-1', status: 'active', started_at: null } as Contract);
      await expect(service.start('contract-1', 'pro-2')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca UnprocessableError quando contrato ja foi iniciado', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        professional_id: 'pro-1',
        status: 'active',
        started_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      await expect(service.start('contract-1', 'pro-1')).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('inicia o contrato ativo', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'active',
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      contracts.save.mockImplementationOnce(async (value: Contract) => value);
      schedules.findOne.mockResolvedValueOnce(null);
      const result = await service.start('contract-1', 'pro-1');
      expect(result.startedAt).not.toBeNull();
      expect(result.status).toBe('active');
    });
  });

  describe('complete', () => {
    it('lanca UnprocessableError quando contrato nao foi iniciado', async () => {
      contracts.findOne.mockResolvedValueOnce({ id: 'contract-1', professional_id: 'pro-1', status: 'active', started_at: null } as Contract);
      await expect(service.complete('contract-1', 'pro-1')).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('completa o contrato em execucao', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'active',
        started_at: new Date('2026-07-01T12:00:00Z'),
        completed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      contracts.save.mockImplementationOnce(async (value: Contract) => value);
      schedules.findOne.mockResolvedValueOnce(null);
      const result = await service.complete('contract-1', 'pro-1');
      expect(result.status).toBe('completed');
      expect(result.completedAt).not.toBeNull();
    });
  });

  describe('cancel', () => {
    it('lanca UnprocessableError quando contrato ja esta concluido', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'completed',
      } as Contract);
      await expect(service.cancel('contract-1', 'client-1', 'motivo valido')).rejects.toBeInstanceOf(
        UnprocessableError,
      );
    });

    it('lanca ForbiddenError quando nao e participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(service.cancel('contract-1', 'estranho', 'motivo valido')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('cancela o contrato ativo', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        total_amount: '300.00',
        status: 'active',
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      contracts.save.mockImplementationOnce(async (value: Contract) => value);
      schedules.findOne.mockResolvedValueOnce(null);
      const result = await service.cancel('contract-1', 'client-1', 'indisponibilidade');
      expect(result.status).toBe('cancelled');
      expect(result.cancelledBy).toBe('client-1');
      expect(result.cancellationReason).toBe('indisponibilidade');
    });
  });

  describe('addProgress', () => {
    it('lanca ForbiddenError quando autor nao e o profissional do contrato', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        professional_id: 'pro-1',
        status: 'active',
        started_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      await expect(
        service.addProgress('contract-1', 'pro-2', { description: 'fase 1', percentage: 10, images: [] }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca UnprocessableError quando contrato nao esta em execucao', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        professional_id: 'pro-1',
        status: 'active',
        started_at: null,
      } as Contract);
      await expect(
        service.addProgress('contract-1', 'pro-1', { description: 'fase 1', percentage: 10, images: [] }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('registra progresso com imagens', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        professional_id: 'pro-1',
        status: 'active',
        started_at: new Date('2026-07-01T12:00:00Z'),
      } as Contract);
      progress.save.mockImplementationOnce(async (value: ContractProgressUpdate) => ({
        ...value,
        id: 'progress-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      progressImages.save.mockImplementation(async (value: ContractProgressImage) => ({
        ...value,
        id: 'image-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const result = await service.addProgress('contract-1', 'pro-1', {
        description: 'fase 1 concluida',
        percentage: 50,
        images: ['https://example.com/foto.jpg'],
      });

      expect(result.percentage).toBe(50);
      expect(result.images).toEqual(['https://example.com/foto.jpg']);
    });
  });

  describe('listProgress', () => {
    it('retorna atualizacoes com imagens', async () => {
      progress.find.mockResolvedValueOnce([
        {
          id: 'progress-1',
          contract_id: 'contract-1',
          author_id: 'pro-1',
          description: 'fase 1',
          percentage: 50,
          created_at: new Date('2026-07-01T12:00:00Z'),
        } as ContractProgressUpdate,
      ]);
      progressImages.find.mockResolvedValueOnce([
        { id: 'image-1', progress_update_id: 'progress-1', image_url: 'https://example.com/foto.jpg', created_at: new Date('2026-07-01T12:00:00Z') } as ContractProgressImage,
      ]);

      const result = await service.listProgress('contract-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.images).toEqual(['https://example.com/foto.jpg']);
    });
  });
});
