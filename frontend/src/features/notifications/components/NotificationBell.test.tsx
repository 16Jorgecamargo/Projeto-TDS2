import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useNotifications, useMarkAllNotificationsRead } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useNotifications: vi.fn(), useMarkAllNotificationsRead: vi.fn() }));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    vi.mocked(useMarkAllNotificationsRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('nao renderiza nada quando o usuario nao esta autenticado', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);

    const { container } = render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('chama useNotifications com enabled false quando anonimo', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(useNotifications).toHaveBeenCalledWith(1, { enabled: false });
  });

  it('nao mostra contador quando nao ha notificacoes nao lidas', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: '2026-07-01T00:00:00Z' }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('mostra contador de nao lidas com token de cor accent quando autenticado', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: null }, { id: 'n2', readAt: null }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    const counter = screen.getByText('2');
    expect(counter).toBeInTheDocument();
    expect(counter.className).toContain('bg-accent');
  });

  it('mostra o botao marcar todas como lida no dropdown quando ha nao lidas e chama a mutation ao clicar', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: null, title: 'Nova mensagem', body: null }] },
      isLoading: false,
    } as never);
    const mutate = vi.fn();
    vi.mocked(useMarkAllNotificationsRead).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lida' }));

    expect(mutate).toHaveBeenCalled();
  });

  it('nao mostra o botao marcar todas como lida no dropdown quando nao ha nao lidas', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: '2026-07-01T00:00:00Z', title: 'Lida', body: null }] },
      isLoading: false,
    } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(screen.queryByRole('button', { name: 'Marcar todas como lida' })).not.toBeInTheDocument();
  });
});
