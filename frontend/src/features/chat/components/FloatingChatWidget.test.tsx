import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingChatWidget } from './FloatingChatWidget';
import { useRooms } from '../queries';
import { useMessages, useChatSocket } from '../queries';

vi.mock('../queries', () => ({ useRooms: vi.fn(), useMessages: vi.fn(), useChatSocket: vi.fn() }));

describe('FloatingChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMessages).mockReturnValue({ data: { items: [], page: 1, limit: 20, total: 0 }, isLoading: false } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send: vi.fn() });
  });

  it('inicia minimizado como botao flutuante', () => {
    vi.mocked(useRooms).mockReturnValue({ data: [], isLoading: false } as never);
    render(<FloatingChatWidget />);

    expect(screen.getByRole('button', { name: 'Abrir chat' })).toBeInTheDocument();
    expect(screen.queryByText('Chat')).not.toBeInTheDocument();
  });

  it('expande ao clicar e lista as conversas', async () => {
    vi.mocked(useRooms).mockReturnValue({
      data: [{ id: 'room-1', contractId: null, otherUserId: 'u2', otherUserName: 'Ana Souza', lastMessageAt: null }],
      isLoading: false,
    } as never);
    const user = userEvent.setup();

    render(<FloatingChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Abrir chat' }));

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('abre uma conversa e minimiza de volta pro botao flutuante', async () => {
    vi.mocked(useRooms).mockReturnValue({
      data: [{ id: 'room-1', contractId: null, otherUserId: 'u2', otherUserName: 'Ana Souza', lastMessageAt: null }],
      isLoading: false,
    } as never);
    const user = userEvent.setup();

    render(<FloatingChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Abrir chat' }));
    await user.click(screen.getByText('Ana Souza'));

    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Voltar para conversas' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Minimizar chat' }));

    expect(screen.getByRole('button', { name: 'Abrir chat' })).toBeInTheDocument();
  });
});
