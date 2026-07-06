import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('renderiza valor e label', () => {
    render(<StatTile label="Usuários totais" value="42" />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Usuários totais')).toBeInTheDocument();
  });

  it('nao e clicavel quando onClick nao e passado', () => {
    render(<StatTile label="Usuários totais" value="42" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('dispara onClick quando clicavel', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<StatTile label="Denúncias pendentes" value="3" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /Denúncias pendentes/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
