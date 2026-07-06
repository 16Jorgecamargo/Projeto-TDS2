import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { startContract, fetchPayment, payContract } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));

describe('contracts api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inicia o contrato via POST /contracts/:id/start', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
        total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
        startedAt: '2026-07-01T00:00:00Z', completedAt: null, cancelledAt: null, schedule: null,
        demandTitle: 'Instalacao eletrica',
        clientName: 'Maria Cliente', professionalHeadline: 'Eletricista', professionalName: 'Joao Profissional', professionalUserId: 'pu1',
        createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await startContract('c1');

    expect(http.post).toHaveBeenCalledWith('/contracts/c1/start', {});
    expect(result.startedAt).toBe('2026-07-01T00:00:00Z');
  });
});

describe('fetchPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o pagamento quando existe', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
        status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await fetchPayment('c1');

    expect(http.get).toHaveBeenCalledWith('/contracts/c1/payment');
    expect(result?.status).toBe('captured');
  });

  it('retorna null quando o contrato ainda nao foi pago (404)', async () => {
    const AxiosErrorLike = { isAxiosError: true, response: { status: 404 } };
    vi.mocked(http.get).mockRejectedValue(AxiosErrorLike);

    const result = await fetchPayment('c1');

    expect(result).toBeNull();
  });

  it('propaga erros diferentes de 404', async () => {
    const AxiosErrorLike = { isAxiosError: true, response: { status: 500 } };
    vi.mocked(http.get).mockRejectedValue(AxiosErrorLike);

    await expect(fetchPayment('c1')).rejects.toEqual(AxiosErrorLike);
  });
});

describe('payContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('paga o contrato com o metodo informado', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
        status: 'captured', method: 'pix', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await payContract('c1', 'pix');

    expect(http.post).toHaveBeenCalledWith('/contracts/c1/payment', { method: 'pix' });
    expect(result.method).toBe('pix');
  });
});
