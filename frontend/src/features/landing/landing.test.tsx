import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalResults } from './components/ProfessionalResults';
import { landingApi } from './api';

vi.mock('./api', () => ({ landingApi: { searchProfessionals: vi.fn() } }));

function renderResults() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalResults params={{ q: 'eletricista' }} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfessionalResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra profissionais retornados pela busca', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({
      items: [
        { id: 'p1', headline: 'Eletricista residencial', bio: null, hourlyRate: 100, ratingAverage: 4.5, ratingCount: 10, isAvailable: true },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderResults();
    await waitFor(() => expect(screen.getByText('Eletricista residencial')).toBeInTheDocument());
  });

  it('mostra mensagem quando nao ha resultados', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderResults();
    await waitFor(() => expect(screen.getByText('Nenhum profissional encontrado.')).toBeInTheDocument());
  });
});
