import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CatalogPage } from './CatalogPage';

vi.mock('../components/CatalogManager', () => ({ CatalogManager: () => <div>catalog-manager</div> }));

describe('CatalogPage', () => {
  it('mostra titulo e o gerenciador de catalogo', () => {
    render(<CatalogPage />);
    expect(screen.getByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.getByText('catalog-manager')).toBeInTheDocument();
  });
});
