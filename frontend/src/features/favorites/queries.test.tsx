import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchFavorites, addFavorite, removeFavorite } from './api';
import { useFavorites, useFavoriteIds, useAddFavorite, useRemoveFavorite, favoriteKeys } from './queries';

vi.mock('./api', () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('favorites queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('favoriteKeys.list gera chaves distintas para limites diferentes na mesma pagina', () => {
    expect(favoriteKeys.list(1, 20)).not.toEqual(favoriteKeys.list(1, 100));
  });

  it('useFavorites busca a pagina informada', async () => {
    vi.mocked(fetchFavorites).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const { result } = renderHook(() => useFavorites(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFavorites).toHaveBeenCalledWith(1);
  });

  it('useFavoriteIds retorna um Set com os ids favoritados', async () => {
    vi.mocked(fetchFavorites).mockResolvedValue({
      items: [{ id: 'f1', professionalId: 'p1', createdAt: '' }, { id: 'f2', professionalId: 'p2', createdAt: '' }],
      page: 1,
      limit: 100,
      total: 2,
    });

    const { result } = renderHook(() => useFavoriteIds(), { wrapper });

    await waitFor(() => expect(result.current.has('p1')).toBe(true));
    expect(result.current.has('p2')).toBe(true);
    expect(fetchFavorites).toHaveBeenCalledWith(1, 100);
  });

  it('useAddFavorite chama addFavorite', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addFavorite).toHaveBeenCalledWith('p1');
  });

  it('useRemoveFavorite chama removeFavorite', async () => {
    vi.mocked(removeFavorite).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeFavorite).toHaveBeenCalledWith('p1');
  });
});
