import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalProfileEditPage } from './ProfessionalProfileEditPage';
import { useMyProfile } from '../queries';

vi.mock('../queries', () => ({ useMyProfile: vi.fn() }));
vi.mock('../components/ProfileForm', () => ({ ProfileForm: () => <div>profile-form</div> }));
vi.mock('../components/ServiceAreaManager', () => ({ ServiceAreaManager: () => <div>service-area-manager</div> }));
vi.mock('../components/AvailabilityManager', () => ({
  AvailabilityManager: () => <div>availability-manager</div>,
}));
vi.mock('../components/PortfolioManager', () => ({ PortfolioManager: () => <div>portfolio-manager</div> }));
vi.mock('../components/PortfolioGallery', () => ({ PortfolioGallery: () => <div>portfolio-gallery</div> }));
vi.mock('../components/AvailabilityGrid', () => ({ AvailabilityGrid: () => <div>availability-grid</div> }));

describe('ProfessionalProfileEditPage', () => {
  it('renderiza o titulo e todas as secoes de gestao com preview read-only', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);

    renderWithProviders(<ProfessionalProfileEditPage />);

    expect(screen.getByRole('heading', { name: 'Editar perfil', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('profile-form')).toBeInTheDocument();
    expect(screen.getByText('portfolio-gallery')).toBeInTheDocument();
    expect(screen.getByText('portfolio-manager')).toBeInTheDocument();
    expect(screen.getByText('availability-grid')).toBeInTheDocument();
    expect(screen.getByText('availability-manager')).toBeInTheDocument();
    expect(screen.getByText('service-area-manager')).toBeInTheDocument();
  });
});
