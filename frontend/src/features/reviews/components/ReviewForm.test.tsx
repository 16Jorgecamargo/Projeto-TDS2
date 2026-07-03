import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ReviewForm } from './ReviewForm';
import { useCreateReview } from '../queries';

vi.mock('../queries', () => ({ useCreateReview: vi.fn() }));

describe('ReviewForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia nota e comentario ao submeter', async () => {
    const mutate = vi.fn((_input, opts) => opts?.onSuccess?.());
    vi.mocked(useCreateReview).mockReturnValue({ mutate, isPending: false } as never);
    const onDone = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ReviewForm contractId="c1" onDone={onDone} />);

    await user.click(screen.getByLabelText('5 estrelas'));
    await user.type(screen.getByLabelText('Comentário'), 'Excelente servico');
    await user.click(screen.getByRole('button', { name: 'Enviar avaliação' }));

    expect(mutate).toHaveBeenCalledWith(
      { contractId: 'c1', rating: 5, comment: 'Excelente servico' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('mostra mensagem de avaliacao duplicada quando a API retorna 409', async () => {
    const mutate = vi.fn((_input, opts) => opts?.onError?.({ response: { status: 409 } }));
    vi.mocked(useCreateReview).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ReviewForm contractId="c1" onDone={vi.fn()} />);

    await user.click(screen.getByLabelText('4 estrelas'));
    await user.type(screen.getByLabelText('Comentário'), 'Comentario repetido');
    await user.click(screen.getByRole('button', { name: 'Enviar avaliação' }));

    expect(await screen.findByText('Você já avaliou este contrato.')).toBeInTheDocument();
  });
});
