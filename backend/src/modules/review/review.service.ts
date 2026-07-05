import type { Repository } from 'typeorm';
import type { Review } from '../../infra/database/entities/review.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type { ReviewResponse } from './review.schemas.js';

export type NotificationChannel = 'in_app' | 'push' | 'email';

export type EnqueueNotification = (input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
}) => Promise<void>;

export type RecordAudit = (input: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
}) => Promise<void>;

export interface CreateReviewInput {
  contractId: string;
  authorId: string;
  rating: number;
  comment: string;
}

interface ReviewServiceDeps {
  reviews: Repository<Review>;
  contracts: Repository<Contract>;
  professionalProfiles: Repository<ProfessionalProfile>;
  enqueueNotification: EnqueueNotification;
  recordAudit: RecordAudit;
}

export class ReviewService {
  constructor(private readonly deps: ReviewServiceDeps) {}

  private toResponse(review: Review): ReviewResponse {
    return {
      id: review.id,
      contractId: review.contract_id,
      authorId: review.reviewer_id,
      authorName: review.reviewer.full_name,
      targetId: review.reviewee_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at.toISOString(),
    };
  }

  async create(input: CreateReviewInput): Promise<ReviewResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id: input.contractId } });
    if (!contract) {
      throw new NotFoundError('Contrato nao encontrado');
    }

    const professionalProfile = await this.deps.professionalProfiles.findOne({
      where: { id: contract.professional_id },
    });
    if (!professionalProfile) {
      throw new NotFoundError('Profissional nao encontrado');
    }
    const professionalUserId = professionalProfile.user_id;

    const participants = [contract.client_id, professionalUserId];
    if (!participants.includes(input.authorId)) {
      throw new ForbiddenError('Autor nao participa do contrato');
    }

    if (contract.status !== 'completed') {
      throw new ConflictError('Contrato nao concluido');
    }

    const existing = await this.deps.reviews.findOne({
      where: { contract_id: input.contractId, reviewer_id: input.authorId },
    });
    if (existing) {
      throw new ConflictError('Avaliacao ja registrada para este contrato');
    }

    const targetId = input.authorId === contract.client_id ? professionalUserId : contract.client_id;

    const entity = this.deps.reviews.create({
      contract_id: input.contractId,
      reviewer_id: input.authorId,
      reviewee_id: targetId,
      rating: input.rating,
      comment: input.comment,
      response: null,
    });

    const saved = await this.deps.reviews.save(entity);
    const savedWithReviewer = (await this.deps.reviews.findOne({
      where: { id: saved.id },
      relations: ['reviewer'],
    }))!;

    await this.deps.enqueueNotification({
      userId: targetId,
      type: 'review_received',
      title: 'Voce recebeu uma avaliacao',
      body: `Nota ${input.rating}`,
      channels: ['in_app', 'push'],
    });

    await this.deps.recordAudit({
      userId: input.authorId,
      action: 'review.created',
      entityType: 'review',
      entityId: saved.id,
    });

    businessMetrics.reviewsCreated.inc();
    return this.toResponse(savedWithReviewer);
  }

  async listForProfessional(
    profileId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ReviewResponse[]; total: number }> {
    const profile = await this.deps.professionalProfiles.findOne({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundError('Profissional nao encontrado');
    }

    const [rows, total] = await this.deps.reviews.findAndCount({
      where: { reviewee_id: profile.user_id },
      relations: ['reviewer'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((row) => this.toResponse(row)), total };
  }
}
