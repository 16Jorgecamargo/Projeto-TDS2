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
import type { User } from '../../infra/database/entities/user.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';

describe('ContractService', () => {
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let quotes: ReturnType<typeof mockRepo<Quote>>;
  let demands: ReturnType<typeof mockRepo<ServiceDemand>>;
  let schedules: ReturnType<typeof mockRepo<Schedule>>;
  let progress: ReturnType<typeof mockRepo<ContractProgressUpdate>>;
  let progressImages: ReturnType<typeof mockRepo<ContractProgressImage>>;
  let users: ReturnType<typeof mockRepo<User>>;
  let professionalProfiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let service: ContractService;

  beforeEach(() => {
    contracts = mockRepo<Contract>();
    quotes = mockRepo<Quote>();
    demands = mockRepo<ServiceDemand>();
    schedules = mockRepo<Schedule>();
    progress = mockRepo<ContractProgressUpdate>();
    progressImages = mockRepo<ContractProgressImage>();
    users = mockRepo<User>();
    professionalProfiles = mockRepo<ProfessionalProfile>();
    service = new ContractService({
      contracts: contracts as unknown as Repository<Contract>,
      quotes: quotes as unknown as Repository<Quote>,
      demands: demands as unknown as Repository<ServiceDemand>,
      schedules: schedules as unknown as Repository<Schedule>,
      progress: progress as unknown as Repository<ContractProgressUpdate>,
      progressImages: progressImages as unknown as Repository<ContractProgressImage>,
      users: users as unknown as Repository<User>,
      professionalProfiles: professionalProfiles as unknown as Repository<ProfessionalProfile>,
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
      await expect(
        service.getById('contract-x', { userId: 'client-1', professionalId: null }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('permite acesso ao cliente participante usando o proprio user id', async () => {
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
      const result = await service.getById('contract-1', { userId: 'client-1', professionalId: null });
      expect(result.id).toBe('contract-1');
    });

    it('permite acesso ao profissional participante usando o profile id', async () => {
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
      const result = await service.getById('contract-1', { userId: 'user-pro-1', professionalId: 'pro-1' });
      expect(result.id).toBe('contract-1');
    });

    it('lanca ForbiddenError quando profissional informa o proprio user id em vez do profile id', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.getById('contract-1', { userId: 'pro-1', professionalId: null }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca ForbiddenError quando nao e participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.getById('contract-1', { userId: 'estranho', professionalId: null }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('listMine', () => {
    it('filtra por cliente usando o proprio user id', async () => {
      contracts.find.mockResolvedValueOnce([]);
      await service.listMine({ userId: 'client-1', professionalId: null }, 'client');
      expect(contracts.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client_id: 'client-1' } }),
      );
    });

    it('filtra por profissional usando o profile id, nao o user id', async () => {
      contracts.find.mockResolvedValueOnce([]);
      await service.listMine({ userId: 'user-pro-1', professionalId: 'pro-1' }, 'professional');
      expect(contracts.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { professional_id: 'pro-1' } }),
      );
    });

    it('retorna lista vazia quando ator sem profile de profissional pede papel professional', async () => {
      const result = await service.listMine({ userId: 'user-1', professionalId: null }, 'professional');
      expect(result).toEqual([]);
      expect(contracts.find).not.toHaveBeenCalled();
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
      await expect(
        service.cancel('contract-1', { userId: 'client-1', professionalId: null }, 'motivo valido'),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('lanca ForbiddenError quando nao e participante', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.cancel('contract-1', { userId: 'estranho', professionalId: null }, 'motivo valido'),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('lanca ForbiddenError quando profissional informado nao e o do contrato', async () => {
      contracts.findOne.mockResolvedValueOnce({
        id: 'contract-1',
        client_id: 'client-1',
        professional_id: 'pro-1',
        status: 'active',
      } as Contract);
      await expect(
        service.cancel('contract-1', { userId: 'user-2', professionalId: 'pro-2' }, 'motivo valido'),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('cliente cancela o contrato ativo usando o proprio user id', async () => {
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
      const result = await service.cancel(
        'contract-1',
        { userId: 'client-1', professionalId: null },
        'indisponibilidade',
      );
      expect(result.status).toBe('cancelled');
      expect(result.cancelledBy).toBe('client-1');
      expect(result.cancellationReason).toBe('indisponibilidade');
      expect(contracts.save).toHaveBeenCalledWith(expect.objectContaining({ cancelled_by: 'client-1' }));
    });

    it('profissional cancela usando o profile id para autorizacao e o user id no registro', async () => {
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
      const result = await service.cancel(
        'contract-1',
        { userId: 'user-pro-1', professionalId: 'pro-1' },
        'indisponibilidade',
      );
      expect(result.status).toBe('cancelled');
      expect(result.cancelledBy).toBe('user-pro-1');
      expect(contracts.save).toHaveBeenCalledWith(expect.objectContaining({ cancelled_by: 'user-pro-1' }));
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
        service.addProgress('contract-1', 'pro-2', 'user-pro-2', {
          description: 'fase 1',
          percentage: 10,
          images: [],
        }),
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
        service.addProgress('contract-1', 'pro-1', 'user-pro-1', {
          description: 'fase 1',
          percentage: 10,
          images: [],
        }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it('registra progresso com imagens usando o profile id para autorizacao e o user id como autor', async () => {
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

      const result = await service.addProgress('contract-1', 'pro-1', 'user-pro-1', {
        description: 'fase 1 concluida',
        percentage: 50,
        images: ['https://example.com/foto.jpg'],
      });

      expect(result.percentage).toBe(50);
      expect(result.authorId).toBe('user-pro-1');
      expect(result.images).toEqual(['https://example.com/foto.jpg']);
      expect(progress.save).toHaveBeenCalledWith(expect.objectContaining({ author_id: 'user-pro-1' }));
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
