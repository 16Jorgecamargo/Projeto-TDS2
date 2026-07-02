import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
    useAuthStore.getState().clear();
  });

  it('renderiza o título e o botão de busca', () => {
    renderWithProviders(<Topbar />);
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Buscar ou navegar...')).toBeInTheDocument();
  });

  it('abre a command palette ao clicar na busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Topbar />);

    await user.click(screen.getByText('Buscar ou navegar...'));

    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it('não mostra o botão de dashboard sem usuário logado', () => {
    renderWithProviders(<Topbar />);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('mostra o botão de dashboard apontando pra rota do papel do usuário', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<Topbar />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/professional/dashboard');
  });
});
