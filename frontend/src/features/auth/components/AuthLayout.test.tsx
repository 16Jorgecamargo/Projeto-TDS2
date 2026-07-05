import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renderiza titulo, descricao e conteudo filho', () => {
    render(
      <AuthLayout title="Bem-vindo de volta" description="Entre com sua conta para continuar.">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Bem-vindo de volta').length).toBeGreaterThan(0);
    expect(screen.getByText('Entre com sua conta para continuar.')).toBeInTheDocument();
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });

  it('renderiza sem descricao quando ela nao e passada', () => {
    render(
      <AuthLayout title="Redefinir senha">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Redefinir senha').length).toBeGreaterThan(0);
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });
});
