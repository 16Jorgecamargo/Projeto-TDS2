import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardQuickActions } from './DashboardQuickActions';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('DashboardQuickActions', () => {
  it('navega para /demands ao clicar em Buscar demandas disponíveis', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Buscar demandas disponíveis' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands');
  });

  it('navega para /professional/profile ao clicar em Editar perfil', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Editar perfil' }));

    expect(navigateMock).toHaveBeenCalledWith('/professional/profile');
  });
});
