import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useSidebarStore.setState({ collapsed: false });
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza os itens de navegação do papel do cliente', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('link', { name: /Minhas demandas/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carteira/ })).toBeInTheDocument();
  });

  it('esconde os rótulos de texto quando colapsada', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    useSidebarStore.setState({ collapsed: true });
    renderWithProviders(<Sidebar />);
    expect(screen.queryByText('Minhas demandas')).not.toBeInTheDocument();
  });

  it('alterna o estado ao clicar no botão de colapsar', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('destaca somente o primeiro item de navegação entre os que compartilham a mesma rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />, { route: '/admin' });

    const denunciasLink = screen.getByRole('link', { name: 'Denúncias' });
    const disputasLink = screen.getByRole('link', { name: 'Disputas' });
    const usuariosLink = screen.getByRole('link', { name: 'Usuários' });

    expect(denunciasLink.classList.contains('bg-surface')).toBe(true);
    expect(denunciasLink.classList.contains('text-primary')).toBe(true);
    expect(denunciasLink).toHaveAttribute('aria-current', 'page');

    for (const link of [disputasLink, usuariosLink]) {
      expect(link.classList.contains('bg-surface')).toBe(false);
      expect(link.classList.contains('text-primary')).toBe(false);
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });
});
