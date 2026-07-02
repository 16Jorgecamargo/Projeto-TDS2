import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardProfileSummaryCard } from './DashboardProfileSummaryCard';
import { useMyProfile } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn() }));

describe('DashboardProfileSummaryCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra headline e nota media do proprio perfil', () => {
    vi.mocked(useMyProfile).mockReturnValue({
      data: {
        id: 'prof1',
        userId: 'u1',
        headline: 'Eletricista residencial',
        bio: 'Atendo emergencias',
        yearsExperience: 5,
        hourlyRate: 80,
        serviceRadiusKm: 20,
        ratingAverage: 4.5,
        ratingCount: 12,
        isAvailable: true,
        verifiedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardProfileSummaryCard />);

    expect(screen.getByText('Eletricista residencial')).toBeInTheDocument();
    expect(screen.getByText('4.5 (12)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/professional/profile');
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardProfileSummaryCard />);

    expect(screen.getByRole('status', { name: 'Carregando perfil' })).toBeInTheDocument();
  });
});
