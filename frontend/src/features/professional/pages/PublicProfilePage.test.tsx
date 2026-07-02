import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import PublicProfilePage from './PublicProfilePage';
import { usePublicProfile } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'prof-1' }) };
});
vi.mock('../queries', () => ({ usePublicProfile: vi.fn(), usePortfolio: vi.fn(), useSlots: vi.fn() }));
vi.mock('../../favorites/queries', () => ({ useFavoriteIds: vi.fn() }));
vi.mock('../components/ProfessionalProfileHeader', () => ({
  ProfessionalProfileHeader: () => <div>profile-header</div>,
}));
vi.mock('../components/PortfolioGallery', () => ({ PortfolioGallery: () => <div>portfolio-gallery</div> }));
vi.mock('../components/AvailabilityGrid', () => ({ AvailabilityGrid: () => <div>availability-grid</div> }));
vi.mock('../../reviews/components/ReviewList', () => ({ ReviewList: () => <div>review-list</div> }));

const profile = {
  id: 'prof-1',
  userId: 'user-1',
  headline: 'Eletricista João',
  bio: 'Mais de 10 anos de experiência.',
  serviceAreas: [{ id: 'a1', city: 'Porto Alegre', state: 'RS', radiusKm: null }],
  categories: [],
  ratingAverage: 4.5,
  ratingCount: 12,
} as never;

describe('PublicProfilePage', () => {
  it('compoe header, bio, areas, portfolio, disponibilidade e avaliacoes', () => {
    vi.mocked(usePublicProfile).mockReturnValue({ data: profile, isPending: false, isError: false } as never);
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());

    renderWithProviders(<PublicProfilePage />);

    expect(screen.getByText('profile-header')).toBeInTheDocument();
    expect(screen.getByText('Mais de 10 anos de experiência.')).toBeInTheDocument();
    expect(screen.getByText('Porto Alegre - RS')).toBeInTheDocument();
    expect(screen.getByText('portfolio-gallery')).toBeInTheDocument();
    expect(screen.getByText('availability-grid')).toBeInTheDocument();
    expect(screen.getByText('review-list')).toBeInTheDocument();
  });

  it('mostra estado de nao encontrado quando o perfil nao existe', () => {
    vi.mocked(usePublicProfile).mockReturnValue({ data: undefined, isPending: false, isError: true } as never);
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());

    renderWithProviders(<PublicProfilePage />);

    expect(screen.getByText('Perfil não encontrado')).toBeInTheDocument();
  });
});
