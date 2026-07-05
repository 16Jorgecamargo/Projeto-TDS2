import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useNotifications: vi.fn() }));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
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
});
