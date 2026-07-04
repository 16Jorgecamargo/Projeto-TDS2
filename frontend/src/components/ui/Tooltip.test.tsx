import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('não mostra o texto do tooltip antes do hover', () => {
    render(
      <Tooltip label="Carteira" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('mostra o texto do tooltip ao focar o elemento filho', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Carteira');
  });

  it('esconde o tooltip ao perder o foco', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip label="Carteira" delayMs={0}>
          <button>Ícone</button>
        </Tooltip>
        <button>Outro</button>
      </div>,
    );

    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('respeita o delayMs configurado antes de mostrar', async () => {
    render(
      <Tooltip label="Carteira" delayMs={150}>
        <button>Ícone</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText('Ícone'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    expect(await screen.findByRole('tooltip', {}, { timeout: 500 })).toHaveTextContent('Carteira');
  });

  it('posiciona à direita quando side="right"', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira" side="right" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveClass('left-full');
  });
});
