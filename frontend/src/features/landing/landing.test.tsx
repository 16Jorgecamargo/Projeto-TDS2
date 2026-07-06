import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProfessionalResults } from './components/ProfessionalResults';
import { SearchBar } from './components/SearchBar';
import { landingApi } from './api';
import { searchFormSchema } from './schemas';

vi.mock('./api', () => ({
  landingApi: { searchProfessionals: vi.fn(), listLocations: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../favorites/queries', () => ({
  useFavoriteIds: () => new Set<string>(),
  useAddFavorite: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../professional/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../professional/queries')>();
  return { ...actual, useCategories: () => ({ data: [], isLoading: false }) };
});

function renderResults() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalResults params={{ q: 'eletricista' }} onPageChange={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfessionalResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra profissionais retornados pela busca', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({
      items: [
        { id: 'p1', fullName: 'João Silva', headline: 'Eletricista residencial', bio: null, hourlyRate: 100, ratingAverage: 4.5, ratingCount: 10, isAvailable: true, categories: ['Eletricista'] },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderResults();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
  });

  it('mostra mensagem quando nao ha resultados', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    renderResults();
    await waitFor(() => expect(screen.getByText('Nenhum profissional encontrado')).toBeInTheDocument());
  });
});

function LocationDisplay() {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

function renderSearchBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <SearchBar />
                <LocationDisplay />
              </>
            }
          />
          <Route path="/search" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchBar', () => {
  it('bloqueia a busca quando o termo tem menos de 2 caracteres', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(screen.getByPlaceholderText('O que voce precisa?'), 'a');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByTestId('location-search').textContent).toBe('');
  });
});

describe('searchFormSchema', () => {
  it('rejeita busca textual com menos de 2 caracteres', () => {
    const result = searchFormSchema.safeParse({ q: 'a' });
    expect(result.success).toBe(false);
  });

  it('aceita busca textual sem valor informado', () => {
    const result = searchFormSchema.safeParse({ q: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBeUndefined();
    }
  });

  it('normaliza uf minuscula para maiuscula', () => {
    const result = searchFormSchema.safeParse({ state: 'rs' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('RS');
    }
  });

  it('rejeita uf com formato invalido', () => {
    const result = searchFormSchema.safeParse({ state: 'r1' });
    expect(result.success).toBe(false);
  });
});
