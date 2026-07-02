import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PortfolioManager } from './PortfolioManager';
import {
  usePortfolio,
  useCreatePortfolioItem,
  useRemovePortfolioItem,
  useAddPortfolioImage,
  useRemovePortfolioImage,
} from '../queries';
import { uploadImage } from '../../uploads/api';

vi.mock('../queries', () => ({
  usePortfolio: vi.fn(),
  useCreatePortfolioItem: vi.fn(),
  useRemovePortfolioItem: vi.fn(),
  useAddPortfolioImage: vi.fn(),
  useRemovePortfolioImage: vi.fn(),
}));
vi.mock('../../uploads/api', () => ({ uploadImage: vi.fn() }));

describe('PortfolioManager', () => {
  const addImageMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreatePortfolioItem).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemovePortfolioItem).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useAddPortfolioImage).mockReturnValue({ mutate: addImageMutate, isPending: false } as never);
    vi.mocked(useRemovePortfolioImage).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:http://localhost/1', revokeObjectURL: vi.fn() });
  });

  it('mostra estado vazio quando nao ha itens', () => {
    vi.mocked(usePortfolio).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    expect(screen.getByText('Nenhum item no portfólio ainda')).toBeInTheDocument();
  });

  it('lista itens existentes com suas miniaturas', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        {
          id: 'item1',
          categoryId: null,
          title: 'Reforma de banheiro',
          description: null,
          completedAt: null,
          images: [{ id: 'img1', imageUrl: '/uploads/img1.jpg', position: 0 }],
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    expect(screen.getByText('Reforma de banheiro')).toBeInTheDocument();
    expect(screen.getByAltText('Reforma de banheiro')).toHaveAttribute('src', '/uploads/img1.jpg');
  });

  it('envia foto de um item existente e chama useAddPortfolioImage com o item certo', async () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        { id: 'item1', categoryId: null, title: 'Reforma de banheiro', description: null, completedAt: null, images: [] },
      ],
      isPending: false,
    } as never);
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/nova.jpg', filename: 'nova.jpg', size: 1024 });

    const user = userEvent.setup();
    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Adicionar foto a Reforma de banheiro');
    await user.upload(input, file);

    expect(useAddPortfolioImage).toHaveBeenCalledWith('prof1', 'item1');
  });
});
