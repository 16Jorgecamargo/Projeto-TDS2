import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { QuoteCard } from './QuoteCard';
import { usePublicProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import type { Quote } from '../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../professional/queries', () => ({ usePublicProfile: vi.fn() }));
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));

const quote: Quote = {
  id: 'q1',
  demandId: 'd1',
  professionalId: 'p1',
  message: 'Posso fazer amanhã',
  total: 250,
  status: 'pending',
  validUntil: null,
  items: [
    { description: 'Mão de obra', quantity: 1, unitPrice: 150, subtotal: 150 },
    { description: 'Material', quantity: 1, unitPrice: 100, subtotal: 100 },
  ],
  createdAt: '',
};

describe('QuoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePublicProfile).mockReturnValue({ data: { headline: 'Eletricista João', userId: 'user-1' } } as never);
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza o profissional, itens e total', () => {
    renderWithProviders(<QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />);

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('Mão de obra')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
  });

  it('mostra o botao Aceitar apenas quando canAccept e true', () => {
    const { rerender } = renderWithProviders(
      <QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();

    rerender(<QuoteCard quote={quote} canAccept onAccept={vi.fn()} accepting={false} />);
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
  });

  it('chama onAccept ao clicar em Aceitar', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<QuoteCard quote={quote} canAccept onAccept={onAccept} accepting={false} />);

    await user.click(screen.getByRole('button', { name: 'Aceitar' }));

    expect(onAccept).toHaveBeenCalled();
  });

  it('cria sala de chat com o userId do profissional que enviou o orcamento', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (room: { id: string }) => void }) => {
      options?.onSuccess({ id: 'room-1' });
    });
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderWithProviders(<QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />);

    await user.click(screen.getByRole('button', { name: 'Conversar' }));

    expect(mutate).toHaveBeenCalledWith({ participantId: 'user-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith('/chat/room-1');
  });
});
