import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClosingCta } from './ClosingCta';

describe('ClosingCta', () => {
  it('renderiza titulo e link para cadastro de profissional', () => {
    render(
      <MemoryRouter>
        <ClosingCta />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /cadastrar como profissional/i });
    expect(link).toHaveAttribute('href', '/register');
  });
});
