import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Testimonials } from './Testimonials';
import { useFeaturedProfessionals } from '../queries';
import { useProfessionalReviews } from '../../reviews/queries';

vi.mock('../queries', () => ({ useFeaturedProfessionals: vi.fn() }));
vi.mock('../../reviews/queries', () => ({ useProfessionalReviews: vi.fn() }));

describe('Testimonials', () => {
  it('mostra depoimento real com nome e primeira letra do sobrenome do cliente autor', async () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      data: [{ id: 'p1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true, categories: [] }],
    } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            id: 'r1',
            contractId: 'c1',
            authorId: 'a1',
            authorName: 'Ana Souza',
            targetId: 'p1',
            rating: 5,
            comment: 'Excelente profissional',
            createdAt: '2026-01-01',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
    } as never);

    render(<Testimonials />);

    await waitFor(() => expect(screen.getByText('"Excelente profissional"')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Depoimentos' })).toBeInTheDocument();
    expect(screen.getByText('Ana S.')).toBeInTheDocument();
    expect(screen.queryByText('Maria Eletricista')).not.toBeInTheDocument();
  });

  it('esconde a secao quando nenhum profissional em destaque tem review com comentario', async () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      data: [{ id: 'p1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true, categories: [] }],
    } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      isLoading: false,
      data: { items: [], page: 1, limit: 20, total: 0 },
    } as never);

    render(<Testimonials />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Depoimentos', hidden: true }).closest('section')).toHaveAttribute('hidden'));
  });

  it('nao renderiza nada quando nao ha profissionais em destaque', () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ data: [] } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({ isLoading: false, data: undefined } as never);

    const { container } = render(<Testimonials />);

    expect(container).toBeEmptyDOMElement();
  });
});
