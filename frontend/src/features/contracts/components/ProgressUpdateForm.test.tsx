import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressUpdateForm } from './ProgressUpdateForm';

describe('ProgressUpdateForm', () => {
  it('envia descricao e percentual ao submeter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ProgressUpdateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Descrição do progresso'), 'Fase 1 concluida');
    const percentageInput = screen.getByLabelText('Percentual concluído');
    await user.clear(percentageInput);
    await user.type(percentageInput, '50');
    await user.click(screen.getByRole('button', { name: 'Registrar progresso' }));

    expect(onSubmit).toHaveBeenCalledWith({ description: 'Fase 1 concluida', percentage: 50 });
  });

  it('desabilita o botao quando submitting', () => {
    render(<ProgressUpdateForm onSubmit={vi.fn()} submitting />);
    expect(screen.getByRole('button', { name: 'Registrar progresso' })).toBeDisabled();
  });
});
