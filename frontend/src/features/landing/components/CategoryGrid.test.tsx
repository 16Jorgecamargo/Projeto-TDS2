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
});
