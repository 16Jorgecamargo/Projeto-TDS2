import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import { authApi } from '../api';
import { useAuthStore } from '../../../stores/auth';
import { useToastStore } from '../../../components/ui/Toast';

vi.mock('../api', () => ({ authApi: { login: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('valida e-mail invalido antes de enviar', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nao-email' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('E-mail invalido')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('envia credenciais validas', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ email: 'm@e.com', password: 'S3nh@Forte' }, expect.anything()),
    );
  });

  it('mostra toast de erro quando as credenciais sao invalidas', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('unauthorized'));
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some((item) => item.message === 'Credenciais invalidas')).toBe(true),
    );
  });

  it('alterna a visibilidade da senha ao clicar no botao de mostrar/ocultar', () => {
    renderPage();
    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
