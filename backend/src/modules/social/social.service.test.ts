import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { SocialService } from './social.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { Favorite } from '../../infra/database/entities/favorite.entity.js';
import type { Report } from '../../infra/database/entities/report.entity.js';
import type { UserBlock } from '../../infra/database/entities/user-block.entity.js';

describe('SocialService', () => {
  let favorites: ReturnType<typeof mockRepo<Favorite>>;
  let reports: ReturnType<typeof mockRepo<Report>>;
  let blocks: ReturnType<typeof mockRepo<UserBlock>>;
  let recordAudit: ReturnType<typeof vi.fn>;
  let service: SocialService;

  beforeEach(() => {
    favorites = mockRepo<Favorite>();
    reports = mockRepo<Report>();
    blocks = mockRepo<UserBlock>();
    recordAudit = vi.fn().mockResolvedValue(undefined);
    service = new SocialService({
      favorites: favorites as unknown as Repository<Favorite>,
      reports: reports as unknown as Repository<Report>,
      blocks: blocks as unknown as Repository<UserBlock>,
      recordAudit,
    });
  });

  describe('addFavorite', () => {
    it('favorita profissional novo', async () => {
      favorites.save.mockImplementationOnce(async (value: Favorite) => ({
        ...value,
        id: 'fav-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));

      const result = await service.addFavorite('user-1', 'pro-1');

      expect(result.professionalId).toBe('pro-1');
      expect(result.id).toBe('fav-1');
    });

    it('impede favorito duplicado', async () => {
      favorites.findOne.mockResolvedValueOnce({ id: 'fav-1' } as Favorite);

      await expect(service.addFavorite('user-1', 'pro-1')).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('removeFavorite', () => {
    it('lanca NotFound se favorito nao existe', async () => {
      favorites.delete.mockResolvedValueOnce({ affected: 0, raw: {} });

      await expect(service.removeFavorite('user-1', 'pro-1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('createReport', () => {
    it('cria denuncia com status pending e audita', async () => {
      reports.save.mockImplementationOnce(async (value: Report) => ({
        ...value,
        id: 'rep-1',
      }));

      const result = await service.createReport('user-1', {
        targetType: 'user',
        targetId: 'pro-1',
        reason: 'abuse',
        description: 'x',
      });

      expect(result.status).toBe('pending');
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'report.created', userId: 'user-1' }),
      );
    });
  });

  describe('blockUser', () => {
    it('impede autobloqueio', async () => {
      await expect(service.blockUser('user-1', 'user-1')).rejects.toBeInstanceOf(ConflictError);
    });

    it('impede bloqueio duplicado', async () => {
      blocks.findOne.mockResolvedValueOnce({ id: 'blk-1' } as UserBlock);

      await expect(service.blockUser('user-1', 'user-2')).rejects.toBeInstanceOf(ConflictError);
    });

    it('bloqueia usuario e audita', async () => {
      blocks.save.mockImplementationOnce(async (value: UserBlock) => ({
        ...value,
        id: 'blk-1',
      }));

      const result = await service.blockUser('user-1', 'user-2');

      expect(result.blockedId).toBe('user-2');
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.blocked', userId: 'user-1', entityId: 'user-2' }),
      );
    });
  });

  describe('unblockUser', () => {
    it('lanca NotFound se bloqueio nao existe', async () => {
      blocks.delete.mockResolvedValueOnce({ affected: 0, raw: {} });

      await expect(service.unblockUser('user-1', 'user-2')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('isBlockedBetween', () => {
    it('retorna true quando ha bloqueio em qualquer direcao', async () => {
      blocks.count.mockResolvedValueOnce(1);

      await expect(service.isBlockedBetween('a', 'b')).resolves.toBe(true);
    });

    it('retorna false quando nao ha bloqueio', async () => {
      blocks.count.mockResolvedValueOnce(0);

      await expect(service.isBlockedBetween('a', 'b')).resolves.toBe(false);
    });
  });
});
