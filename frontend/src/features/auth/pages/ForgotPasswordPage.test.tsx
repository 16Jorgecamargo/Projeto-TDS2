import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPasswordPage from './ForgotPasswordPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { forgotPassword: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sempre mostra o link de volta ao login no estado de formulario', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toBeInTheDocument();
  });

  it('envia o e-mail e mostra o estado de sucesso com link de volta', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument());
    expect(authApi.forgotPassword).toHaveBeenCalledWith('m@e.com', expect.anything());
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toBeInTheDocument();
  });
});
