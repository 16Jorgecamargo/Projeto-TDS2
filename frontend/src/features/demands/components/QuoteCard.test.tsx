import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { QuoteCard } from './QuoteCard';
import { usePublicProfile, useMyProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';
import type { Quote } from '../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../professional/queries', () => ({ usePublicProfile: vi.fn(), useMyProfile: vi.fn() }));
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));

const quote: Quote = {
  id: 'q1',
  demandId: 'd1',
  professionalId: 'p1',
  message: 'Posso fazer amanhã',
  total: 250,
  status: 'pending',
  validUntil: '2026-08-01T00:00:00Z',
  createdAt: '2026-07-01T00:00:00Z',
};

const profile = {
  fullName: 'Eletricista João',
  headline: 'Eletricista',
  userId: 'user-1',
  hourlyRate: 80,
  ratingAverage: 4.5,
  ratingCount: 10,
  categories: [{ id: 'cat1', name: 'Eletrica', slug: 'eletrica' }],
};

function renderCard(overrides: Partial<Parameters<typeof QuoteCard>[0]> = {}) {
  return renderWithProviders(
    <QuoteCard
      quote={quote}
      canAccept={false}
      onAccept={vi.fn()}
      accepting={false}
      onWithdraw={vi.fn()}
      withdrawing={false}
      {...overrides}
    />,
  );
}

describe('QuoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePublicProfile).mockReturnValue({ data: profile } as never);
    vi.mocked(useMyProfile).mockReturnValue({ data: undefined } as never);
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    useAuthStore.getState().setAuth({ id: 'c1', role: 'client' }, 'token');
  });

  it('cliente ve nome, categoria, valor/hr, descricao, valor, datas e nota do profissional', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Eletricista João' })).toHaveAttribute('href', '/professionals/p1');
    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.getByText('R$ 80,00/h')).toBeInTheDocument();
    expect(screen.getByText('Posso fazer amanhã')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByText('4.5 (10)')).toBeInTheDocument();
    expect(screen.getByText(/Enviado/)).toBeInTheDocument();
    expect(screen.getByText(/Válido até/)).toBeInTheDocument();
  });

  it('mostra o botao Aceitar apenas quando canAccept e true', () => {
    const { rerender } = renderWithProviders(
      <QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} onWithdraw={vi.fn()} withdrawing={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();

    rerender(
      <QuoteCard quote={quote} canAccept onAccept={vi.fn()} accepting={false} onWithdraw={vi.fn()} withdrawing={false} />,
    );
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
  });

  it('chama onAccept ao clicar em Aceitar', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    renderCard({ canAccept: true, onAccept });

    await user.click(screen.getByRole('button', { name: 'Aceitar' }));

    expect(onAccept).toHaveBeenCalled();
  });

  it('cria sala de chat com o userId do profissional que enviou o orcamento', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (room: { id: string }) => void }) => {
      options?.onSuccess({ id: 'room-1' });
    });
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Conversar' }));

    expect(mutate).toHaveBeenCalledWith({ participantId: 'user-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith('/chat/room-1');
  });

  it('profissional vendo orcamento de outro ve somente nome, nota e datas', () => {
    useAuthStore.getState().setAuth({ id: 'u2', role: 'professional' }, 'token');
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'other-profile' } } as never);

    renderCard();

    expect(screen.getByRole('link', { name: 'Eletricista João' })).toBeInTheDocument();
    expect(screen.getByText('4.5 (10)')).toBeInTheDocument();
    expect(screen.getByText(/Enviado/)).toBeInTheDocument();
    expect(screen.getByText(/Válido até/)).toBeInTheDocument();
    expect(screen.queryByText('Posso fazer amanhã')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 250,00')).not.toBeInTheDocument();
    expect(screen.queryByText('Eletrica')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conversar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
  });

  it('profissional dono do orcamento ve todas as informacoes e o botao Remover orcamento em vez de chat/aceitar', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'p1' } } as never);

    renderCard({ canAccept: true });

    expect(screen.getByText('Posso fazer amanhã')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover orçamento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conversar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
  });

  it('chama onWithdraw ao clicar em Remover orcamento', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'p1' } } as never);
    const onWithdraw = vi.fn();
    const user = userEvent.setup();
    renderCard({ onWithdraw });

    await user.click(screen.getByRole('button', { name: 'Remover orçamento' }));

    expect(onWithdraw).toHaveBeenCalled();
  });
});
