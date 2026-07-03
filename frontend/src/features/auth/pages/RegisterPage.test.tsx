import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './RegisterPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { register: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia dados validos de cadastro', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'Maria', role: 'client' },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Maria', email: 'm@e.com', phone: '11999990000', role: 'client' }),
        expect.anything(),
      ),
    );
  });
});
