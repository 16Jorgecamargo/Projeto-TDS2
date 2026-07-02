import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardReviewsWidget } from './DashboardReviewsWidget';
import { useMyProfile } from '../../professional/queries';
import { useProfessionalReviews } from '../../reviews/queries';

vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn() }));
vi.mock('../../reviews/queries', () => ({ useProfessionalReviews: vi.fn() }));

describe('DashboardReviewsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza a ReviewList com o id do proprio profissional', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      data: {
        items: [{ id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'prof1', rating: 5, comment: 'Ótimo!', createdAt: '2026-01-01T00:00:00Z' }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardReviewsWidget />);

    expect(useProfessionalReviews).toHaveBeenCalledWith('prof1');
    expect(screen.getByText('Ótimo!')).toBeInTheDocument();
  });
});
