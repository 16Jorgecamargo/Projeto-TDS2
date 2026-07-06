import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalProfileEditPage } from './ProfessionalProfileEditPage';
import { useMyProfile, useUpsertProfile } from '../queries';

vi.mock('../queries', () => ({ useMyProfile: vi.fn(), useUpsertProfile: vi.fn() }));
vi.mock('../components/ProfileForm', () => ({
  ProfileForm: () => <div>profile-form</div>,
  PROFILE_FORM_ID: 'profile-form',
}));
vi.mock('../components/ServiceAreaManager', () => ({ ServiceAreaManager: () => <div>service-area-manager</div> }));
vi.mock('../components/AvailabilityManager', () => ({
  AvailabilityManager: () => <div>availability-manager</div>,
}));
vi.mock('../components/PortfolioManager', () => ({ PortfolioManager: () => <div>portfolio-manager</div> }));

describe('ProfessionalProfileEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpsertProfile).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);
  });

  it('renderiza titulo, botao voltar, secoes de gestao e botao salvar por ultimo', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);

    renderWithProviders(<ProfessionalProfileEditPage />);

    expect(screen.getByRole('heading', { name: 'Editar perfil', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument();
    expect(screen.getByText('profile-form')).toBeInTheDocument();
    expect(screen.getByText('portfolio-manager')).toBeInTheDocument();
    expect(screen.getByText('availability-manager')).toBeInTheDocument();
    expect(screen.getByText('service-area-manager')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Salvar perfil' });
    expect(saveButton).toHaveAttribute('form', 'profile-form');

    const order = [
      screen.getByText('profile-form'),
      screen.getByText('portfolio-manager'),
      screen.getByText('availability-manager'),
      screen.getByText('service-area-manager'),
      saveButton,
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
