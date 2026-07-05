import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './SearchPage';
import { useSearchProfessionals } from '../queries';

vi.mock('../queries', () => ({ useSearchProfessionals: vi.fn() }));

vi.mock('../components/SearchToolbar', () => ({
  SearchToolbar: ({ sort, onSortChange, onOpenFilters }: {
    sort: string;
    onSortChange: (value: string) => void;
    onOpenFilters: () => void;
  }) => (
    <div>
      <span data-testid="current-sort">{sort}</span>
      <button onClick={() => onSortChange('price')}>set-sort-price</button>
      <button onClick={onOpenFilters}>open-filters</button>
    </div>
  ),
}));

vi.mock('../components/FilterBar', () => ({
  FilterBar: ({ value, onChange, onlyAvailable, onOnlyAvailableChange }: {
    value: { city?: string };
    onChange: (value: unknown) => void;
    onlyAvailable: boolean;
    onOnlyAvailableChange: (value: boolean) => void;
  }) => (
    <div>
      <span data-testid="current-only-available">{String(onlyAvailable)}</span>
      <button onClick={() => onChange({ ...value, city: 'Recife' })}>set-city</button>
      <button onClick={() => onOnlyAvailableChange(!onlyAvailable)}>toggle-available</button>
    </div>
  ),
}));

vi.mock('../components/ProfessionalResults', () => ({
  ProfessionalResults: ({ params, onPageChange }: { params: unknown; onPageChange: (page: number) => void }) => (
    <div>
      <span data-testid="current-params">{JSON.stringify(params)}</span>
      <button onClick={() => onPageChange(3)}>go-page-3</button>
    </div>
  ),
}));

function renderPage(initialEntry = '/search') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.mocked(useSearchProfessionals).mockReturnValue({
      data: { items: [], page: 1, limit: 12, total: 42 },
    } as never);
  });

  it('mostra a contagem total real no cabecalho', () => {
    renderPage();
    expect(screen.getByText('42 profissionais encontrados')).toBeInTheDocument();
  });

  it('reflete o valor inicial de sort vindo da URL', () => {
    renderPage('/search?sort=price');
    expect(screen.getByTestId('current-sort')).toHaveTextContent('price');
  });

  it('atualiza sort na URL ao trocar via SearchToolbar', () => {
    renderPage();
    fireEvent.click(screen.getByText('set-sort-price'));
    expect(screen.getByTestId('current-sort')).toHaveTextContent('price');
  });

  it('atualiza city na URL ao trocar via FilterBar e reflete em params de ProfessionalResults', () => {
    renderPage();
    fireEvent.click(screen.getByText('set-city'));
    expect(screen.getByTestId('current-params')).toHaveTextContent('"city":"Recife"');
  });

  it('reflete onlyAvailable inicial vindo da URL e persiste ao alternar', () => {
    renderPage('/search?onlyAvailable=true');
    expect(screen.getByTestId('current-only-available')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('toggle-available'));
    expect(screen.getByTestId('current-only-available')).toHaveTextContent('false');
  });

  it('atualiza page na URL ao paginar e reflete em params de ProfessionalResults', () => {
    renderPage();
    fireEvent.click(screen.getByText('go-page-3'));
    expect(screen.getByTestId('current-params')).toHaveTextContent('"page":3');
  });

  it('reseta a pagina para 1 ao trocar de ordenacao', () => {
    renderPage('/search?page=5');
    fireEvent.click(screen.getByText('set-sort-price'));
    expect(screen.getByTestId('current-params')).toHaveTextContent('"page":1');
  });

  it('abre o Drawer de filtros ao clicar em abrir filtros, montando um segundo FilterBar', () => {
    renderPage();
    expect(screen.getAllByText('set-city')).toHaveLength(1);
    fireEvent.click(screen.getByText('open-filters'));
    expect(screen.getAllByText('set-city')).toHaveLength(2);
  });
});
