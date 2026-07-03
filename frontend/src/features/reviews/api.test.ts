import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { fetchProfessionalReviews } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));

describe('reviews api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca avaliacoes paginadas de um profissional', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        items: [
          { id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'p1', rating: 5, comment: 'Otimo!', createdAt: '2026-07-01T00:00:00.000Z' },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
    } as never);

    const result = await fetchProfessionalReviews('p1');

    expect(http.get).toHaveBeenCalledWith('/professionals/p1/reviews', { params: { page: 1, limit: 20 } });
    expect(result.items[0].rating).toBe(5);
  });
});

describe('createReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria avaliacao via POST /reviews', async () => {
    const { createReview } = await import('./api');
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'pu1',
        rating: 5, comment: 'Excelente', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await createReview({ contractId: 'c1', rating: 5, comment: 'Excelente' });

    expect(http.post).toHaveBeenCalledWith('/reviews', { contractId: 'c1', rating: 5, comment: 'Excelente' });
    expect(result.rating).toBe(5);
  });
});
