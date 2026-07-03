import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

vi.mock('../components/SearchBar', () => ({ SearchBar: () => <div>search-bar</div> }));
vi.mock('../components/CategoryGrid', () => ({ CategoryGrid: () => <div>category-grid</div> }));

describe('LandingPage', () => {
  it('mostra titulo, busca e grid de categorias', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: 'Encontre o profissional certo' })).toBeInTheDocument();
    expect(screen.getByText('search-bar')).toBeInTheDocument();
    expect(screen.getByText('category-grid')).toBeInTheDocument();
  });
});
