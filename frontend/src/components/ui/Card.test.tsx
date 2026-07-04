import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('nao aplica role/tabIndex de teclado quando nao interactive', () => {
    render(<Card data-testid="card">Estático</Card>);
    const card = screen.getByTestId('card');
    expect(card).not.toHaveAttribute('role');
    expect(card).not.toHaveAttribute('tabindex');
  });

  it('expoe role button e tabIndex 0 quando interactive', () => {
    render(
      <Card interactive data-testid="card">
        Clicável
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('chama onClick ao pressionar Enter quando interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive data-testid="card" onClick={onClick}>
        Clicável
      </Card>,
    );
    screen.getByTestId('card').focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('chama onClick ao pressionar Espaço quando interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive data-testid="card" onClick={onClick}>
        Clicável
      </Card>,
    );
    screen.getByTestId('card').focus();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
