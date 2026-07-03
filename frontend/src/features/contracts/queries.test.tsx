import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { startContract, fetchPayment, payContract } from './api';
import { useStartContract, usePayment, usePayContract } from './queries';

vi.mock('./api', () => ({
  fetchContracts: vi.fn(),
  fetchContract: vi.fn(),
  fetchProgress: vi.fn(),
  addProgress: vi.fn(),
  startContract: vi.fn(),
  completeContract: vi.fn(),
  openDispute: vi.fn(),
  fetchPayment: vi.fn(),
  payContract: vi.fn(),
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

describe('usePayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca o pagamento do contrato informado', async () => {
    vi.mocked(fetchPayment).mockResolvedValue(null);

    const { result } = renderHook(() => usePayment('c1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPayment).toHaveBeenCalledWith('c1');
    expect(result.current.data).toBeNull();
  });
});

describe('usePayContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('paga o contrato com o metodo informado', async () => {
    vi.mocked(payContract).mockResolvedValue({
      id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
      status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePayContract('c1'), { wrapper });
    result.current.mutate('wallet');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payContract).toHaveBeenCalledWith('c1', 'wallet');
  });
});
