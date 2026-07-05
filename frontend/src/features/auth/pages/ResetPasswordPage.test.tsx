import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPasswordPage from './ResetPasswordPage';
import { authApi } from '../api';
import { useToastStore } from '../../../components/ui/Toast';

vi.mock('../api', () => ({ authApi: { resetPassword: vi.fn() } }));

function renderPage(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('mostra EmptyState com acao para solicitar novo link quando nao ha token na url', () => {
    renderPage('/reset-password');
    expect(screen.getByText('Link inválido ou expirado')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /solicitar novo link/i });
    expect(link).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('envia nova senha quando token esta presente', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    renderPage('/reset-password?token=abc123');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith(
        { token: 'abc123', password: 'S3nh@Forte' },
        expect.anything(),
      ),
    );
  });

  it('mostra toast de erro quando o token e invalido ou expirado no submit', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(new Error('token invalido'));
    renderPage('/reset-password?token=abc123');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    await waitFor(() =>
      expect(
        useToastStore.getState().toasts.some((item) => item.message === 'Token invalido ou expirado'),
      ).toBe(true),
    );
  });
});
