# Fase 2 — FilterBar e SearchToolbar

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar.

**Goal desta fase:** Substituir `SearchFilters` por `FilterBar` (debounce de 400ms nos campos de texto, validação Zod unificada com `SearchBar`, sem o campo de busca por texto — isso passa a ser responsabilidade do novo `SearchToolbar`) e criar `SearchToolbar` (busca + botão de filtros mobile + ordenação).

**Files:**
- Modify: `frontend/src/features/landing/schemas.ts`
- Create: `frontend/src/features/landing/components/FilterBar.tsx`
- Test: `frontend/src/features/landing/components/FilterBar.test.tsx`
- Delete: `frontend/src/features/landing/components/SearchFilters.tsx`
- Delete: `frontend/src/features/landing/components/SearchFilters.test.tsx`
- Create: `frontend/src/features/landing/components/SearchToolbar.tsx`
- Test: `frontend/src/features/landing/components/SearchToolbar.test.tsx`

**Interfaces:**
- Produces: `FilterBar` — `{ value: SearchForm; onChange: (value: SearchForm) => void; onlyAvailable: boolean; onOnlyAvailableChange: (value: boolean) => void }` (mesma API pública de `SearchFilters`, mas sem o campo `q` — usado pela Fase 4).
- Produces: `SearchToolbar` — `{ query: string; onQueryChange: (value: string) => void; onOpenFilters: () => void; sort: SortOption; onSortChange: (value: SortOption) => void }`, exporta também `type SortOption = 'rating' | 'price'` — usado pela Fase 4.
- Consumes: `useCategories` de `frontend/src/features/professional/queries.ts` (já existe), `searchFormSchema`/`SearchForm` de `../schemas` (modificado nesta fase), `Button` de `frontend/src/components/ui/Button.tsx`.

---

### Task 1: Corrigir `categoryId` no schema + criar `FilterBar`

**Conteúdo atual de `frontend/src/features/landing/schemas.ts`:**

```ts
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const normalizeState = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed.toUpperCase();
};

export const searchFormSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().min(2).max(120).optional()),
  city: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  state: z.preprocess(normalizeState, z.string().regex(/^[A-Z]{2}$/, 'UF invalida').optional()),
  categoryId: z.string().uuid().optional(),
});

export type SearchForm = z.infer<typeof searchFormSchema>;
```

Problema: `categoryId` não tem `preprocess` para tratar string vazia (`''`, valor do `<option value="">Todas</option>`) como `undefined` — validando `''` contra `.uuid()` falha. `FilterBar` precisa que selecionar "Todas" resulte em `categoryId: undefined`, não em erro de validação.

- [ ] **Step 1: Editar `frontend/src/features/landing/schemas.ts`**

Trocar a linha `categoryId: z.string().uuid().optional(),` por:

```ts
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
```

O arquivo completo fica:

```ts
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const normalizeState = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed.toUpperCase();
};

export const searchFormSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().min(2).max(120).optional()),
  city: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  state: z.preprocess(normalizeState, z.string().regex(/^[A-Z]{2}$/, 'UF invalida').optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type SearchForm = z.infer<typeof searchFormSchema>;
```

- [ ] **Step 2: Escrever o teste de `FilterBar`**

Criar `frontend/src/features/landing/components/FilterBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('FilterBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'Eletricista', isActive: true, parentId: null, slug: 'eletricista', icon: null, description: null },
        { id: 'c2', name: 'Inativa', isActive: false, parentId: null, slug: 'inativa', icon: null, description: null },
      ],
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista categorias ativas no seletor', () => {
    render(<FilterBar value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Eletricista' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Inativa' })).not.toBeInTheDocument();
  });

  it('so chama onChange apos 400ms sem digitar na cidade (debounce)', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'São Paulo' } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ city: 'São Paulo' }));
  });

  it('mostra erro e nao chama onChange quando UF e invalida', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'S' } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText('UF invalida')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('chama onChange imediatamente ao trocar categoria (sem debounce)', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'c1' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c1' }));
  });

  it('chama onOnlyAvailableChange ao marcar o checkbox', () => {
    const onOnlyAvailableChange = vi.fn();
    render(
      <FilterBar value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={onOnlyAvailableChange} />,
    );

    fireEvent.click(screen.getByLabelText('Disponível agora'));

    expect(onOnlyAvailableChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- FilterBar.test.tsx`
Expected: FAIL com `Cannot find module './FilterBar'`.

- [ ] **Step 4: Implementar `FilterBar`**

Criar `frontend/src/features/landing/components/FilterBar.tsx`:

```tsx
import { useEffect, useState, type JSX } from 'react';
import { useCategories } from '../../professional/queries';
import { searchFormSchema, type SearchForm } from '../schemas';

export interface FilterBarProps {
  value: SearchForm;
  onChange: (value: SearchForm) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
}

const DEBOUNCE_MS = 400;

export function FilterBar({
  value,
  onChange,
  onlyAvailable,
  onOnlyAvailableChange,
}: FilterBarProps): JSX.Element {
  const { data: categories } = useCategories();
  const [city, setCity] = useState(value.city ?? '');
  const [state, setState] = useState(value.state ?? '');
  const [errors, setErrors] = useState<{ city?: string; state?: string }>({});

  useEffect(() => setCity(value.city ?? ''), [value.city]);
  useEffect(() => setState(value.state ?? ''), [value.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = searchFormSchema.safeParse({ ...value, city, state });
      if (result.success) {
        setErrors({});
        onChange({ ...value, city: result.data.city, state: result.data.state });
      } else {
        const fieldErrors = result.error.flatten().fieldErrors;
        setErrors({ city: fieldErrors.city?.[0], state: fieldErrors.state?.[0] });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, state]);

  function handleCategoryChange(categoryId: string) {
    onChange({ ...value, categoryId: categoryId || undefined });
  }

  return (
    <aside className="flex w-full flex-col gap-4 md:w-64">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Cidade</span>
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="rounded-sm border border-border px-3 py-2 text-sm text-ink"
        />
        {errors.city ? <span className="text-xs text-danger">{errors.city}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">UF</span>
        <input
          value={state}
          maxLength={2}
          onChange={(event) => setState(event.target.value.toUpperCase())}
          className="rounded-sm border border-border px-3 py-2 text-sm uppercase text-ink"
        />
        {errors.state ? <span className="text-xs text-danger">{errors.state}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Categoria</span>
        <select
          value={value.categoryId ?? ''}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="rounded-sm border border-border px-3 py-2 text-sm text-ink"
        >
          <option value="">Todas</option>
          {categories
            ?.filter((category) => category.isActive)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={onlyAvailable}
          onChange={(event) => onOnlyAvailableChange(event.target.checked)}
        />
        Disponível agora
      </label>
    </aside>
  );
}
```

Nota: o `eslint-disable-next-line` acima é a única exceção à regra "sem comentários" — é uma diretiva de ferramenta (eslint), não um comentário explicativo, e é necessária porque incluir `value`/`onChange` no array de dependências do efeito criaria um loop (o próprio efeito chama `onChange`, que tipicamente causa um novo `value` vindo de fora). Se o linter do projeto não reclamar sem a diretiva, remova a linha.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npm test -- FilterBar.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 6: Rodar o teste do schema (regressão)**

`searchFormSchema` já deve ter cobertura em algum teste de `SearchBar`/`schemas`. Rodar:

Run: `npm test -- src/features/landing`
Expected: nenhuma regressão nos testes existentes de `CategoryGrid` (o único outro teste da pasta que ainda existe nesta fase, já que `SearchFilters.test.tsx` foi removido no próximo passo).

- [ ] **Step 7: Remover `SearchFilters` (substituído por `FilterBar`)**

```bash
git rm frontend/src/features/landing/components/SearchFilters.tsx frontend/src/features/landing/components/SearchFilters.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/landing/schemas.ts frontend/src/features/landing/components/FilterBar.tsx frontend/src/features/landing/components/FilterBar.test.tsx
git commit -m "feat: substitui SearchFilters por FilterBar com debounce e validacao unificada"
```

---

### Task 2: `SearchToolbar`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/SearchToolbar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchToolbar } from './SearchToolbar';

describe('SearchToolbar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('so chama onQueryChange apos 400ms sem digitar (debounce)', () => {
    const onQueryChange = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={onQueryChange}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Buscar profissionais'), { target: { value: 'eletricista' } });
    expect(onQueryChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onQueryChange).toHaveBeenCalledWith('eletricista');
  });

  it('chama onOpenFilters ao clicar no botao de filtros', () => {
    const onOpenFilters = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={vi.fn()}
        onOpenFilters={onOpenFilters}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }));

    expect(onOpenFilters).toHaveBeenCalled();
  });

  it('chama onSortChange ao trocar a ordenacao', () => {
    const onSortChange = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={vi.fn()}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price' } });

    expect(onSortChange).toHaveBeenCalledWith('price');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- SearchToolbar.test.tsx`
Expected: FAIL com `Cannot find module './SearchToolbar'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/SearchToolbar.tsx`:

```tsx
import { useEffect, useState, type JSX } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export type SortOption = 'rating' | 'price';

export interface SearchToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

const DEBOUNCE_MS = 400;

export function SearchToolbar({
  query,
  onQueryChange,
  onOpenFilters,
  sort,
  onSortChange,
}: SearchToolbarProps): JSX.Element {
  const [text, setText] = useState(query);

  useEffect(() => setText(query), [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== query) {
        onQueryChange(text);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="O que você precisa?"
          aria-label="Buscar profissionais"
          className="w-full rounded-md border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onOpenFilters} className="lg:hidden">
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filtros
      </Button>
      <label className="flex items-center gap-2 text-sm text-ink">
        Ordenar por
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className="rounded-sm border border-border px-2 py-1 text-sm text-ink"
        >
          <option value="rating">Nota</option>
          <option value="price">Preço</option>
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- SearchToolbar.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/SearchToolbar.tsx frontend/src/features/landing/components/SearchToolbar.test.tsx
git commit -m "feat: adiciona SearchToolbar com busca debounced e ordenacao"
```
