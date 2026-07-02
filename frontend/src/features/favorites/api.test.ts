import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { fetchFavorites, addFavorite, removeFavorite } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe('favorites api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca favoritos paginados', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: { items: [{ id: 'f1', professionalId: 'p1', createdAt: '2026-07-01T00:00:00.000Z' }], page: 1, limit: 20, total: 1 },
    } as never);

    const result = await fetchFavorites();

    expect(http.get).toHaveBeenCalledWith('/favorites', { params: { page: 1, limit: 20 } });
    expect(result.items).toHaveLength(1);
  });

  it('adiciona um favorito', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: { id: 'f1', professionalId: 'p1', createdAt: '2026-07-01T00:00:00.000Z' },
    } as never);

    const result = await addFavorite('p1');

    expect(http.post).toHaveBeenCalledWith('/favorites', { professionalId: 'p1' });
    expect(result.professionalId).toBe('p1');
  });

  it('remove um favorito pelo id do profissional', async () => {
    vi.mocked(http.delete).mockResolvedValue({} as never);

    await removeFavorite('p1');

    expect(http.delete).toHaveBeenCalledWith('/favorites/p1');
  });
});
