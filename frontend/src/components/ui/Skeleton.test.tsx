import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('expõe role status para leitores de tela', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('usa o aria-label customizado quando informado', () => {
    render(<Skeleton aria-label="Carregando contratos" />);
    expect(screen.getByRole('status', { name: 'Carregando contratos' })).toBeInTheDocument();
  });

  it('desativa a animação sob prefers-reduced-motion', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveClass('motion-reduce:animate-none');
  });

  it('aplica rounded-full quando variant=circle', () => {
    render(<Skeleton variant="circle" />);
    expect(screen.getByRole('status')).toHaveClass('rounded-full');
  });

  it('aplica rounded-md por padrão (variant=rect)', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveClass('rounded-md');
  });
});
