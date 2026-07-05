import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('renderiza label e input associados corretamente', () => {
    render(<AuthField label="E-mail" name="email" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();
  });

  it('usa token de cor danger quando ha mensagem de erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const errorMessage = screen.getByText('E-mail invalido');
    expect(errorMessage.className).toContain('text-danger');
  });

  it('marca aria-invalid e aria-describedby quando ha erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    const describedBy = input.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('E-mail invalido');
  });

  it('renderiza icone quando a prop icon e passada', () => {
    render(<AuthField label="E-mail" name="email" icon={<Mail data-testid="mail-icon" />} />);
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('renderiza endAdornment quando a prop endAdornment e passada', () => {
    render(
      <AuthField
        label="Senha"
        name="password"
        endAdornment={<button type="button">Mostrar</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
  });
});
