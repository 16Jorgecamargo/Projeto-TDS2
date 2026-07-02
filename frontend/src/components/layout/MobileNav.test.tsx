import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '../../stores/auth';

describe('MobileNav', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(
      <MobileNav open={false} onClose={vi.fn()} onOpenMore={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza os 4 itens primários nas abas inferiores', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav open={false} onClose={vi.fn()} onOpenMore={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contratos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mais/ })).toBeInTheDocument();
  });

  it('chama onOpenMore ao clicar em Mais', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const onOpenMore = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<MobileNav open={false} onClose={vi.fn()} onOpenMore={onOpenMore} />);

    await user.click(screen.getByRole('button', { name: /Mais/ }));

    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('mostra o drawer com todos os itens quando open=true', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav open onClose={vi.fn()} onOpenMore={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getAllByText('Carteira').length).toBeGreaterThan(0);
  });

  it('destaca somente o primeiro item nas abas inferiores entre os que compartilham a mesma rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav open={false} onClose={vi.fn()} onOpenMore={vi.fn()} />, {
      route: '/admin',
    });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const denunciasLink = screen.getByRole('link', { name: 'Denúncias' });
    const disputasLink = screen.getByRole('link', { name: 'Disputas' });
    const usuariosLink = screen.getByRole('link', { name: 'Usuários' });

    expect(dashboardLink.classList.contains('text-primary')).toBe(true);
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    for (const link of [denunciasLink, disputasLink, usuariosLink]) {
      expect(link.classList.contains('text-primary')).toBe(false);
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('destaca somente o primeiro item no drawer entre os que compartilham a mesma rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav open onClose={vi.fn()} onOpenMore={vi.fn()} />, {
      route: '/admin',
    });

    const drawerNav = within(screen.getByRole('navigation', { name: 'Menu completo' }));
    const dashboardLink = drawerNav.getByRole('link', { name: 'Dashboard' });
    const denunciasLink = drawerNav.getByRole('link', { name: 'Denúncias' });
    const disputasLink = drawerNav.getByRole('link', { name: 'Disputas' });
    const usuariosLink = drawerNav.getByRole('link', { name: 'Usuários' });

    expect(dashboardLink.classList.contains('bg-surface')).toBe(true);
    expect(dashboardLink.classList.contains('text-primary')).toBe(true);
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    for (const link of [denunciasLink, disputasLink, usuariosLink]) {
      expect(link.classList.contains('bg-surface')).toBe(false);
      expect(link.classList.contains('text-primary')).toBe(false);
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });
});
