import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPasswordPage from './ForgotPasswordPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { forgotPassword: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ForgotPasswordPage />
    </QueryClientProvider>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o e-mail e mostra mensagem de confirmacao', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText('Se o e-mail existir, enviamos as instrucoes.')).toBeInTheDocument(),
    );
    expect(authApi.forgotPassword).toHaveBeenCalledWith('m@e.com', expect.anything());
  });
});
