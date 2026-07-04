import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('não renderiza nada quando open=false', () => {
    render(
      <Drawer open={false} onClose={vi.fn()} title="Menu">
        itens
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza no lado esquerdo quando side="left"', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" side="left">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('left-0');
  });

  it('renderiza como bottom-sheet quando side="bottom"', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" side="bottom">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('bottom-0');
  });

  it('chama onClose ao clicar no backdrop', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );

    const backdrop = document.querySelector('.bg-overlay') as HTMLElement;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar dentro do conteúdo', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );

    await user.click(screen.getByText('Itens'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('aplica w-96 quando size=lg', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" size="lg">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('w-96');
  });

  it('foca o primeiro elemento focável ao abrir', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });
});
