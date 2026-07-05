import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchProfessionalReviews, createReview } from './api';
import { useProfessionalReviews, useCreateReview } from './queries';

vi.mock('./api', () => ({
  fetchProfessionalReviews: vi.fn(),
  createReview: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProfessionalReviews', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca avaliacoes do profissional informado', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const { result } = renderHook(() => useProfessionalReviews('p1', 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProfessionalReviews).toHaveBeenCalledWith('p1', 1);
  });

  it('nao dispara a busca sem professionalId', () => {
    const { result } = renderHook(() => useProfessionalReviews(undefined, 1), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria a avaliacao com o payload informado', async () => {
    vi.mocked(createReview).mockResolvedValue({
      id: 'r1', contractId: 'c1', authorId: 'u1', authorName: 'Ana Souza', targetId: 'pu1',
      rating: 5, comment: 'Excelente', createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({ contractId: 'c1', rating: 5, comment: 'Excelente' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createReview).toHaveBeenCalledWith({ contractId: 'c1', rating: 5, comment: 'Excelente' });
  });
});
