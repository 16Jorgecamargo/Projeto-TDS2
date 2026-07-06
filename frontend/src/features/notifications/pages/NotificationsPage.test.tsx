import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../queries';

vi.mock('../queries', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMarkAllNotificationsRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('mostra skeleton de carregamento', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Carregando notificações')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha notificacoes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Nenhuma notificação ainda')).toBeInTheDocument();
  });

  it('mostra badge de nao lida e marca como lida ao clicar', async () => {
    const mutate = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [
          {
            id: 'n1', type: 'contract', title: 'Contrato iniciado', body: null,
            channel: 'in_app', readAt: null, createdAt: '2026-07-01T12:00:00Z',
          },
        ],
        page: 1, limit: 20, total: 1,
      },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Contrato iniciado')).toBeInTheDocument();
    expect(screen.getByText('Não lida')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marcar lida' }));

    expect(mutate).toHaveBeenCalledWith('n1');
  });

  it('mostra o botao marcar todas como lida quando ha notificacao nao lida e chama a mutation ao clicar', async () => {
    const mutateAll = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [
          { id: 'n1', type: 'contract', title: 'Contrato iniciado', body: null, channel: 'in_app', readAt: null, createdAt: '2026-07-01T12:00:00Z' },
        ],
        page: 1, limit: 20, total: 1,
      },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useMarkAllNotificationsRead).mockReturnValue({ mutate: mutateAll, isPending: false } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Marcar todas como lida' }));

    expect(mutateAll).toHaveBeenCalled();
  });

  it('nao mostra o botao marcar todas como lida quando nao ha notificacao nao lida', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [
          { id: 'n1', type: 'contract', title: 'Contrato iniciado', body: null, channel: 'in_app', readAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T12:00:00Z' },
        ],
        page: 1, limit: 20, total: 1,
      },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Marcar todas como lida' })).not.toBeInTheDocument();
  });
});
