import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { startContract } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));

describe('contracts api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inicia o contrato via POST /contracts/:id/start', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
        total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
        startedAt: '2026-07-01T00:00:00Z', completedAt: null, cancelledAt: null, schedule: null,
        clientName: 'Maria Cliente', professionalHeadline: 'Eletricista', professionalUserId: 'pu1',
        createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await startContract('c1');

    expect(http.post).toHaveBeenCalledWith('/contracts/c1/start', {});
    expect(result.startedAt).toBe('2026-07-01T00:00:00Z');
  });
});
