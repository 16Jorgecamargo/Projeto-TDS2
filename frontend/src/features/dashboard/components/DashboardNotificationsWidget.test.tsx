import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardNotificationsWidget } from './DashboardNotificationsWidget';
import { useNotifications } from '../../notifications/queries';

vi.mock('../../notifications/queries', () => ({ useNotifications: vi.fn() }));

describe('DashboardNotificationsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista as notificacoes mais recentes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [{ id: 'n1', type: 'x', title: 'Novo orçamento recebido', body: null, channel: 'in_app', readAt: null, createdAt: '' }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardNotificationsWidget />);

    expect(screen.getByText('Novo orçamento recebido')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha notificacoes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardNotificationsWidget />);

    expect(screen.getByText('Nenhuma notificação ainda')).toBeInTheDocument();
  });
});
