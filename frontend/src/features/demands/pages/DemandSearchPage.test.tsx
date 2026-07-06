import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DemandSearchPage from './DemandSearchPage';
import { useDemandSearch } from '../queries';
import { useMyProfile, usePublicProfile } from '../../professional/queries';

vi.mock('../queries', () => ({ useDemandSearch: vi.fn() }));
vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn(), usePublicProfile: vi.fn() }));

vi.mock('../components/DemandFilterBar', () => ({
  DemandFilterBar: ({
    value,
    onChange,
  }: {
    value: { city?: string };
    onChange: (value: unknown) => void;
  }) => (
    <div>
      <span data-testid="current-city">{value.city}</span>
      <button onClick={() => onChange({ ...value, city: 'Recife' })}>set-city</button>
    </div>
  ),
}));

vi.mock('../components/DemandResults', () => ({
  DemandResults: ({ params, onPageChange }: { params: unknown; onPageChange: (page: number) => void }) => (
    <div>
      <span data-testid="current-params">{JSON.stringify(params)}</span>
      <button onClick={() => onPageChange(3)}>go-page-3</button>
    </div>
  ),
}));

function renderPage(initialEntry = '/demands') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <DemandSearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DemandSearchPage', () => {
  beforeEach(() => {
    vi.mocked(useDemandSearch).mockReturnValue({
      data: { items: [], page: 1, limit: 12, total: 7 },
    } as never);
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof-1' } } as never);
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'prof-1',
        categories: [{ id: 'cat-1', name: 'Eletricista', slug: 'eletricista' }],
        serviceAreas: [{ id: 'area-1', city: 'Porto Alegre', state: 'RS', radiusKm: 10 }],
      },
    } as never);
  });

  it('nao mostra botao de publicar demanda', () => {
    renderPage();
    expect(screen.queryByText('Publicar demanda')).not.toBeInTheDocument();
  });

  it('mostra o botao de voltar', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument();
  });

  it('mostra a contagem total real no cabecalho', () => {
    renderPage();
    expect(screen.getByText('7 demandas encontradas')).toBeInTheDocument();
  });

  it('pre-preenche cidade/estado/categoria com o proprio perfil quando a URL nao tem filtros', () => {
    renderPage();
    expect(screen.getByTestId('current-params')).toHaveTextContent('"city":"Porto Alegre"');
    expect(screen.getByTestId('current-params')).toHaveTextContent('"state":"RS"');
    expect(screen.getByTestId('current-params')).toHaveTextContent('"categoryId":"cat-1"');
  });

  it('respeita filtros ja presentes na URL sem sobrescrever com o perfil', () => {
    renderPage('/demands?city=Recife');
    expect(screen.getByTestId('current-city')).toHaveTextContent('Recife');
  });

  it('permite remover o filtro pre-preenchido', () => {
    renderPage();
    fireEvent.click(screen.getByText('set-city'));
    expect(screen.getByTestId('current-params')).toHaveTextContent('"city":"Recife"');
  });

  it('atualiza page na URL ao paginar', () => {
    renderPage();
    fireEvent.click(screen.getByText('go-page-3'));
    expect(screen.getByTestId('current-params')).toHaveTextContent('"page":3');
  });
});
