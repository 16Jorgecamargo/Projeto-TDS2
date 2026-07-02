import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza o conteúdo', () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('usa fundo accent no tom urgent', () => {
    render(<Badge tone="urgent">3</Badge>);
    expect(screen.getByText('3')).toHaveClass('bg-accent');
  });

  it('usa fundo surface no tom neutral por padrão', () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText('Pendente')).toHaveClass('bg-surface');
  });
});
