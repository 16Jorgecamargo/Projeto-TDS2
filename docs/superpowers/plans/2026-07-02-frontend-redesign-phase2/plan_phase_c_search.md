# Fase 2 — Phase C: Busca (Tasks 6-7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on [plan_phase_a_favorites_reviews.md](plan_phase_a_favorites_reviews.md) (Task 1's `FavoriteButton`/`useFavoriteIds`). Work from `frontend/` unless noted.

---

### Task 6: `ProfessionalCard` v2

**Files:**
- Modify: `frontend/src/features/professional/components/ProfessionalCard.tsx`
- Test: `frontend/src/features/professional/components/ProfessionalCard.test.tsx` (new — the component had no dedicated test file before; its behavior was only covered indirectly via `landing.test.tsx`, which Task 7 updates separately)

**Interfaces:**
- Consumes: `Card`, `Badge`, `Avatar` from `frontend/src/components/ui/`; `FavoriteButton` from `frontend/src/features/favorites/components/FavoriteButton.tsx` (Phase A, Task 1).
- Produces: `ProfessionalCardProps { id: string; headline: string; bio: string | null; hourlyRate: number | null; ratingAverage: number; ratingCount: number; isAvailable: boolean; isFavorite: boolean }`, `ProfessionalCard` component. Consumed by `ProfessionalResults` (Task 7).

This is a breaking prop-shape change (adds required `isAvailable`/`isFavorite`) — Task 7 updates every current call site in the same phase.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalCard } from './ProfessionalCard';

vi.mock('../../favorites/queries', () => ({
  useAddFavorite: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('ProfessionalCard', () => {
  it('renderiza headline, preco e nota', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Eletricista João"
        bio="Especialista em instalações residenciais"
        hourlyRate={100}
        ratingAverage={4.5}
        ratingCount={20}
        isAvailable
        isFavorite={false}
      />,
    );

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('R$ 100/h')).toBeInTheDocument();
    expect(screen.getByText('4.5 (20)')).toBeInTheDocument();
    expect(screen.getByText('Disponível agora')).toBeInTheDocument();
  });

  it('mostra "Sob consulta" quando nao ha valor por hora e esconde o badge de disponibilidade', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Encanador"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        isAvailable={false}
        isFavorite={false}
      />,
    );

    expect(screen.getByText('Sob consulta')).toBeInTheDocument();
    expect(screen.queryByText('Disponível agora')).not.toBeInTheDocument();
  });

  it('linka para o perfil publico', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Eletricista"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        isAvailable={false}
        isFavorite={false}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/professionals/p1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/professional/components/ProfessionalCard.test.tsx`
Expected: FAIL — the current component doesn't render `Badge`/`FavoriteButton`/rating stars matching these assertions (old prop shape has no `isAvailable`/`isFavorite`)

- [ ] **Step 3: Replace `ProfessionalCard.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { FavoriteButton } from '../../favorites/components/FavoriteButton';

export interface ProfessionalCardProps {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  isFavorite: boolean;
}

export function ProfessionalCard({
  id,
  headline,
  bio,
  hourlyRate,
  ratingAverage,
  ratingCount,
  isAvailable,
  isFavorite,
}: ProfessionalCardProps): JSX.Element {
  return (
    <Card interactive className="relative">
      <FavoriteButton professionalId={id} isFavorite={isFavorite} className="absolute right-3 top-3" />
      <Link to={`/professionals/${id}`} className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={headline} size="md" />
          <div>
            <h3 className="font-semibold text-ink">{headline}</h3>
            {isAvailable && <Badge tone="urgent">Disponível agora</Badge>}
          </div>
        </div>
        {bio && <p className="line-clamp-2 text-sm text-muted">{bio}</p>}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink">{hourlyRate !== null ? `R$ ${hourlyRate}/h` : 'Sob consulta'}</span>
          <span className="flex items-center gap-1 text-muted">
            <StarIcon className="h-4 w-4 text-accent" />
            {ratingAverage.toFixed(1)} ({ratingCount})
          </span>
        </div>
      </Link>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/professional/components/ProfessionalCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional/components/ProfessionalCard.tsx frontend/src/features/professional/components/ProfessionalCard.test.tsx
git commit -m "feat(professional): reescreve ProfessionalCard com favoritar, badge e estrelas"
```

---

### Task 7: `SearchFilters` + ordenação + composição de `SearchPage`

**Files:**
- Create: `frontend/src/features/landing/components/SearchFilters.tsx`
- Test: `frontend/src/features/landing/components/SearchFilters.test.tsx`
- Modify: `frontend/src/features/landing/components/ProfessionalResults.tsx`
- Modify: `frontend/src/features/landing/pages/SearchPage.tsx`
- Modify: `frontend/src/features/landing/landing.test.tsx` (existing `ProfessionalResults` tests need updating for the new props/dependency — see Step 9)

**Interfaces:**
- Consumes: `useCategories` from `frontend/src/features/professional/queries.ts`; `useFavoriteIds` from `frontend/src/features/favorites/queries.ts` (Phase A, Task 1); `ProfessionalCard` v2 (Task 6); `Skeleton`, `EmptyState` from `frontend/src/components/ui/`; `SearchForm` type from `frontend/src/features/landing/schemas.ts`.
- Produces: `SearchFilters` component with props `{ value: SearchForm; onChange: (value: SearchForm) => void; onlyAvailable: boolean; onOnlyAvailableChange: (value: boolean) => void }`. `ProfessionalResults` gains optional props `onlyAvailable?: boolean` and `sort?: 'rating' | 'price'` (both default to non-filtering/rating so existing callers keep working).

- [ ] **Step 1: Write the failing test for `SearchFilters`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { SearchFilters } from './SearchFilters';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('SearchFilters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama onChange ao digitar na cidade', async () => {
    vi.mocked(useCategories).mockReturnValue({ data: [] } as never);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <SearchFilters
        value={{}}
        onChange={onChange}
        onlyAvailable={false}
        onOnlyAvailableChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Cidade'), 'S');

    expect(onChange).toHaveBeenCalledWith({ city: 'S' });
  });

  it('lista categorias ativas no seletor', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'Eletricista', isActive: true, parentId: null, slug: 'eletricista', icon: null, description: null },
        { id: 'c2', name: 'Inativa', isActive: false, parentId: null, slug: 'inativa', icon: null, description: null },
      ],
    } as never);
    renderWithProviders(
      <SearchFilters value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />,
    );

    expect(screen.getByRole('option', { name: 'Eletricista' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Inativa' })).not.toBeInTheDocument();
  });

  it('chama onOnlyAvailableChange ao marcar o checkbox', async () => {
    vi.mocked(useCategories).mockReturnValue({ data: [] } as never);
    const onOnlyAvailableChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <SearchFilters value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={onOnlyAvailableChange} />,
    );

    await user.click(screen.getByLabelText('Disponível agora'));

    expect(onOnlyAvailableChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/landing/components/SearchFilters.test.tsx`
Expected: FAIL — `Cannot find module './SearchFilters'`

- [ ] **Step 3: Write `SearchFilters.tsx`**

```tsx
import type { JSX } from 'react';
import { useCategories } from '../../professional/queries';
import type { SearchForm } from '../schemas';

export interface SearchFiltersProps {
  value: SearchForm;
  onChange: (value: SearchForm) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
}

export function SearchFilters({
  value,
  onChange,
  onlyAvailable,
  onOnlyAvailableChange,
}: SearchFiltersProps): JSX.Element {
  const { data: categories } = useCategories();

  return (
    <aside className="flex w-full flex-col gap-4 md:w-64">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">O que você precisa?</span>
        <input
          value={value.q ?? ''}
          onChange={(event) => onChange({ ...value, q: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Cidade</span>
        <input
          value={value.city ?? ''}
          onChange={(event) => onChange({ ...value, city: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">UF</span>
        <input
          value={value.state ?? ''}
          maxLength={2}
          onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm uppercase"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Categoria</span>
        <select
          value={value.categoryId ?? ''}
          onChange={(event) => onChange({ ...value, categoryId: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/landing/components/SearchFilters.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Replace `ProfessionalResults.tsx`**

```tsx
import type { JSX } from 'react';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { SearchParams } from '../api';

type SortOption = 'rating' | 'price';

export interface ProfessionalResultsProps {
  params: SearchParams;
  onlyAvailable?: boolean;
  sort?: SortOption;
}

export function ProfessionalResults({
  params,
  onlyAvailable = false,
  sort = 'rating',
}: ProfessionalResultsProps): JSX.Element {
  const { data, isPending, isError } = useSearchProfessionals(params);
  const favoriteIds = useFavoriteIds();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 w-full" aria-label="Carregando profissionais" />
        <Skeleton className="h-40 w-full" aria-label="Carregando profissionais" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Não foi possível carregar os resultados" />;
  }

  let items = data?.items ?? [];
  if (onlyAvailable) {
    items = items.filter((item) => item.isAvailable);
  }
  items = [...items].sort((a, b) =>
    sort === 'rating' ? b.ratingAverage - a.ratingAverage : (a.hourlyRate ?? Infinity) - (b.hourlyRate ?? Infinity),
  );

  if (items.length === 0) {
    return <EmptyState title="Nenhum profissional encontrado" description="Tente ampliar os filtros de busca." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ProfessionalCard
          key={item.id}
          id={item.id}
          headline={item.headline}
          bio={item.bio}
          hourlyRate={item.hourlyRate}
          ratingAverage={item.ratingAverage}
          ratingCount={item.ratingCount}
          isAvailable={item.isAvailable}
          isFavorite={favoriteIds.has(item.id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Replace `SearchPage.tsx`**

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
              className="rounded-sm border border-surface px-2 py-1 text-sm"
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

- [ ] **Step 7: Run the existing `landing.test.tsx` to see it fail**

Run: `npx vitest run src/features/landing/landing.test.tsx`
Expected: FAIL — `ProfessionalResults` now calls `useFavoriteIds()` (a real network-backed hook) which isn't mocked in this test file yet, and the rendered card structure changed (new `ProfessionalCard` no longer renders a bare `headline` alone at the top level the same way — verify the exact failure and confirm it's about the missing mock, not a typo, before proceeding).

- [ ] **Step 8: Update `landing.test.tsx`**

Add this mock near the other `vi.mock` calls at the top of the file (after the existing `vi.mock('./api', ...)` line):

```ts
vi.mock('../favorites/queries', () => ({ useFavoriteIds: () => new Set<string>() }));
```

The existing two `ProfessionalResults` tests (`'mostra profissionais retornados pela busca'` and `'mostra mensagem quando nao ha resultados'`) don't need any other change — `onlyAvailable`/`sort` are optional props with defaults, and the mocked `landingApi.searchProfessionals` payloads already include `isAvailable: true` (verify this field is present on the mocked item in the first test; if absent, add `isAvailable: true` to the mocked item so the new required `ProfessionalCard` prop has a real value instead of `undefined`).

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/features/landing/landing.test.tsx`
Expected: PASS (all tests in the file — both `ProfessionalResults` tests plus the untouched `SearchBar`/`searchFormSchema` tests)

- [ ] **Step 10: Run the full frontend suite to confirm no other regression**

Run: `npm run test`
Expected: PASS (all suites)

- [ ] **Step 11: Commit**

```bash
git add frontend/src/features/landing/components/SearchFilters.tsx frontend/src/features/landing/components/SearchFilters.test.tsx frontend/src/features/landing/components/ProfessionalResults.tsx frontend/src/features/landing/pages/SearchPage.tsx frontend/src/features/landing/landing.test.tsx
git commit -m "feat(search): adiciona filtros laterais, ordenacao e favoritar nos resultados"
```

---

Next: [plan_phase_d_profile.md](plan_phase_d_profile.md)
