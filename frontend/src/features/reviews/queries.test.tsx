import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchProfessionalReviews } from './api';
import { useProfessionalReviews } from './queries';

vi.mock('./api', () => ({ fetchProfessionalReviews: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
