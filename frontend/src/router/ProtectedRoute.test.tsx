import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../stores/auth';

function renderAt(initial: string, roles?: ('client' | 'professional' | 'admin')[]) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/forbidden" element={<div>forbidden page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().finishBootstrapping();
  });

  it('redirects anonymous users to login', () => {
    renderAt('/dashboard');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects wrong-role users to forbidden', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderAt('/dashboard', ['admin']);
    expect(screen.getByText('forbidden page')).toBeInTheDocument();
  });

  it('renders the child route for an allowed user', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 't');
    renderAt('/dashboard', ['admin']);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
