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

  it('não renderiza nada para o cliente (navbar removido)', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const { container } = renderWithProviders(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada para o profissional (navbar removido)', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    const { container } = renderWithProviders(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('esconde os rótulos de texto quando colapsada', () => {
    restoreMatchMedia();
    restoreMatchMedia = mockNarrowViewport(true);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(screen.queryByText('Denúncias')).not.toBeInTheDocument();
  });

  it('colapsa automaticamente quando a tela e estreita (menos de 1024px)', () => {
    restoreMatchMedia();
    restoreMatchMedia = mockNarrowViewport(true);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(useSidebarStore.getState().collapsed).toBe(true);
    expect(screen.queryByText('Denúncias')).not.toBeInTheDocument();
  });

  it('mostra todos os itens de navegacao do admin, nao so os 2 primeiros', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Denúncias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Disputas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuários' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Financeiro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contratos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagamentos/Carteira' })).toBeInTheDocument();
  });

  it('alterna o estado ao clicar no botão de colapsar', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('nao ha item de nav compartilhando a rota do dashboard, cada item tem rota propria', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<Sidebar />, { route: '/admin' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    const reportsLink = screen.getByRole('link', { name: 'Denúncias' });
    expect(reportsLink).not.toHaveAttribute('aria-current', 'page');
  });
});
