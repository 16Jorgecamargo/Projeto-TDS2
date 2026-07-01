import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { verifyEmail: vi.fn() } }));

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
    expect(screen.getByText('Abra o link enviado ao seu e-mail.')).toBeInTheDocument();
  });

  it('permanece confirmado mesmo com dupla chamada do efeito em StrictMode', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('token ja usado'));
    renderPage('/verify-email?token=abc123');
    await waitFor(() => expect(screen.getByText('E-mail confirmado!')).toBeInTheDocument());
    expect(screen.queryByText('Token invalido ou expirado.')).not.toBeInTheDocument();
  });

  it('exibe erro quando a verificacao realmente falha', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(new Error('invalido'));
    renderPage('/verify-email?token=bad-token');
    await waitFor(() => expect(screen.getByText('Token invalido ou expirado.')).toBeInTheDocument());
  });
});
