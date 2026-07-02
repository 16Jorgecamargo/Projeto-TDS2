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

  it('renderiza os 4 itens primários nas abas inferiores do cliente', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav />);

    expect(screen.getByRole('link', { name: 'Minhas demandas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contratos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Carteira' })).not.toBeInTheDocument();
  });

  it('destaca somente o primeiro item nas abas inferiores entre os que compartilham a mesma rota', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<MobileNav />, { route: '/admin' });

    const denunciasLink = screen.getByRole('link', { name: 'Denúncias' });
    const disputasLink = screen.getByRole('link', { name: 'Disputas' });
    const usuariosLink = screen.getByRole('link', { name: 'Usuários' });

    expect(denunciasLink.classList.contains('text-primary')).toBe(true);
    expect(denunciasLink).toHaveAttribute('aria-current', 'page');

    for (const link of [disputasLink, usuariosLink]) {
      expect(link.classList.contains('text-primary')).toBe(false);
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });
});
