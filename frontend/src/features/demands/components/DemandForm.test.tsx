import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandForm } from './DemandForm';

vi.mock('../../../components/ui/ImageUpload', () => ({
  ImageUpload: ({ onUploaded }: { onUploaded: (result: { url: string; filename: string; size: number }) => void }) => (
    <button type="button" onClick={() => onUploaded({ url: '/uploads/foto.jpg', filename: 'foto.jpg', size: 100 })}>
      Simular upload
    </button>
  ),
}));

describe('DemandForm', () => {
  it('envia os valores com array de imagens vazio quando nenhuma foto foi enviada', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DemandForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Categoria'), '11111111-1111-4111-8111-111111111111');
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Orçamento mínimo'), '100');
    await user.type(screen.getByLabelText('Orçamento máximo'), '300');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), []);
  });

  it('acumula urls de fotos enviadas e as inclui no submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DemandForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Simular upload' }));
    await user.type(screen.getByLabelText('Categoria'), '11111111-1111-4111-8111-111111111111');
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Orçamento mínimo'), '100');
    await user.type(screen.getByLabelText('Orçamento máximo'), '300');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), ['/uploads/foto.jpg']);
  });
});
