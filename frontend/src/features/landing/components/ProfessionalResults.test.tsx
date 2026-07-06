import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalResults } from './ProfessionalResults';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds, useAddFavorite, useRemoveFavorite } from '../../favorites/queries';

vi.mock('../queries', () => ({ useSearchProfessionals: vi.fn() }));
vi.mock('../../favorites/queries', () => ({
  useFavoriteIds: vi.fn(),
  useAddFavorite: vi.fn(),
  useRemoveFavorite: vi.fn(),
}));

describe('ProfessionalResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());
    vi.mocked(useAddFavorite).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemoveFavorite).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('mostra a mesma quantidade de skeletons do limit solicitado', () => {
    vi.mocked(useSearchProfessionals).mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: vi.fn() } as never);
    renderWithProviders(<ProfessionalResults params={{ limit: 4 }} onPageChange={vi.fn()} />);
    expect(screen.getAllByLabelText('Carregando profissionais')).toHaveLength(4);
  });

  it('mostra acao de tentar novamente no erro e chama refetch', () => {
    const refetch = vi.fn();
    vi.mocked(useSearchProfessionals).mockReturnValue({ isPending: false, isError: true, data: undefined, refetch } as never);
    renderWithProviders(<ProfessionalResults params={{ limit: 12 }} onPageChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(refetch).toHaveBeenCalled();
  });

  it('renderiza Pagination com os dados da resposta e propaga onPageChange', () => {
    const onPageChange = vi.fn();
    vi.mocked(useSearchProfessionals).mockReturnValue({
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        items: [
          { id: '1', fullName: 'Prof 1', headline: 'Prof 1', bio: null, hourlyRate: 50, ratingAverage: 4.5, ratingCount: 3, isAvailable: true },
        ],
        page: 2,
        limit: 1,
        total: 5,
      },
    } as never);

    renderWithProviders(<ProfessionalResults params={{ limit: 1, page: 2 }} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('mostra EmptyState quando nao ha resultados', () => {
    vi.mocked(useSearchProfessionals).mockReturnValue({
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      data: { items: [], page: 1, limit: 12, total: 0 },
    } as never);

    renderWithProviders(<ProfessionalResults params={{ limit: 12 }} onPageChange={vi.fn()} />);

    expect(screen.getByText('Nenhum profissional encontrado')).toBeInTheDocument();
  });
});
