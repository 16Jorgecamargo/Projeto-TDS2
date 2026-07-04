import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('mostra mensagem de pagina nao encontrada e link para voltar', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/');
  });
});
