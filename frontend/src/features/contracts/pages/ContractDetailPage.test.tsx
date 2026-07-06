import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import ContractDetailPage from './ContractDetailPage';
import {
  useContract,
  useContractProgress,
  useAddProgress,
  useStartContract,
  useCompleteContract,
  usePayment,
} from '../queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'c1' }), useNavigate: () => navigateMock };
});
vi.mock('../queries', () => ({
  useContract: vi.fn(),
  useContractProgress: vi.fn(),
  useAddProgress: vi.fn(),
  useStartContract: vi.fn(),
  useCompleteContract: vi.fn(),
  usePayment: vi.fn(),
}));
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));
vi.mock('../components/ContractProgress', () => ({ ContractProgress: () => <div>contract-progress</div> }));
vi.mock('../components/ProgressUpdateForm', () => ({ ProgressUpdateForm: () => <div>progress-update-form</div> }));
vi.mock('../components/DisputeDialog', () => ({ DisputeDialog: () => <div>dispute-dialog</div> }));
vi.mock('../components/PaymentDialog', () => ({
  PaymentDialog: ({ total }: { total: number }) => <div>payment-dialog-{total}</div>,
}));
vi.mock('../../reviews/components/ReviewForm', () => ({
  ReviewForm: ({ onDone }: { onDone: () => void }) => (
    <button type="button" onClick={onDone}>
      review-form-done
    </button>
  ),
}));

const navigateMock = vi.fn();

function contractFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'client-user-1', professionalId: 'profile-1',
    total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
    startedAt: null, completedAt: null, cancelledAt: null, schedule: null,
    clientName: 'Maria Cliente', professionalHeadline: 'Eletricista Residencial', professionalUserId: 'pro-user-1',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContractDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    vi.mocked(useContractProgress).mockReturnValue({ data: [] } as never);
    vi.mocked(useAddProgress).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useStartContract).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCompleteContract).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(usePayment).mockReturnValue({ data: null } as never);
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('profissional dono do contrato ativo e nao iniciado ve botao de iniciar', () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Iniciar contrato' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir contrato' })).not.toBeInTheDocument();
  });

  it('clica em iniciar contrato chama a mutation', async () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const mutate = vi.fn();
    vi.mocked(useStartContract).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Iniciar contrato' }));

    expect(mutate).toHaveBeenCalled();
  });

  it('profissional dono do contrato ativo e ja iniciado ve formulario de progresso e botao de concluir', () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({
      data: contractFixture({ startedAt: '2026-07-01T00:00:00Z' }),
      isPending: false,
    } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Concluir contrato' })).toBeInTheDocument();
    expect(screen.getByText('progress-update-form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar contrato' })).not.toBeInTheDocument();
  });

  it('cliente ve botao de pagar quando ainda nao ha pagamento capturado', () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
  });

  it('cliente nao ve botao de pagar quando ja existe pagamento capturado', () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    vi.mocked(usePayment).mockReturnValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'client-user-1', amount: 300,
        status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.queryByRole('button', { name: 'Pagar' })).not.toBeInTheDocument();
  });

  it('abre o dialogo de pagamento com o valor do contrato', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Pagar' }));

    expect(screen.getByText('payment-dialog-300')).toBeInTheDocument();
  });

  it('mostra formulario de avaliacao quando o contrato esta concluido, e some apos avaliar', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({
      data: contractFixture({
        status: 'completed',
        startedAt: '2026-07-01T00:00:00Z',
        completedAt: '2026-07-02T00:00:00Z',
      }),
      isPending: false,
    } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByText('review-form-done')).toBeInTheDocument();
    await user.click(screen.getByText('review-form-done'));
    expect(screen.queryByText('review-form-done')).not.toBeInTheDocument();
  });

  it('profissional nao ve formulario de avaliacao mesmo com contrato concluido', () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({
      data: contractFixture({
        status: 'completed',
        startedAt: '2026-07-01T00:00:00Z',
        completedAt: '2026-07-02T00:00:00Z',
      }),
      isPending: false,
    } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.queryByText('review-form-done')).not.toBeInTheDocument();
  });

  it('cliente conversa com o profissional do contrato via chat', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const mutate = vi.fn();
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Chat' }));

    expect(mutate).toHaveBeenCalledWith(
      { participantId: 'pro-user-1', contractId: 'c1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
