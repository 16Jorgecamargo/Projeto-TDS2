import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';
import { useCommandPaletteStore } from '../../stores/commandPalette';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it('renderiza o título e o botão de busca', () => {
    renderWithProviders(<Topbar onOpenMobileNav={vi.fn()} />);
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Buscar ou navegar...')).toBeInTheDocument();
  });

  it('abre a command palette ao clicar na busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Topbar onOpenMobileNav={vi.fn()} />);

    await user.click(screen.getByText('Buscar ou navegar...'));

    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it('chama onOpenMobileNav ao clicar no botão de menu', async () => {
    const onOpenMobileNav = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Topbar onOpenMobileNav={onOpenMobileNav} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    expect(onOpenMobileNav).toHaveBeenCalledTimes(1);
  });
});
