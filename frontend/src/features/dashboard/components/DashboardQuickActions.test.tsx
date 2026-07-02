import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import { DashboardQuickActions } from './DashboardQuickActions';

describe('DashboardQuickActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navega para /demands/new ao clicar em Publicar demanda', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands/new');
  });

  it('navega para /search ao clicar em Buscar profissional', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Buscar profissional' }));

    expect(navigateMock).toHaveBeenCalledWith('/search');
  });

  it('navega para /contracts ao clicar em Ver contratos', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Ver contratos' }));

    expect(navigateMock).toHaveBeenCalledWith('/contracts');
  });
});
