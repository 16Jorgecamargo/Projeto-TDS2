# Fase 4 — SearchPage: URL como fonte única de verdade

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende das Fases 1, 2 e 3 já mescladas.

**Goal desta fase:** Reescrever `SearchPage` para que todos os filtros (`q`, `city`, `state`, `categoryId`, `sort`, `onlyAvailable`, `page`) vivam na URL via `useSearchParams` — hoje `sort`/`onlyAvailable` são `useState` local e se perdem ao recarregar/compartilhar. Compor `PageHeader` + `SearchToolbar` + `FilterBar` (fixo no desktop, dentro de `Drawer` no mobile/tablet) + `ProfessionalResults`.

**Files:**
- Modify: `frontend/src/features/landing/pages/SearchPage.tsx`
- Modify: `frontend/src/features/landing/pages/SearchPage.test.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Fase 1), `SearchToolbar`+`SortOption` (Fase 2), `FilterBar` (Fase 2), `ProfessionalResults` (Fase 3, com `onPageChange`), `useSearchProfessionals` (`../queries`, já existe), `Drawer` de `frontend/src/components/ui/Drawer.tsx` (já existe: `{ open, onClose, title, side?, children }`), `SearchForm` de `../schemas`.

---

### Task 1: Reescrever `SearchPage`

**Conteúdo atual de `frontend/src/features/landing/pages/SearchPage.tsx`:**

```tsx
import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from '../components/SearchFilters';
import { ProfessionalResults } from '../components/ProfessionalResults';
import type { SearchForm } from '../schemas';

type SortOption = 'rating' | 'price';

export default function SearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortOption>('rating');

  const value: SearchForm = {
    q: searchParams.get('q') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state')?.toUpperCase() ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  };

  function handleChange(next: SearchForm) {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.city) params.set('city', next.city);
    if (next.state) params.set('state', next.state);
    if (next.categoryId) params.set('categoryId', next.categoryId);
    setSearchParams(params);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row">
      <SearchFilters
        value={value}
        onChange={handleChange}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
      />
      <div className="flex-1">
        <div className="mb-4 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-ink">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="rounded-sm border border-surface px-2 py-1 text-sm text-ink"
            >
              <option value="rating">Nota</option>
              <option value="price">Preço</option>
            </select>
          </label>
        </div>
        <ProfessionalResults params={value} onlyAvailable={onlyAvailable} sort={sort} />
      </div>
    </div>
  );
}
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/landing/pages/SearchPage.test.tsx` por:

```tsx
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
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- src/features/landing/pages/SearchPage.test.tsx`
Expected: FAIL — implementação atual não usa `PageHeader`/`SearchToolbar`/`FilterBar`/`Drawer`, não persiste `sort`/`onlyAvailable`/`page` na URL.

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/landing/pages/SearchPage.tsx` por:

```tsx
import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SearchToolbar, type SortOption } from '../components/SearchToolbar';
import { FilterBar } from '../components/FilterBar';
import { ProfessionalResults } from '../components/ProfessionalResults';
import { Drawer } from '../../../components/ui/Drawer';
import { useSearchProfessionals } from '../queries';
import type { SearchForm } from '../schemas';

const DEFAULT_LIMIT = 12;

type UrlKey = 'q' | 'city' | 'state' | 'categoryId' | 'sort' | 'onlyAvailable' | 'page';

export default function SearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: SearchForm = {
    q: searchParams.get('q') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state')?.toUpperCase() ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  };
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'rating';
  const onlyAvailable = searchParams.get('onlyAvailable') === 'true';
  const page = Number(searchParams.get('page') ?? '1');

  function updateParams(next: Partial<Record<UrlKey, string | undefined>>, resetPage = true) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (resetPage && !('page' in next)) {
      params.delete('page');
    }
    setSearchParams(params);
  }

  function handleFilterChange(next: SearchForm) {
    updateParams({ city: next.city, state: next.state, categoryId: next.categoryId });
  }

  const params = { ...filters, page, limit: DEFAULT_LIMIT };
  const { data } = useSearchProfessionals(params);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        title="Resultados da busca"
        subtitle={data ? `${data.total} profissionais encontrados` : undefined}
      />
      <SearchToolbar
        query={filters.q ?? ''}
        onQueryChange={(value) => updateParams({ q: value || undefined })}
        onOpenFilters={() => setFiltersOpen(true)}
        sort={sort}
        onSortChange={(value) => updateParams({ sort: value })}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden lg:block lg:w-64">
          <FilterBar
            value={filters}
            onChange={handleFilterChange}
            onlyAvailable={onlyAvailable}
            onOnlyAvailableChange={(value) => updateParams({ onlyAvailable: value ? 'true' : undefined })}
          />
        </div>
        <div className="flex-1">
          <ProfessionalResults
            params={params}
            onlyAvailable={onlyAvailable}
            sort={sort}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) }, false)}
          />
        </div>
      </div>
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros" side="right">
        <FilterBar
          value={filters}
          onChange={handleFilterChange}
          onlyAvailable={onlyAvailable}
          onOnlyAvailableChange={(value) => updateParams({ onlyAvailable: value ? 'true' : undefined })}
        />
      </Drawer>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/features/landing/pages/SearchPage.test.tsx`
Expected: PASS (8 testes).

- [ ] **Step 5: Rodar o typecheck**

Run: `npm run typecheck` (em `frontend/`)
Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/landing/pages/SearchPage.tsx frontend/src/features/landing/pages/SearchPage.test.tsx
git commit -m "feat: reconstroi SearchPage com URL como fonte unica de verdade"
```
