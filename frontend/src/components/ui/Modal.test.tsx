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
});
