import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('não mostra o texto do tooltip antes do hover', () => {
    render(
      <Tooltip label="Carteira">
        <button>Ícone</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('mostra o texto do tooltip ao focar o elemento filho', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira">
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(screen.getByRole('tooltip')).toHaveTextContent('Carteira');
  });

  it('esconde o tooltip ao perder o foco', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip label="Carteira">
          <button>Ícone</button>
        </Tooltip>
        <button>Outro</button>
      </div>,
    );

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
