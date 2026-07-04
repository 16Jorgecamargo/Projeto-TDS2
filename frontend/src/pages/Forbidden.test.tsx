import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Forbidden } from './Forbidden';

describe('Forbidden', () => {
  it('mostra mensagem de acesso restrito e link para voltar', () => {
    render(
      <MemoryRouter>
        <Forbidden />
      </MemoryRouter>,
    );

    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/');
  });
});
