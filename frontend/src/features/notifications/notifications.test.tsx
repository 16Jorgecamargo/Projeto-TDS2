import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from './pages/NotificationsPage';

vi.mock('./queries', () => ({
  useNotifications: () => ({
    data: {
      items: [
        {
          id: 'n1b2c3d4-0000-4000-8000-000000000010',
          type: 'review_received',
          title: 'Você recebeu uma avaliação',
          body: 'Nota 5',
          channel: 'in_app',
          readAt: null,
          createdAt: '2026-07-01T12:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  }),
  useMarkNotificationRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderPage() {
  const client = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <NotificationsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza notificações carregadas', () => {
    renderPage();
    expect(screen.getByText('Você recebeu uma avaliação')).toBeInTheDocument();
    expect(screen.getByText('Nota 5')).toBeInTheDocument();
  });

  it('mostra botao de marcar lida para notificacoes nao lidas', () => {
    renderPage();
    expect(screen.getByText('Marcar lida')).toBeInTheDocument();
  });
});
