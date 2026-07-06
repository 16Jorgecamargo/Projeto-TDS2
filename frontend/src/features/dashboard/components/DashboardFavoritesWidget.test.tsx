import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardFavoritesWidget } from './DashboardFavoritesWidget';
import { useFavorites } from '../../favorites/queries';
import { usePublicProfile } from '../../professional/queries';

vi.mock('../../favorites/queries', () => ({ useFavorites: vi.fn() }));
vi.mock('../../professional/queries', () => ({ usePublicProfile: vi.fn() }));

describe('DashboardFavoritesWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista profissionais favoritados', () => {
    vi.mocked(useFavorites).mockReturnValue({
      data: { items: [{ id: 'f1', professionalId: 'p1', createdAt: '' }], page: 1, limit: 20, total: 1 },
      isPending: false,
    } as never);
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        fullName: 'Eletricista João',
        headline: 'Eletricista residencial',
        ratingAverage: 4.5,
        ratingCount: 10,
        categories: [{ id: 'cat1', name: 'Elétrica', slug: 'eletrica' }],
        serviceAreas: [{ id: 'area1', city: 'Porto Alegre', state: 'RS', radiusKm: 10 }],
      },
    } as never);

    renderWithProviders(<DashboardFavoritesWidget />);

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('Elétrica · Porto Alegre, RS')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha favoritos', () => {
    vi.mocked(useFavorites).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardFavoritesWidget />);

    expect(screen.getByText('Nenhum favorito ainda')).toBeInTheDocument();
  });
});
