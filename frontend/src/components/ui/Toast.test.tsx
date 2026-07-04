import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToastStore } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renderiza um toast empurrado na store', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Contrato atualizado');
    });
    expect(screen.getByText('Contrato atualizado')).toBeInTheDocument();
  });

  it('remove o toast ao clicar em fechar', async () => {
    const user = userEvent.setup();
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Erro ao salvar', 'error');
    });

    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    await waitFor(() => expect(screen.queryByText('Erro ao salvar')).not.toBeInTheDocument());
  });

  it('aplica tom danger e role alert no tom error', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Falha de rede', 'error');
    });
    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveTextContent('Falha de rede');
    expect(toastElement).toHaveClass('bg-danger');
  });

  it('aplica tom success com role status', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Demanda criada com sucesso', 'success');
    });
    const toastElement = screen.getByRole('status');
    expect(toastElement).toHaveClass('bg-success');
  });

  it('chama a ação e dispensa o toast ao clicar no botão de ação', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Item removido', 'default', {
        action: { label: 'Desfazer', onClick: onAction },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Item removido')).not.toBeInTheDocument());
  });

  it('pausa o temporizador de auto-dismiss durante o hover', async () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Mensagem', 'default', { durationMs: 150 });
    });

    const toastElement = screen.getByText('Mensagem').closest('[role="status"]') as HTMLElement;
    fireEvent.mouseEnter(toastElement);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.getByText('Mensagem')).toBeInTheDocument();

    fireEvent.mouseLeave(toastElement);
    await waitFor(() => expect(screen.queryByText('Mensagem')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });
});
