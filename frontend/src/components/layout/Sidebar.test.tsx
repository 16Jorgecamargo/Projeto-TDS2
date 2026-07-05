import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';

function mockNarrowViewport(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  return () => {
    window.matchMedia = original;
  };
}

describe('Sidebar', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    useAuthStore.getState().clear();
    useSidebarStore.setState({ collapsed: false });
    restoreMatchMedia = mockNarrowViewport(false);
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza dashboard, chat, demandas e contratos pro cliente', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chat/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Minhas demandas/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contratos/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Carteira/ })).not.toBeInTheDocument();
  });

  it('esconde os rótulos de texto quando colapsada', () => {
    restoreMatchMedia();
    restoreMatchMedia = mockNarrowViewport(true);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(screen.queryByText('Minhas demandas')).not.toBeInTheDocument();
  });

  it('colapsa automaticamente quando a tela e estreita (menos de 1024px)', () => {
    restoreMatchMedia();
    restoreMatchMedia = mockNarrowViewport(true);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(useSidebarStore.getState().collapsed).toBe(true);
    expect(screen.queryByText('Minhas demandas')).not.toBeInTheDocument();
  });

  it('alterna o estado ao clicar no botão de colapsar', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('destaca somente o dashboard entre os itens que compartilham a mesma rota do admin', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />, { route: '/admin' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const denunciasLink = screen.getByRole('link', { name: 'Denúncias' });
    const disputasLink = screen.getByRole('link', { name: 'Disputas' });

    expect(dashboardLink.classList.contains('bg-surface')).toBe(true);
    expect(dashboardLink.classList.contains('text-primary')).toBe(true);
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    for (const link of [denunciasLink, disputasLink]) {
      expect(link.classList.contains('bg-surface')).toBe(false);
      expect(link.classList.contains('text-primary')).toBe(false);
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });
});
