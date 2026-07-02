import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PortfolioGallery } from './PortfolioGallery';
import { usePortfolio } from '../queries';

vi.mock('../queries', () => ({ usePortfolio: vi.fn() }));

describe('PortfolioGallery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza titulo e imagens de cada item', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        {
          id: 'i1',
          categoryId: null,
          title: 'Instalação elétrica completa',
          description: null,
          completedAt: null,
          images: [{ id: 'img1', imageUrl: '/uploads/foto1.jpg', position: 0 }],
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<PortfolioGallery professionalId="p1" />);

    expect(screen.getByText('Instalação elétrica completa')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Instalação elétrica completa' })).toHaveAttribute(
      'src',
      '/uploads/foto1.jpg',
    );
  });

  it('mostra estado vazio sem itens de portfolio', () => {
    vi.mocked(usePortfolio).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<PortfolioGallery professionalId="p1" />);

    expect(screen.getByText('Nenhum item no portfólio ainda')).toBeInTheDocument();
  });
});
