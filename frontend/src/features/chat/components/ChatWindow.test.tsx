import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWindow } from './ChatWindow';
import { useMessages, useChatSocket } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useMessages: vi.fn(), useChatSocket: vi.fn() }));

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
  });

  it('mostra skeleton de carregamento', () => {
    vi.mocked(useMessages).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send: vi.fn() });

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByLabelText('Carregando conversa')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha mensagens', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
    } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send: vi.fn() });

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument();
  });

  it('renderiza mensagens e envia nova mensagem pelo socket', async () => {
    const send = vi.fn();
    vi.mocked(useMessages).mockReturnValue({
      data: {
        items: [
          { id: 'm1', roomId: 'r1', senderId: 'u1', content: 'Oi', createdAt: '2026-07-01T12:00:00Z' },
          { id: 'm2', roomId: 'r1', senderId: 'u2', content: 'Ola', createdAt: '2026-07-01T12:01:00Z' },
        ],
        page: 1,
        limit: 20,
        total: 2,
      },
      isLoading: false,
    } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send });
    const user = userEvent.setup();

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByText('Oi')).toBeInTheDocument();
    expect(screen.getByText('Ola')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Mensagem'), 'Nova mensagem');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(send).toHaveBeenCalledWith('Nova mensagem');
  });
});
