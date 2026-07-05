import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryGrid } from './CategoryGrid';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('CategoryGrid', () => {
  it('renderiza categorias ativas como cards com link de navegacao', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Eletrica', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Inativa', slug: 'inativa', icon: null, description: null, isActive: false },
      ],
    } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eletrica' })).toHaveAttribute('href', '/search?categoryId=c1');
  });

  it('usa icone especifico por categoria em vez de um icone generico unico', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Elétrica residencial', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Encanador', slug: 'encanador', icon: null, description: null, isActive: true },
      ],
    } as never);

    const { container } = render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons).toHaveLength(2);
    expect(icons[0].outerHTML).not.toEqual(icons[1].outerHTML);
  });
});
