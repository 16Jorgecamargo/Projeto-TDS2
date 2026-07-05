import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';

function renderLayout(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AuthLayout', () => {
  it('renderiza titulo, descricao e conteudo filho', () => {
    renderLayout(
      <AuthLayout title="Bem-vindo de volta" description="Entre com sua conta para continuar.">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Bem-vindo de volta').length).toBeGreaterThan(0);
    expect(screen.getByText('Entre com sua conta para continuar.')).toBeInTheDocument();
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });

  it('renderiza sem descricao quando ela nao e passada', () => {
    renderLayout(
      <AuthLayout title="Redefinir senha">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Redefinir senha').length).toBeGreaterThan(0);
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });

  it('mostra botao Voltar que leva para a landing page', () => {
    renderLayout(
      <AuthLayout title="Entrar">
        <p>form aqui</p>
      </AuthLayout>,
    );
    const backLink = screen.getByRole('link', { name: /voltar/i });
    expect(backLink).toHaveAttribute('href', '/');
  });
});
