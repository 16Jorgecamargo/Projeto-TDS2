import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatWindow } from './components/ChatWindow';

vi.mock('./queries', () => ({
  useMessages: () => ({
    data: {
      items: [
        {
          id: 'm1b2c3d4-0000-4000-8000-000000000021',
          roomId: 'r1b2c3d4-0000-4000-8000-000000000020',
          senderId: 'a1b2c3d4-0000-4000-8000-000000000001',
          content: 'Ola, tudo bem?',
          createdAt: '2026-07-01T12:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  }),
  useChatSocket: () => ({ send: vi.fn() }),
}));

vi.mock('../../stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'a1b2c3d4-0000-4000-8000-000000000001' } }),
}));

function renderWithClient(roomId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChatWindow roomId={roomId} />
    </QueryClientProvider>,
  );
}

describe('ChatWindow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza o historico da sala', () => {
    renderWithClient('r1b2c3d4-0000-4000-8000-000000000020');
    expect(screen.getByText('Ola, tudo bem?')).toBeInTheDocument();
  });

  it('permite enviar uma nova mensagem', () => {
    renderWithClient('r1b2c3d4-0000-4000-8000-000000000020');
    const input = screen.getByPlaceholderText('Mensagem');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });
});
