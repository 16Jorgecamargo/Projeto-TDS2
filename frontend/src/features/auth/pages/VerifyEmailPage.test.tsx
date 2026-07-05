import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { verifyEmail: vi.fn(), skipEmailVerification: vi.fn() } }));

function renderPage(initialEntry: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[initialEntry]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem informativa quando nao ha token', () => {
    renderPage('/verify-email');
    expect(
      screen.getByText('Abra o link enviado ao seu e-mail para confirmar sua conta.'),
    ).toBeInTheDocument();
  });

  it('permanece confirmado mesmo com dupla chamada do efeito em StrictMode', async () => {
    vi.mocked(authApi.verifyEmail)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('token ja usado'));
    renderPage('/verify-email?token=abc123');
    await waitFor(() => expect(screen.getByText('E-mail confirmado!')).toBeInTheDocument());
    expect(screen.queryByText('Token inválido ou expirado.')).not.toBeInTheDocument();
  });

  it('exibe erro quando a verificacao realmente falha', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(new Error('invalido'));
    renderPage('/verify-email?token=bad-token');
    await waitFor(() => expect(screen.getByText('Token inválido ou expirado.')).toBeInTheDocument());
  });

  it('mostra botao para ignorar verificacao quando nao ha token, e chama o skip ao clicar', async () => {
    vi.mocked(authApi.skipEmailVerification).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage('/verify-email');

    const skipButton = screen.getByRole('button', { name: 'Ignorar por enquanto' });
    await user.click(skipButton);

    expect(authApi.skipEmailVerification).toHaveBeenCalled();
  });

  it('nao mostra botao de ignorar quando ha token na URL', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue(undefined);
    renderPage('/verify-email?token=abc123');
    await waitFor(() => expect(screen.getByText('E-mail confirmado!')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Ignorar por enquanto' })).not.toBeInTheDocument();
  });

  it('o link para ir ao login e sempre renderizado como botao full-width', () => {
    renderPage('/verify-email');
    const loginLink = screen.getByRole('link', { name: /ir para o login/i });
    expect(loginLink.className).toContain('w-full');
  });
});
