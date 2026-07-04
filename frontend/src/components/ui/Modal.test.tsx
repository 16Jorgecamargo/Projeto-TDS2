import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Abrir disputa">
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título e conteúdo quando open=true', () => {
    render(
      <Modal open onClose={vi.fn()} title="Abrir disputa">
        <p>Motivo</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Abrir disputa' })).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('foca o primeiro elemento focável ao abrir', () => {
    render(
      <Modal open onClose={vi.fn()} title="Sacar">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('chama onClose ao clicar no backdrop por padrão', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar no backdrop quando closeOnBackdropClick=false', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar" closeOnBackdropClick={false}>
        conteúdo
      </Modal>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('aplica max-w-sm quando size=sm', () => {
    render(
      <Modal open onClose={vi.fn()} title="Sacar" size="sm">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
  });
});
