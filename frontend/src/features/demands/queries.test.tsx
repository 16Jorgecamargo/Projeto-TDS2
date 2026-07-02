import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { publishDemand } from './api';
import { usePublishDemand } from './queries';

vi.mock('./api', () => ({ publishDemand: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePublishDemand', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama publishDemand com os valores e as imagens', async () => {
    vi.mocked(publishDemand).mockResolvedValue({ id: 'd1' } as never);

    const { result } = renderHook(() => usePublishDemand(), { wrapper });
    result.current.mutate({
      values: { categoryId: 'c1', title: 'Pintar sala', description: 'Descricao com mais de vinte caracteres', budgetMin: 100, budgetMax: 200 },
      images: ['/uploads/foto1.jpg'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(publishDemand).toHaveBeenCalledWith(
      { categoryId: 'c1', title: 'Pintar sala', description: 'Descricao com mais de vinte caracteres', budgetMin: 100, budgetMax: 200 },
      ['/uploads/foto1.jpg'],
    );
  });
});
