import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { startContract } from './api';
import { useStartContract } from './queries';

vi.mock('./api', () => ({
  fetchContracts: vi.fn(),
  fetchContract: vi.fn(),
  fetchProgress: vi.fn(),
  addProgress: vi.fn(),
  startContract: vi.fn(),
  completeContract: vi.fn(),
  openDispute: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStartContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama startContract com o id do contrato', async () => {
    vi.mocked(startContract).mockResolvedValue({
      id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
      total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
      startedAt: '2026-07-01T00:00:00Z', completedAt: null, cancelledAt: null, schedule: null,
      clientName: 'Maria Cliente', professionalHeadline: 'Eletricista', professionalUserId: 'pu1',
      createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => useStartContract('c1'), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(startContract).toHaveBeenCalledWith('c1');
  });
});
