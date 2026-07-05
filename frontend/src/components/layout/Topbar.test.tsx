import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../stores/auth';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza o título e o logo como link para /', () => {
    renderWithProviders(<Topbar />);
    const logo = screen.getByRole('link', { name: 'Services Marketplace' });
    expect(logo).toHaveAttribute('href', '/');
  });

  it('visitante anonimo na Landing ve Como funciona, Entrar e Registrar', () => {
    renderWithProviders(<Topbar />, { route: '/' });
    expect(screen.getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '#como-funciona');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Registrar' })).toHaveAttribute('href', '/register');
  });

  it('Como funciona fica escondido no mobile mas presente no DOM para telas maiores', () => {
    renderWithProviders(<Topbar />, { route: '/' });
    const link = screen.getByRole('link', { name: 'Como funciona' });
    expect(link.className).toContain('hidden');
    expect(link.className).toContain('sm:inline-flex');
  });

  it('visitante anonimo fora da Landing nao ve o link Como funciona', () => {
    renderWithProviders(<Topbar />, { route: '/search' });
    expect(screen.queryByRole('link', { name: 'Como funciona' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('visitante anonimo na Landing comeca com fundo transparente', () => {
    renderWithProviders(<Topbar />, { route: '/' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-transparent');
    expect(header.className).not.toContain('border-b');
  });

  it('fundo e sempre solido fora da Landing mesmo anonimo', () => {
    renderWithProviders(<Topbar />, { route: '/search' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-bg');
    expect(header.className).toContain('border-b');
  });

  it('usuario autenticado nao ve Entrar/Anunciar e ve o sino de notificacoes', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderWithProviders(<Topbar />, { route: '/' });
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('fundo e sempre solido para usuario autenticado mesmo na Landing', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderWithProviders(<Topbar />, { route: '/' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-bg');
    expect(header.className).toContain('border-b');
  });
});
