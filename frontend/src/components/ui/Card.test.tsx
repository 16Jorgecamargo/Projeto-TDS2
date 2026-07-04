import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renderiza o conteúdo com padding padrão quando usado sem composição', () => {
    render(<Card data-testid="card">Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('p-6');
  });

  it('não duplica padding quando usa Card.Header/Body/Footer', () => {
    render(
      <Card data-testid="card">
        <Card.Header>Título</Card.Header>
        <Card.Body>Corpo</Card.Body>
      </Card>,
    );
    expect(screen.getByTestId('card')).not.toHaveClass('p-6');
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Corpo')).toBeInTheDocument();
  });

  it('aplica ring quando selected', () => {
    render(
      <Card selected data-testid="card">
        Selecionado
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('ring-2');
  });

  it('aplica cursor-pointer quando interactive', () => {
    render(
      <Card interactive data-testid="card">
        Clicável
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('cursor-pointer');
  });
});
