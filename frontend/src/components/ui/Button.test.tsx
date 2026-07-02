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

  it('fica desabilitado quando disabled=true', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});
