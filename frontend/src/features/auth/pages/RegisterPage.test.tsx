import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './RegisterPage';
import { authApi } from '../api';
import { useToastStore } from '../../../components/ui/Toast';

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
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('envia dados validos de cadastro com o papel padrao cliente', async () => {
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

  it('troca o papel para profissional ao clicar no card correspondente', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'p@e.com', name: 'Pedro', role: 'professional' },
    });

    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /quero oferecer servi/i }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pedro' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'p@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'professional' }),
        expect.anything(),
      ),
    );
  });

  it('mostra a barra de forca de senha ao digitar a senha', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Abcdefg1!' } });
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('mostra toast de erro quando o cadastro falha', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('email em uso'));
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(
        useToastStore.getState().toasts.some((item) => item.message === 'Nao foi possivel criar a conta'),
      ).toBe(true),
    );
  });
});
