import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { HomeRoute } from './HomeRoute';
import { useAuthStore } from '../stores/auth';

vi.mock('../features/landing/pages/LandingPage', () => ({ default: () => <div>landing-page</div> }));
vi.mock('../features/dashboard/pages/ClientDashboardPage', () => ({
  ClientDashboardPage: () => <div>client-dashboard</div>,
}));
vi.mock('../features/professional-dashboard/pages/ProfessionalDashboardPage', () => ({
  ProfessionalDashboardPage: () => <div>professional-dashboard</div>,
}));

describe('HomeRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza a LandingPage quando nao ha usuario logado', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('landing-page')).toBeInTheDocument();
  });

  it('renderiza o ClientDashboardPage para usuario com papel client', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('client-dashboard')).toBeInTheDocument();
  });

  it('renderiza o ProfessionalDashboardPage para usuario com papel professional', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('professional-dashboard')).toBeInTheDocument();
  });

  it('redireciona para /admin quando usuario tem papel admin, sem renderizar a LandingPage', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.queryByText('landing-page')).not.toBeInTheDocument();
    expect(screen.queryByText('client-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('professional-dashboard')).not.toBeInTheDocument();
  });
});
