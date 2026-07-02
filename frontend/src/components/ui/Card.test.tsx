import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renderiza o conteúdo', () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('aplica classe de sombra em hover apenas quando interactive', () => {
    render(<Card interactive>Clicável</Card>);
    expect(screen.getByText('Clicável')).toHaveClass('hover:shadow-hover');
  });

  it('não aplica sombra em hover por padrão', () => {
    render(<Card>Estático</Card>);
    expect(screen.getByText('Estático')).not.toHaveClass('hover:shadow-hover');
  });
});
