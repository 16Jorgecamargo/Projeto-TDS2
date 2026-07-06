import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeaturedProfessionals } from './FeaturedProfessionals';
import { useFeaturedProfessionals } from '../queries';
import { useAddFavorite, useRemoveFavorite } from '../../favorites/queries';

vi.mock('../queries', () => ({ useFeaturedProfessionals: vi.fn() }));
vi.mock('../../favorites/queries', () => ({
  useAddFavorite: vi.fn(),
  useRemoveFavorite: vi.fn(),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <FeaturedProfessionals />
    </MemoryRouter>,
  );
}

describe('FeaturedProfessionals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddFavorite).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemoveFavorite).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza os profissionais em destaque retornados pela query, com a categoria em vez de disponibilidade', () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: '1',
          fullName: 'Maria Eletricista',
          headline: 'Eletricista residencial',
          bio: null,
          hourlyRate: 80,
          ratingAverage: 4.9,
          ratingCount: 20,
          isAvailable: true,
          categories: ['Eletricista'],
        },
      ],
    } as never);

    renderComponent();

    expect(screen.getByText('Maria Eletricista')).toBeInTheDocument();
    expect(screen.getByText('Eletricista')).toBeInTheDocument();
    expect(screen.queryByText('Disponível agora')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /favoritos/ })).not.toBeInTheDocument();
  });

  it('nao renderiza nada quando nao ha profissionais em destaque', () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ isLoading: false, data: [] } as never);

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra skeletons enquanto carrega', () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ isLoading: true, data: undefined } as never);

    const { container } = renderComponent();

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });
});
