import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '../../stores/auth';

describe('MobileNav', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(<MobileNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza as abas do cliente na ordem dashboard, demanda, contratos, chat', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav />);

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const tabs = Array.from(nav.querySelectorAll('a, button'));
    const names = tabs.map((tab) => tab.getAttribute('aria-label'));

    expect(names).toEqual(['Dashboard', 'Minhas demandas', 'Contratos', 'Chat']);
  });

  it('não renderiza aba de chat pro admin, que não tem essa rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin' });

    expect(screen.queryByRole('link', { name: 'Chat' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('destaca a aba Dashboard quando na rota compartilhada com outra aba', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const denunciasLink = screen.getByRole('link', { name: 'Denúncias' });

    expect(dashboardLink.classList.contains('text-primary')).toBe(true);
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(denunciasLink.classList.contains('text-primary')).toBe(false);
    expect(denunciasLink).not.toHaveAttribute('aria-current', 'page');
  });
});
