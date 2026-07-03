import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import ContractListPage from './ContractListPage';
import { useContracts } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useContracts: vi.fn() }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function contractFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
    total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
    startedAt: null, completedAt: null, cancelledAt: null, schedule: null,
    clientName: 'Maria Cliente', professionalHeadline: 'Eletricista Residencial', professionalUserId: 'pu1',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContractListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('mostra estado vazio quando nao ha contratos', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Nenhum contrato ainda')).toBeInTheDocument();
  });

  it('cliente ve o headline do profissional em cada contrato', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [contractFixture()], isPending: false } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Eletricista Residencial')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('profissional ve o nome do cliente em cada contrato', () => {
    useAuthStore.getState().setAuth({ id: 'pu1', role: 'professional' }, 'token');
    vi.mocked(useContracts).mockReturnValue({
      data: [contractFixture({ status: 'completed', startedAt: '2026-07-01T00:00:00Z', completedAt: '2026-07-02T00:00:00Z' })],
      isPending: false,
    } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Maria Cliente')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('navega para o detalhe ao clicar no card', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [contractFixture()], isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractListPage />);
    await user.click(screen.getByText('Eletricista Residencial'));

    expect(navigateMock).toHaveBeenCalledWith('/contracts/c1');
  });
});
