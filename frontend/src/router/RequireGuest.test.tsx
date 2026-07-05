import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireGuest } from './RequireGuest';
import { useAuthStore } from '../stores/auth';

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<div>login form</div>} />
        </Route>
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireGuest', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().finishBootstrapping();
  });

  it('renderiza a rota filha para usuario anonimo', () => {
    renderAt('/login');
    expect(screen.getByText('login form')).toBeInTheDocument();
  });

  it('redireciona para / quando ja autenticado', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderAt('/login');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('nao renderiza nada durante o bootstrap', () => {
    useAuthStore.setState({ isBootstrapping: true });
    const { container } = renderAt('/login');
    expect(container).toBeEmptyDOMElement();
  });
});
