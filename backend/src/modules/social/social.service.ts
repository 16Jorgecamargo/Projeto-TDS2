import type { Repository } from 'typeorm';
import type { Favorite } from '../../infra/database/entities/favorite.entity.js';
import type { Report } from '../../infra/database/entities/report.entity.js';
import type { UserBlock } from '../../infra/database/entities/user-block.entity.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { CreateReportBody, FavoriteResponse, ReportResponse, BlockResponse } from './social.schemas.js';

export type RecordAudit = (input: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
}) => Promise<void>;

interface SocialServiceDeps {
  favorites: Repository<Favorite>;
  reports: Repository<Report>;
  blocks: Repository<UserBlock>;
  recordAudit: RecordAudit;
}

export class SocialService {
  constructor(private readonly deps: SocialServiceDeps) {}

  private toFavoriteResponse(favorite: Favorite): FavoriteResponse {
    return {
      id: favorite.id,
      professionalId: favorite.professional_id,
      createdAt: favorite.created_at.toISOString(),
    };
  }

  private toBlockResponse(block: UserBlock): BlockResponse {
    return {
      id: block.id,
      blockedId: block.blocked_id,
    };
  }

  async addFavorite(userId: string, professionalId: string): Promise<FavoriteResponse> {
    const existing = await this.deps.favorites.findOne({
      where: { user_id: userId, professional_id: professionalId },
    });
    if (existing) {
      throw new ConflictError('Profissional ja favoritado');
    }

    const entity = this.deps.favorites.create({
      user_id: userId,
      professional_id: professionalId,
    });
    const saved = await this.deps.favorites.save(entity);
    return this.toFavoriteResponse(saved);
  }

  async removeFavorite(userId: string, professionalId: string): Promise<void> {
    const result = await this.deps.favorites.delete({ user_id: userId, professional_id: professionalId });
    if (!result.affected) {
      throw new NotFoundError('Favorito nao encontrado');
    }
  }

  async listFavorites(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: FavoriteResponse[]; total: number }> {
    const [rows, total] = await this.deps.favorites.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toFavoriteResponse(row)), total };
  }

  async createReport(reporterId: string, body: CreateReportBody): Promise<ReportResponse> {
    const entity = this.deps.reports.create({
      reporter_id: reporterId,
      target_type: body.targetType,
      target_id: body.targetId,
      reason: body.reason,
      description: body.description,
      status: 'pending',
    });
    const saved = await this.deps.reports.save(entity);

    await this.deps.recordAudit({
      userId: reporterId,
      action: 'report.created',
      entityType: 'report',
      entityId: saved.id,
    });

    return { id: saved.id, status: saved.status };
  }

  async blockUser(blockerId: string, blockedId: string): Promise<BlockResponse> {
    if (blockerId === blockedId) {
      throw new ConflictError('Nao e possivel bloquear a si mesmo');
    }

    const existing = await this.deps.blocks.findOne({
      where: { blocker_id: blockerId, blocked_id: blockedId },
    });
    if (existing) {
      throw new ConflictError('Usuario ja bloqueado');
    }

    const entity = this.deps.blocks.create({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    const saved = await this.deps.blocks.save(entity);

    await this.deps.recordAudit({
      userId: blockerId,
      action: 'user.blocked',
      entityType: 'user',
      entityId: blockedId,
    });

    return this.toBlockResponse(saved);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const result = await this.deps.blocks.delete({ blocker_id: blockerId, blocked_id: blockedId });
    if (!result.affected) {
      throw new NotFoundError('Bloqueio nao encontrado');
    }
  }

  async listBlocks(
    blockerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: BlockResponse[]; total: number }> {
    const [rows, total] = await this.deps.blocks.findAndCount({
      where: { blocker_id: blockerId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toBlockResponse(row)), total };
  }

  async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const count = await this.deps.blocks.count({
      where: [
        { blocker_id: a, blocked_id: b },
        { blocker_id: b, blocked_id: a },
      ],
    });
    return count > 0;
  }
}
