import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { CommandPalette } from './CommandPalette';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';
import { useSearchProfessionals } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';

vi.mock('../../features/landing/queries', () => ({
  useSearchProfessionals: vi.fn(),
}));

vi.mock('../../features/demands/queries', () => ({
  useDemands: vi.fn(),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useSearchProfessionals).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isFetching: false,
    } as never);
    vi.mocked(useDemands).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
    } as never);
  });

  it('não renderiza o diálogo quando fechada', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista itens de navegação do papel ao abrir', () => {
    useCommandPaletteStore.setState({ open: true });
    renderWithProviders(<CommandPalette />);
    expect(screen.getByRole('button', { name: /Buscar profissional/ })).toBeInTheDocument();
  });

  it('filtra a navegação pelo texto digitado', async () => {
    useCommandPaletteStore.setState({ open: true });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.type(screen.getByPlaceholderText(/Digite para buscar/), 'carteira');

    expect(screen.getByRole('button', { name: /Carteira/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contratos/ })).not.toBeInTheDocument();
  });

  it('fecha e navega ao clicar em um item de navegação', async () => {
    useCommandPaletteStore.setState({ open: true });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(screen.getByRole('button', { name: /Carteira/ }));

    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('abre a paleta com Ctrl+K quando fechada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.keyboard('{Control>}k{/Control}');

    await waitFor(() => expect(useCommandPaletteStore.getState().open).toBe(true));
  });
});
