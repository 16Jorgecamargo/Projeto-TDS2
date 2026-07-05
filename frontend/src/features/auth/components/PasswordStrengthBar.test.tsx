import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthBar } from './PasswordStrengthBar';

describe('PasswordStrengthBar', () => {
  it('nao renderiza nada quando a senha esta vazia', () => {
    const { container } = render(<PasswordStrengthBar password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o label de forca correspondente a senha', () => {
    render(<PasswordStrengthBar password="Abcdefg1!" />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('aplica a cor de tom success quando a senha e forte', () => {
    render(<PasswordStrengthBar password="Abcdefg1!" />);
    const bar = screen.getByTestId('password-strength-fill');
    expect(bar.className).toContain('bg-success');
  });

  it('aplica a cor de tom danger quando a senha e fraca', () => {
    render(<PasswordStrengthBar password="abcdefgh" />);
    const bar = screen.getByTestId('password-strength-fill');
    expect(bar.className).toContain('bg-danger');
  });
});
