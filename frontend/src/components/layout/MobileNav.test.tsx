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

  it('não renderiza nada para o cliente (navbar removido)', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const { container } = renderWithProviders(<MobileNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza as abas do profissional na ordem dashboard, demandas, contratos, chat', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<MobileNav />);

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const tabs = Array.from(nav.querySelectorAll('a, button'));
    const names = tabs.map((tab) => tab.getAttribute('aria-label'));

    expect(names).toEqual(['Dashboard', 'Demandas disponíveis', 'Meus contratos', 'Chat']);
  });

  it('não renderiza aba de chat pro admin, que não tem essa rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin' });

    expect(screen.queryByRole('link', { name: 'Chat' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('destaca a aba Dashboard quando na rota do admin, sem nenhuma aba compartilhando essa rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const reportsLink = screen.getByRole('link', { name: 'Denúncias' });

    expect(dashboardLink.classList.contains('text-primary')).toBe(true);
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(reportsLink.classList.contains('text-primary')).toBe(false);
    expect(reportsLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('Dashboard nao fica ativo em subrotas do admin como /admin/reports', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin/reports' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const reportsLink = screen.getByRole('link', { name: 'Denúncias' });

    expect(dashboardLink.classList.contains('text-primary')).toBe(false);
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
    expect(reportsLink.classList.contains('text-primary')).toBe(true);
    expect(reportsLink).toHaveAttribute('aria-current', 'page');
  });
});
