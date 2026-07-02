import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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
});
