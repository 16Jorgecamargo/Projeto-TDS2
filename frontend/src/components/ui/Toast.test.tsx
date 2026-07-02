import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

    expect(screen.queryByText('Erro ao salvar')).not.toBeInTheDocument();
  });

  it('aplica tom de erro com fundo accent', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Falha de rede', 'error');
    });
    expect(screen.getByText('Falha de rede').closest('[role="status"]')).toHaveClass('bg-accent');
  });
});
