import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { DemandService } from './demand.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { DemandImage } from '../../infra/database/entities/demand-image.entity.js';
import type { DemandTag } from '../../infra/database/entities/demand-tag.entity.js';
import type { DemandInvitation } from '../../infra/database/entities/demand-invitation.entity.js';

describe('DemandService', () => {
  let demands: ReturnType<typeof mockRepo<ServiceDemand>>;
  let images: ReturnType<typeof mockRepo<DemandImage>>;
  let tags: ReturnType<typeof mockRepo<DemandTag>>;
  let invitations: ReturnType<typeof mockRepo<DemandInvitation>>;
  let service: DemandService;

  beforeEach(() => {
    demands = mockRepo<ServiceDemand>();
    images = mockRepo<DemandImage>();
    tags = mockRepo<DemandTag>();
    invitations = mockRepo<DemandInvitation>();
    service = new DemandService({
      demands: demands as unknown as Repository<ServiceDemand>,
      images: images as unknown as Repository<DemandImage>,
      tags: tags as unknown as Repository<DemandTag>,
      invitations: invitations as unknown as Repository<DemandInvitation>,
    });
  });

  describe('create', () => {
    it('persiste demanda e retorna budgets como number', async () => {
      demands.save.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        category_id: 'cat-1',
        title: 'Instalacao eletrica',
        description: 'x'.repeat(20),
        budget_min: '100.00',
        budget_max: '500.00',
        status: 'open',
        address_id: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ServiceDemand);
      images.save.mockResolvedValueOnce({
        id: 'img-1',
        demand_id: 'demand-1',
        image_url: 'https://cdn.app/a.jpg',
        position: 0,
      } as DemandImage);

      const result = await service.create('client-1', {
        categoryId: 'cat-1',
        title: 'Instalacao eletrica',
        description: 'x'.repeat(20),
        budgetMin: 100,
        budgetMax: 500,
        addressId: null,
        tagIds: ['tag-1'],
        images: [{ url: 'https://cdn.app/a.jpg', position: 0 }],
      });

      expect(result.budgetMin).toBe(100);
      expect(result.budgetMax).toBe(500);
      expect(typeof result.budgetMin).toBe('number');
      expect(result.images).toEqual([{ url: 'https://cdn.app/a.jpg', position: 0 }]);
      expect(result.tagIds).toEqual(['tag-1']);
      expect(tags.save).toHaveBeenCalled();
      expect(images.save).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('filtra por status, categoria e mine com paginacao', async () => {
      demands.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'demand-1',
            client_id: 'client-1',
            category_id: 'cat-1',
            title: 'Instalacao eletrica',
            description: 'x'.repeat(20),
            budget_min: '100.00',
            budget_max: '500.00',
            status: 'open',
            address_id: null,
            created_at: new Date('2026-07-01T12:00:00Z'),
          } as ServiceDemand,
        ],
        1,
      ]);

      const result = await service.list(
        { status: 'open', categoryId: 'cat-1', mine: true, page: 1, limit: 10 },
        'client-1',
      );

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(demands.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'open', category_id: 'cat-1', client_id: 'client-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('getById', () => {
    it('lanca NotFoundError quando demanda nao existe', async () => {
      demands.findOne.mockResolvedValueOnce(null);
      await expect(service.getById('demand-x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna a demanda com imagens e tags', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        category_id: 'cat-1',
        title: 'Instalacao eletrica',
        description: 'x'.repeat(20),
        budget_min: '100.00',
        budget_max: '500.00',
        status: 'open',
        address_id: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ServiceDemand);
      images.find.mockResolvedValueOnce([
        { id: 'img-1', demand_id: 'demand-1', image_url: 'https://cdn.app/a.jpg', position: 0 } as DemandImage,
      ]);
      tags.find.mockResolvedValueOnce([{ id: 'dt-1', demand_id: 'demand-1', tag_id: 'tag-1' } as DemandTag]);

      const result = await service.getById('demand-1');

      expect(result.id).toBe('demand-1');
      expect(result.images).toEqual([{ url: 'https://cdn.app/a.jpg', position: 0 }]);
      expect(result.tagIds).toEqual(['tag-1']);
    });
  });

  describe('update', () => {
    it('lanca ForbiddenError quando nao e o autor', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);

      await expect(
        service.update('demand-1', 'client-2', { title: 'Novo titulo' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(demands.save).not.toHaveBeenCalled();
    });

    it('lanca ForbiddenError quando status nao e open', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'in_progress',
      } as ServiceDemand);

      await expect(
        service.update('demand-1', 'client-1', { title: 'Novo titulo' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(demands.save).not.toHaveBeenCalled();
    });

    it('atualiza apenas os campos informados', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        category_id: 'cat-1',
        title: 'Titulo antigo',
        description: 'x'.repeat(20),
        budget_min: '100.00',
        budget_max: '500.00',
        status: 'open',
        address_id: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ServiceDemand);
      demands.save.mockImplementationOnce(async (value: ServiceDemand) => value);

      const result = await service.update('demand-1', 'client-1', { title: 'Titulo novo' });

      expect(result.title).toBe('Titulo novo');
      expect(result.budgetMin).toBe(100);
    });
  });

  describe('cancel', () => {
    it('lanca ForbiddenError quando nao e o autor', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);

      await expect(service.cancel('demand-1', 'client-2')).rejects.toBeInstanceOf(ForbiddenError);
      expect(demands.save).not.toHaveBeenCalled();
    });

    it('cancela a demanda do proprio autor', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        category_id: 'cat-1',
        title: 'Instalacao eletrica',
        description: 'x'.repeat(20),
        budget_min: '100.00',
        budget_max: '500.00',
        status: 'open',
        address_id: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ServiceDemand);
      demands.save.mockImplementationOnce(async (value: ServiceDemand) => value);

      const result = await service.cancel('demand-1', 'client-1');

      expect(result.status).toBe('cancelled');
    });
  });

  describe('invite', () => {
    it('lanca NotFoundError quando demanda nao existe', async () => {
      demands.findOne.mockResolvedValueOnce(null);
      await expect(service.invite('demand-x', 'client-1', 'pro-1')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('lanca ForbiddenError quando nao e o autor da demanda', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);

      await expect(service.invite('demand-1', 'client-2', 'pro-1')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('lanca ForbiddenError quando demanda nao esta open', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'in_progress',
      } as ServiceDemand);

      await expect(service.invite('demand-1', 'client-1', 'pro-1')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('rejeita convite duplicado', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);
      invitations.findOne.mockResolvedValueOnce({ id: 'inv-1' } as DemandInvitation);

      await expect(service.invite('demand-1', 'client-1', 'pro-1')).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('cria convite pending', async () => {
      demands.findOne.mockResolvedValueOnce({
        id: 'demand-1',
        client_id: 'client-1',
        status: 'open',
      } as ServiceDemand);
      invitations.findOne.mockResolvedValueOnce(null);
      invitations.save.mockResolvedValueOnce({
        id: 'inv-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        status: 'pending',
      } as DemandInvitation);

      const result = await service.invite('demand-1', 'client-1', 'pro-1');

      expect(result.status).toBe('pending');
      expect(result.demandId).toBe('demand-1');
      expect(result.professionalId).toBe('pro-1');
    });
  });

  describe('respondInvitation', () => {
    it('lanca NotFoundError quando convite nao existe', async () => {
      invitations.findOne.mockResolvedValueOnce(null);
      await expect(service.respondInvitation('inv-x', 'pro-1', true)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('lanca ForbiddenError quando nao e o profissional convidado', async () => {
      invitations.findOne.mockResolvedValueOnce({
        id: 'inv-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        status: 'pending',
      } as DemandInvitation);

      await expect(service.respondInvitation('inv-1', 'pro-2', true)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('lanca ForbiddenError quando convite ja foi respondido', async () => {
      invitations.findOne.mockResolvedValueOnce({
        id: 'inv-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        status: 'accepted',
      } as DemandInvitation);

      await expect(service.respondInvitation('inv-1', 'pro-1', true)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('aceita convite pendente', async () => {
      invitations.findOne.mockResolvedValueOnce({
        id: 'inv-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        status: 'pending',
      } as DemandInvitation);
      invitations.save.mockImplementationOnce(async (value: DemandInvitation) => value);

      const result = await service.respondInvitation('inv-1', 'pro-1', true);

      expect(result.status).toBe('accepted');
    });

    it('recusa convite pendente', async () => {
      invitations.findOne.mockResolvedValueOnce({
        id: 'inv-1',
        demand_id: 'demand-1',
        professional_id: 'pro-1',
        status: 'pending',
      } as DemandInvitation);
      invitations.save.mockImplementationOnce(async (value: DemandInvitation) => value);

      const result = await service.respondInvitation('inv-1', 'pro-1', false);

      expect(result.status).toBe('declined');
    });
  });

  describe('listInvitations', () => {
    it('retorna todos os convites da demanda', async () => {
      invitations.find.mockResolvedValueOnce([
        {
          id: 'inv-1',
          demand_id: 'demand-1',
          professional_id: 'pro-1',
          status: 'pending',
        } as DemandInvitation,
        {
          id: 'inv-2',
          demand_id: 'demand-1',
          professional_id: 'pro-2',
          status: 'accepted',
        } as DemandInvitation,
      ]);

      const result = await service.listInvitations('demand-1');

      expect(result).toHaveLength(2);
      expect(result[0]?.professionalId).toBe('pro-1');
      expect(result[1]?.status).toBe('accepted');
    });
  });
});
