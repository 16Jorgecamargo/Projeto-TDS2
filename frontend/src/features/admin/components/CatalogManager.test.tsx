import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogManager } from './CatalogManager';
import { useCategories, useCreateCategory, useUpdateCategory, useTags, useCreateTag } from '../queries';

vi.mock('../queries', () => ({
  useCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useUpdateCategory: vi.fn(),
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
}));

function categoriesFixture() {
  return {
    data: [
      { id: 'c1', parentId: null, name: 'Eletrica', slug: 'eletrica', icon: null, description: null, isActive: true },
    ],
    isLoading: false,
  };
}

function tagsFixture() {
  return { data: [{ id: 't1', name: 'Urgente', slug: 'urgente' }], isLoading: false };
}

describe('CatalogManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista categorias e tags existentes', () => {
    vi.mocked(useCategories).mockReturnValue(categoriesFixture() as never);
    vi.mocked(useTags).mockReturnValue(tagsFixture() as never);
    vi.mocked(useCreateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCreateTag).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<CatalogManager />);

    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('cria nova categoria preenchendo nome e slug', async () => {
    const mutate = vi.fn();
    vi.mocked(useCategories).mockReturnValue(categoriesFixture() as never);
    vi.mocked(useTags).mockReturnValue(tagsFixture() as never);
    vi.mocked(useCreateCategory).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useUpdateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCreateTag).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<CatalogManager />);
    await user.type(screen.getByLabelText('Nome da categoria'), 'Hidraulica');
    await user.type(screen.getByLabelText('Slug da categoria'), 'hidraulica');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(mutate).toHaveBeenCalledWith({
      parentId: null,
      name: 'Hidraulica',
      slug: 'hidraulica',
      icon: null,
      description: null,
    });
  });

  it('cria nova tag preenchendo nome e slug', async () => {
    const mutate = vi.fn();
    vi.mocked(useCategories).mockReturnValue(categoriesFixture() as never);
    vi.mocked(useTags).mockReturnValue(tagsFixture() as never);
    vi.mocked(useCreateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCreateTag).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<CatalogManager />);
    await user.type(screen.getByLabelText('Nome da tag'), 'Fixo');
    await user.type(screen.getByLabelText('Slug da tag'), 'fixo');
    await user.click(screen.getByRole('button', { name: 'Criar tag' }));

    expect(mutate).toHaveBeenCalledWith({ name: 'Fixo', slug: 'fixo' });
  });

  it('alterna categoria ativa/inativa', async () => {
    const mutate = vi.fn();
    vi.mocked(useCategories).mockReturnValue(categoriesFixture() as never);
    vi.mocked(useTags).mockReturnValue(tagsFixture() as never);
    vi.mocked(useCreateCategory).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateCategory).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useCreateTag).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<CatalogManager />);
    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'c1', input: { isActive: false } });
  });
});
