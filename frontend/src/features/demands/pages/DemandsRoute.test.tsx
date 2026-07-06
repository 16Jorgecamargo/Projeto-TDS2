import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DemandsRoute } from './DemandsRoute';
import { useAuthStore } from '../../../stores/auth';

vi.mock('./DemandListPage', () => ({ default: () => <div>demand-list-page</div> }));
vi.mock('./DemandSearchPage', () => ({ default: () => <div>demand-search-page</div> }));

describe('DemandsRoute', () => {
  it('renderiza DemandSearchPage para profissional', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<DemandsRoute />);
    expect(screen.getByText('demand-search-page')).toBeInTheDocument();
  });

  it('renderiza DemandListPage para cliente', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<DemandsRoute />);
    expect(screen.getByText('demand-list-page')).toBeInTheDocument();
  });
});
