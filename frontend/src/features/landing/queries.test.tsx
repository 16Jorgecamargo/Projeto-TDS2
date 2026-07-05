import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFeaturedProfessionals, useTotalProfessionalsCount } from './queries';
import { landingApi } from './api';

vi.mock('./api', () => ({ landingApi: { searchProfessionals: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFeaturedProfessionals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna os N itens com maior ratingAverage', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({
      items: [
        { id: '1', headline: 'A', bio: null, hourlyRate: 50, ratingAverage: 3.5, ratingCount: 2, isAvailable: true, categories: [] },
        { id: '2', headline: 'B', bio: null, hourlyRate: 60, ratingAverage: 4.9, ratingCount: 10, isAvailable: true, categories: [] },
        { id: '3', headline: 'C', bio: null, hourlyRate: 40, ratingAverage: 4.2, ratingCount: 5, isAvailable: false, categories: [] },
      ],
      page: 1,
      limit: 12,
      total: 3,
    });

    const { result } = renderHook(() => useFeaturedProfessionals(2), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data?.map((item) => item.id)).toEqual(['2', '3']);
  });
});

describe('useTotalProfessionalsCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o total da busca sem filtros', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({ items: [], page: 1, limit: 1, total: 128 });

    const { result } = renderHook(() => useTotalProfessionalsCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(128));
  });
});
