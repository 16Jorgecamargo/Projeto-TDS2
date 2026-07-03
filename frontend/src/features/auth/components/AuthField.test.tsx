import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('renderiza label e input associados corretamente', () => {
    render(<AuthField label="E-mail" name="email" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();
  });

  it('usa token de cor de erro quando ha mensagem de erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const errorMessage = screen.getByText('E-mail invalido');
    expect(errorMessage.className).toContain('text-accent');
  });
});
