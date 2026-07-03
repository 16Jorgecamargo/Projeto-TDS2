## Fase C — Landing e Busca (Tasks 7-9)

Estas 3 tasks são independentes entre si e independentes das Fases A/B/D.

### Task 7: Restilizar `SearchBar`

**Files:**
- Modify: `frontend/src/features/landing/components/SearchBar.tsx`
- Modify: `frontend/src/features/landing/landing.test.tsx` (garantir que os testes de `SearchBar` continuam passando — ver Step 1)

**Interfaces:**
- Consumes: `searchFormSchema`/`SearchForm` de `frontend/src/features/landing/schemas.ts` (já existentes, inalterados). `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Rodar os testes existentes para confirmar a baseline**

`frontend/src/features/landing/landing.test.tsx` já cobre `SearchBar` com `getByPlaceholderText('UF')`, `getByPlaceholderText('O que voce precisa?')`, `getByRole('button', { name: 'Buscar' })`. Rode: `cd frontend && npx vitest run src/features/landing/landing.test.tsx`
Esperado: PASS (todos os testes do arquivo) — esses testes não devem ser alterados, os placeholders exatos devem ser preservados.

- [ ] **Step 2: Restilizar `SearchBar.tsx`**

Substitua o conteúdo de `frontend/src/features/landing/components/SearchBar.tsx`:
```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { searchFormSchema, type SearchForm } from '../schemas';
import { Button } from '../../../components/ui/Button';

export function SearchBar(): JSX.Element {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<SearchForm>({ resolver: zodResolver(searchFormSchema) });

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    if (values.q) params.set('q', values.q);
    if (values.city) params.set('city', values.city);
    if (values.state) params.set('state', values.state);
    navigate(`/search?${params.toString()}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex gap-2">
      <input
        className="flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
        placeholder="O que voce precisa?"
        {...register('q')}
      />
      <input
        className="w-40 rounded-sm border border-surface px-3 py-2 text-ink"
        placeholder="Cidade"
        {...register('city')}
      />
      <input
        className="w-16 rounded-sm border border-surface px-3 py-2 text-ink uppercase"
        placeholder="UF"
        maxLength={2}
        {...register('state', { setValueAs: (value: string) => value.toUpperCase() })}
      />
      <Button type="submit">Buscar</Button>
    </form>
  );
}
```

- [ ] **Step 3: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/landing/landing.test.tsx`
Esperado: PASS (todos os testes do arquivo).

- [ ] **Step 4: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/SearchBar.tsx
git commit -m "style(landing): restiliza SearchBar com tokens da fase 1"
```

---

### Task 8: Restilizar `CategoryGrid`

**Files:**
- Modify: `frontend/src/features/landing/components/CategoryGrid.tsx`
- Test: `frontend/src/features/landing/components/CategoryGrid.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useCategories` de `frontend/src/features/professional/queries.ts` (já existente, inalterado). `Card` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/landing/components/CategoryGrid.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryGrid } from './CategoryGrid';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('CategoryGrid', () => {
  it('renderiza categorias ativas como cards com link de navegacao', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Eletrica', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Inativa', slug: 'inativa', icon: null, description: null, isActive: false },
      ],
    } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eletrica' })).toHaveAttribute('href', '/search?categoryId=c1');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/landing/components/CategoryGrid.test.tsx`
Esperado: FAIL — o link atual não tem `aria-label`/nome acessível igual ao texto da categoria de forma que `getByRole('link', { name: 'Eletrica' })` funcione de forma confiável junto com o wrapper `Card` (a implementação muda de estrutura).

- [ ] **Step 3: Restilizar `CategoryGrid.tsx`**

Substitua o conteúdo de `frontend/src/features/landing/components/CategoryGrid.tsx`:
```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';

export function CategoryGrid(): JSX.Element {
  const { data } = useCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {data
        ?.filter((category) => category.isActive)
        .map((category) => (
          <Card key={category.id} interactive className="relative p-4 text-center">
            <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
            <span className="text-ink">{category.name}</span>
          </Card>
        ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/landing/components/CategoryGrid.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/landing/components/CategoryGrid.tsx frontend/src/features/landing/components/CategoryGrid.test.tsx
git commit -m "style(landing): restiliza CategoryGrid com card interativo da fase 1"
```

---

### Task 9: Restilizar `LandingPage`

**Files:**
- Modify: `frontend/src/features/landing/pages/LandingPage.tsx`
- Test: `frontend/src/features/landing/pages/LandingPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `SearchBar` (Task 7), `CategoryGrid` (Task 8) — sem props, mesmo uso de hoje.
- Produces: nenhuma interface nova — só espaçamento/estrutura de página.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/landing/pages/LandingPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

vi.mock('../components/SearchBar', () => ({ SearchBar: () => <div>search-bar</div> }));
vi.mock('../components/CategoryGrid', () => ({ CategoryGrid: () => <div>category-grid</div> }));

describe('LandingPage', () => {
  it('mostra titulo, busca e grid de categorias', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: 'Encontre o profissional certo' })).toBeInTheDocument();
    expect(screen.getByText('search-bar')).toBeInTheDocument();
    expect(screen.getByText('category-grid')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar a baseline**

Rode: `cd frontend && npx vitest run src/features/landing/pages/LandingPage.test.tsx`
Esperado: PASS (1/1) já com a implementação atual — esta task só ajusta espaçamento (`gap-8`→padrão de página já usado em outras telas), não o conteúdo. O teste serve de rede de segurança.

- [ ] **Step 3: Restilizar `LandingPage.tsx`**

Substitua o conteúdo de `frontend/src/features/landing/pages/LandingPage.tsx`:
```tsx
import type { JSX } from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryGrid } from '../components/CategoryGrid';

export default function LandingPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold text-ink">Encontre o profissional certo</h1>
      <SearchBar />
      <CategoryGrid />
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/landing/pages/LandingPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa (inclusive `HomeRoute.test.tsx`, que mocka `LandingPage` inteira e não é afetado).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/landing/pages/LandingPage.tsx frontend/src/features/landing/pages/LandingPage.test.tsx
git commit -m "style(landing): restiliza LandingPage com tokens da fase 1"
```

---

### Task 10: Restilizar o `<select>` de ordenação em `SearchPage`

**Files:**
- Modify: `frontend/src/features/landing/pages/SearchPage.tsx`
- Test: `frontend/src/features/landing/pages/SearchPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `SearchFilters`, `ProfessionalResults` (já tokenizados, sem mudança). `SearchForm` de `frontend/src/features/landing/schemas.ts`.
- Produces: nenhuma interface nova — só estilo do `<select>`.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/landing/pages/SearchPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './SearchPage';

vi.mock('../components/SearchFilters', () => ({ SearchFilters: () => <div>search-filters</div> }));
vi.mock('../components/ProfessionalResults', () => ({ ProfessionalResults: () => <div>professional-results</div> }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/search']}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  it('renderiza o select de ordenacao com token de borda tokenizado', () => {
    renderPage();
    const select = screen.getByLabelText('Ordenar por') as HTMLSelectElement;
    expect(select.className).toContain('border-surface');
    expect(select.className).toContain('text-ink');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/landing/pages/SearchPage.test.tsx`
Esperado: FAIL — o `<select>` atual não tem `text-ink` na classe, e o `<label>` não está associado via `getByLabelText` corretamente (hoje o texto "Ordenar por" e o `<select>` estão dentro do mesmo `<label>` sem `htmlFor`/`id` explícitos, o que já funciona via aninhamento, então o teste deve focar em confirmar as classes).

- [ ] **Step 3: Restilizar o `<select>` em `SearchPage.tsx`**

Em `frontend/src/features/landing/pages/SearchPage.tsx`, troque o bloco do `<select>` de ordenação (mantendo toda a lógica de estado/handlers já existente):
```tsx
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
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/landing/pages/SearchPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/landing/pages/SearchPage.tsx frontend/src/features/landing/pages/SearchPage.test.tsx
git commit -m "style(landing): tokeniza select de ordenacao em SearchPage"
```

---
