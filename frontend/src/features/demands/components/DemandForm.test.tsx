import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DemandForm } from './DemandForm';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('../../../components/ui/ImageUpload', () => ({
  ImageUpload: ({ onUploaded }: { onUploaded: (result: { url: string; filename: string; size: number }) => void }) => (
    <button type="button" onClick={() => onUploaded({ url: '/uploads/foto.jpg', filename: 'foto.jpg', size: 100 })}>
      Simular upload
    </button>
  ),
}));

vi.mock('../../professional/queries', () => ({
  useCategories: () => ({
    data: [{ id: CATEGORY_ID, name: 'Pintura', slug: 'pintura', isActive: true }],
  }),
}));

describe('DemandForm', () => {
  it('envia os valores de endereco e categoria com array de imagens vazio quando nenhuma foto foi enviada', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DemandForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }));
    await user.click(screen.getByRole('option', { name: 'Pintura' }));
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
    await user.type(screen.getByLabelText('Número'), '123');
    await user.type(screen.getByLabelText('Bairro'), 'Centro');
    await user.type(screen.getByLabelText('Cidade'), 'Porto Alegre');
    await user.click(screen.getByRole('combobox', { name: 'UF' }));
    await user.click(screen.getByRole('option', { name: 'Rio Grande do Sul' }));
    await user.type(screen.getByLabelText('CEP'), '90000000');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: CATEGORY_ID,
        street: 'Rua das Flores',
        number: '123',
        district: 'Centro',
        city: 'Porto Alegre',
        state: 'RS',
        zipCode: '90000-000',
      }),
      [],
    );
  });

  it('nao mostra mais campos de orcamento', () => {
    renderWithProviders(<DemandForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('Orçamento mínimo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Orçamento máximo')).not.toBeInTheDocument();
  });

  it('remove uma foto enviada ao clicar na lixeira da galeria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemandForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Simular upload' }));
    expect(screen.getByAltText('Foto da demanda')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(screen.queryByAltText('Foto da demanda')).not.toBeInTheDocument();
  });

  it('acumula urls de fotos enviadas e as inclui no submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DemandForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }));
    await user.click(screen.getByRole('option', { name: 'Pintura' }));
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
    await user.type(screen.getByLabelText('Número'), '123');
    await user.type(screen.getByLabelText('Bairro'), 'Centro');
    await user.type(screen.getByLabelText('Cidade'), 'Porto Alegre');
    await user.click(screen.getByRole('combobox', { name: 'UF' }));
    await user.click(screen.getByRole('option', { name: 'Rio Grande do Sul' }));
    await user.type(screen.getByLabelText('CEP'), '90000000');

    await user.click(screen.getByRole('button', { name: 'Simular upload' }));
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: CATEGORY_ID }), ['/uploads/foto.jpg']);
  });
});
