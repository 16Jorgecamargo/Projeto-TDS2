import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ProfileMenu } from './ProfileMenu';
import { useAuthStore } from '../../stores/auth';

describe('ProfileMenu', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('não renderiza nada quando não há usuário logado', () => {
    renderWithProviders(<ProfileMenu />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra o nome e o papel do usuário ao abrir o menu', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client', name: 'Maria Souza' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<ProfileMenu />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });

  it('limpa a sessão ao clicar em Sair', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional', name: 'João' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<ProfileMenu />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /sair/i }));

    expect(useAuthStore.getState().user).toBeNull();
  });
});
