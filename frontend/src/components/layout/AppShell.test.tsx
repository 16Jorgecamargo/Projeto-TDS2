import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { AppShell } from './AppShell';
import { useAuthStore } from '../../stores/auth';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza o conteúdo filho dentro do main', () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo da página</p>
      </AppShell>,
    );
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
  });

  it('renderiza o Topbar', () => {
    renderWithProviders(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
  });
});
