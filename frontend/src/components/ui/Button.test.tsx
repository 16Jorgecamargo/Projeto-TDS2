import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto e responde a clique', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Salvar</Button>);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica a classe de fundo da variante accent', () => {
    render(<Button variant="accent">Aceitar</Button>);
    expect(screen.getByRole('button', { name: 'Aceitar' })).toHaveClass('bg-accent');
  });

  it('aplica a classe de fundo da variante danger', () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('bg-danger');
  });

  it('fica desabilitado quando disabled=true', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('fica desabilitado e com aria-busy quando loading=true', () => {
    render(<Button loading>Enviar</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renderiza como o filho quando asChild=true', () => {
    render(
      <Button asChild variant="ghost">
        <a href="/perfil">Ver perfil</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Ver perfil' });
    expect(link).toHaveClass('bg-transparent');
  });
});
