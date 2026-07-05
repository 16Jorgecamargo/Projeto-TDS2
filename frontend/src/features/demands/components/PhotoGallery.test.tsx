import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGallery } from './PhotoGallery';

describe('PhotoGallery', () => {
  it('nao renderiza nada quando nao ha fotos', () => {
    const { container } = render(<PhotoGallery images={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('abre o preview ao clicar no icone de olho', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery images={['/uploads/foto-1.jpg']} onRemove={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByAltText('Pré-visualização da foto')[0]).toHaveAttribute('src', '/uploads/foto-1.jpg');
  });

  it('remove a foto ao clicar na lixeira, sem dialogo de confirmacao', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<PhotoGallery images={['/uploads/foto-1.jpg']} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(onRemove).toHaveBeenCalledWith('/uploads/foto-1.jpg');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
