import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioImageGallery } from './PortfolioImageGallery';

describe('PortfolioImageGallery', () => {
  it('nao renderiza nada quando nao ha fotos', () => {
    const { container } = render(<PortfolioImageGallery images={[]} alt="Item" onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('abre o preview ao clicar no icone de olho', async () => {
    const user = userEvent.setup();
    render(
      <PortfolioImageGallery
        images={[{ id: 'img1', imageUrl: '/uploads/foto-1.jpg', position: 0 }]}
        alt="Reforma"
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver foto de Reforma' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByAltText('Pré-visualização da foto')[0]).toHaveAttribute('src', '/uploads/foto-1.jpg');
  });

  it('remove a foto pelo id ao clicar na lixeira, sem dialogo de confirmacao', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <PortfolioImageGallery
        images={[{ id: 'img1', imageUrl: '/uploads/foto-1.jpg', position: 0 }]}
        alt="Reforma"
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remover foto de Reforma' }));

    expect(onRemove).toHaveBeenCalledWith('img1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
