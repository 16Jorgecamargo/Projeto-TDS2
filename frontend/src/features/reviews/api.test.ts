import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { fetchProfessionalReviews } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn() } }));

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
