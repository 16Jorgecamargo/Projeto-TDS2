import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(<EmptyState title="Nada aqui" description="Crie o primeiro item" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Crie o primeiro item')).toBeInTheDocument();
  });

  it('renderiza a ação quando fornecida', () => {
    render(<EmptyState title="Nada aqui" action={<button>Criar</button>} />);
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('renderiza o ícone quando fornecido', () => {
    render(<EmptyState title="Nada aqui" icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('usa role alert e fundo danger quando variant=error', () => {
    render(<EmptyState title="Erro ao carregar" variant="error" />);
    const region = screen.getByRole('alert');
    expect(region).toHaveClass('border-danger/20');
  });

  it('não usa role alert quando variant=empty (padrão)', () => {
    render(<EmptyState title="Nada aqui" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
