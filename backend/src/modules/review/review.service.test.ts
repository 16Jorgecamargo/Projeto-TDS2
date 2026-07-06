import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { ReviewService } from './review.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { Review } from '../../infra/database/entities/review.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';

function contractFixture(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    client_id: 'client-1',
    professional_id: 'profile-1',
    status: 'completed',
    ...overrides,
  } as Contract;
}

function professionalProfileFixture(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'profile-1',
    user_id: 'pro-1',
    ...overrides,
  } as ProfessionalProfile;
}

describe('ReviewService', () => {
  let reviews: ReturnType<typeof mockRepo<Review>>;
  let contracts: ReturnType<typeof mockRepo<Contract>>;
  let professionalProfiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let enqueueNotification: ReturnType<typeof vi.fn>;
  let recordAudit: ReturnType<typeof vi.fn>;
  let service: ReviewService;

  beforeEach(() => {
    reviews = mockRepo<Review>();
    contracts = mockRepo<Contract>();
    professionalProfiles = mockRepo<ProfessionalProfile>();
    contracts.findOne.mockResolvedValue(contractFixture());
    professionalProfiles.findOne.mockResolvedValue(professionalProfileFixture());
    enqueueNotification = vi.fn().mockResolvedValue(undefined);
    recordAudit = vi.fn().mockResolvedValue(undefined);
    service = new ReviewService({
      reviews: reviews as unknown as Repository<Review>,
      contracts: contracts as unknown as Repository<Contract>,
      professionalProfiles: professionalProfiles as unknown as Repository<ProfessionalProfile>,
      enqueueNotification,
      recordAudit,
    });
  });

  describe('create', () => {
    it('cria avaliacao do cliente para o profissional e notifica o alvo', async () => {
      reviews.save.mockImplementationOnce(async (value: Review) => ({
        ...value,
        id: 'r-1',
        created_at: new Date('2026-07-01T12:00:00Z'),
      }));
      reviews.findOne.mockResolvedValueOnce(null);
      reviews.findOne.mockResolvedValueOnce({
        id: 'r-1',
        contract_id: 'c-1',
        reviewer_id: 'client-1',
        reviewee_id: 'pro-1',
        reviewer: { full_name: 'Ana Souza' },
        contract: { demand: { title: 'Instalacao eletrica' } },
        rating: 5,
        comment: 'Otimo',
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as Review);

      const result = await service.create({
        contractId: 'c-1',
        authorId: 'client-1',
        rating: 5,
        comment: 'Otimo',
      });

      expect(result.targetId).toBe('pro-1');
      expect(result.rating).toBe(5);
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'pro-1', type: 'review_received' }),
      );
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'review.created', userId: 'client-1' }),
      );
    });

    it('rejeita avaliacao de quem nao participa do contrato', async () => {
      await expect(
        service.create({ contractId: 'c-1', authorId: 'intruso', rating: 4, comment: 'x'.repeat(5) }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejeita avaliacao de contrato nao concluido', async () => {
      contracts.findOne.mockResolvedValueOnce(contractFixture({ status: 'active' }));

      await expect(
        service.create({ contractId: 'c-1', authorId: 'client-1', rating: 4, comment: 'x'.repeat(5) }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('rejeita avaliacao duplicada do mesmo autor no mesmo contrato', async () => {
      reviews.findOne.mockResolvedValueOnce({ id: 'existing' } as Review);

      await expect(
        service.create({ contractId: 'c-1', authorId: 'client-1', rating: 4, comment: 'x'.repeat(5) }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('lanca NotFound se o contrato nao existe', async () => {
      contracts.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create({ contractId: 'nope', authorId: 'client-1', rating: 4, comment: 'x'.repeat(5) }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('listForProfessional', () => {
    it('lista avaliacoes paginadas do profissional', async () => {
      reviews.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'r-1',
            contract_id: 'c-1',
            reviewer_id: 'client-1',
            reviewee_id: 'pro-1',
            reviewer: { full_name: 'Ana Souza' },
        contract: { demand: { title: 'Instalacao eletrica' } },
            rating: 5,
            comment: 'Otimo',
            response: null,
            created_at: new Date('2026-07-01T12:00:00Z'),
            updated_at: new Date('2026-07-01T12:00:00Z'),
          } as Review,
        ],
        1,
      ]);

      const result = await service.listForProfessional('profile-1', 1, 20);

      expect(reviews.findAndCount).toHaveBeenCalledWith({
        where: { reviewee_id: 'pro-1' },
        relations: ['reviewer', 'contract', 'contract.demand'],
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]?.targetId).toBe('pro-1');
    });
  });
});
