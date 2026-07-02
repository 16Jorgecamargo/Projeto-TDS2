# Fase 2 — Phase A: Favoritos + Avaliações (Tasks 1-2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for the full goal, architecture, and Global Constraints — they apply to every task below. Work from `frontend/` unless noted. Independent of every other phase file — build this first.

---

### Task 1: Favoritos — API + hooks + `FavoriteButton`

**Files:**
- Create: `frontend/src/features/favorites/api.ts`
- Create: `frontend/src/features/favorites/queries.ts`
- Create: `frontend/src/features/favorites/components/FavoriteButton.tsx`
- Test: `frontend/src/features/favorites/api.test.ts`
- Test: `frontend/src/features/favorites/queries.test.ts`
- Test: `frontend/src/features/favorites/components/FavoriteButton.test.tsx`

**Interfaces:**
- Consumes: `http` from `frontend/src/lib/http.ts`; `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Favorite { id: string; professionalId: string; createdAt: string }`, `Paginated<T>`, `fetchFavorites(page?, limit?): Promise<Paginated<Favorite>>`, `addFavorite(professionalId): Promise<Favorite>`, `removeFavorite(professionalId): Promise<void>`; hooks `useFavorites(page?)`, `useFavoriteIds()` (returns `Set<string>` of favorited professional IDs, fetched with `limit=100`), `useAddFavorite()`, `useRemoveFavorite()`; component `FavoriteButton` with props `{ professionalId: string; isFavorite: boolean; className?: string }`. Consumed by `ProfessionalCard` v2 (Phase C) and the Public Profile header (Phase D).

- [ ] **Step 1: Write the failing API test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { fetchFavorites, addFavorite, removeFavorite } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe('favorites api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca favoritos paginados', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: { items: [{ id: 'f1', professionalId: 'p1', createdAt: '2026-07-01T00:00:00.000Z' }], page: 1, limit: 20, total: 1 },
    } as never);

    const result = await fetchFavorites();

    expect(http.get).toHaveBeenCalledWith('/favorites', { params: { page: 1, limit: 20 } });
    expect(result.items).toHaveLength(1);
  });

  it('adiciona um favorito', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: { id: 'f1', professionalId: 'p1', createdAt: '2026-07-01T00:00:00.000Z' },
    } as never);

    const result = await addFavorite('p1');

    expect(http.post).toHaveBeenCalledWith('/favorites', { professionalId: 'p1' });
    expect(result.professionalId).toBe('p1');
  });

  it('remove um favorito pelo id do profissional', async () => {
    vi.mocked(http.delete).mockResolvedValue({} as never);

    await removeFavorite('p1');

    expect(http.delete).toHaveBeenCalledWith('/favorites/p1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/favorites/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Write `api.ts`**

```ts
import { http } from '../../lib/http';

export interface Favorite {
  id: string;
  professionalId: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchFavorites(page = 1, limit = 20): Promise<Paginated<Favorite>> {
  const { data } = await http.get<Paginated<Favorite>>('/favorites', { params: { page, limit } });
  return data;
}

export async function addFavorite(professionalId: string): Promise<Favorite> {
  const { data } = await http.post<Favorite>('/favorites', { professionalId });
  return data;
}

export async function removeFavorite(professionalId: string): Promise<void> {
  await http.delete(`/favorites/${professionalId}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/favorites/api.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing queries test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchFavorites, addFavorite, removeFavorite } from './api';
import { useFavorites, useFavoriteIds, useAddFavorite, useRemoveFavorite } from './queries';

vi.mock('./api', () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('favorites queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useFavorites busca a pagina informada', async () => {
    vi.mocked(fetchFavorites).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const { result } = renderHook(() => useFavorites(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFavorites).toHaveBeenCalledWith(1);
  });

  it('useFavoriteIds retorna um Set com os ids favoritados', async () => {
    vi.mocked(fetchFavorites).mockResolvedValue({
      items: [{ id: 'f1', professionalId: 'p1', createdAt: '' }, { id: 'f2', professionalId: 'p2', createdAt: '' }],
      page: 1,
      limit: 100,
      total: 2,
    });

    const { result } = renderHook(() => useFavoriteIds(), { wrapper });

    await waitFor(() => expect(result.current.has('p1')).toBe(true));
    expect(result.current.has('p2')).toBe(true);
    expect(fetchFavorites).toHaveBeenCalledWith(1, 100);
  });

  it('useAddFavorite chama addFavorite', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addFavorite).toHaveBeenCalledWith('p1');
  });

  it('useRemoveFavorite chama removeFavorite', async () => {
    vi.mocked(removeFavorite).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeFavorite).toHaveBeenCalledWith('p1');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/favorites/queries.test.ts`
Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 7: Write `queries.ts`**

```ts
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFavorites, addFavorite, removeFavorite } from './api';

export const favoriteKeys = {
  list: (page: number) => ['favorites', page] as const,
};

export function useFavorites(page = 1) {
  return useQuery({ queryKey: favoriteKeys.list(page), queryFn: () => fetchFavorites(page) });
}

export function useFavoriteIds() {
  const { data } = useQuery({ queryKey: favoriteKeys.list(1), queryFn: () => fetchFavorites(1, 100) });
  return useMemo(() => new Set((data?.items ?? []).map((item) => item.professionalId)), [data]);
}

export function useAddFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (professionalId: string) => addFavorite(professionalId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useRemoveFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (professionalId: string) => removeFavorite(professionalId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorites'] }),
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/favorites/queries.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: Write the failing `FavoriteButton` test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoriteButton } from './FavoriteButton';
import { addFavorite, removeFavorite } from '../api';

vi.mock('../api', () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function renderButton(props: { professionalId: string; isFavorite: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FavoriteButton {...props} />
    </QueryClientProvider>,
  );
}

describe('FavoriteButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra estado nao favoritado e chama addFavorite ao clicar', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });
    const user = userEvent.setup();
    renderButton({ professionalId: 'p1', isFavorite: false });

    const button = screen.getByRole('button', { name: 'Adicionar aos favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(addFavorite).toHaveBeenCalledWith('p1');
  });

  it('mostra estado favoritado e chama removeFavorite ao clicar', async () => {
    vi.mocked(removeFavorite).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderButton({ professionalId: 'p1', isFavorite: true });

    const button = screen.getByRole('button', { name: 'Remover dos favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    expect(removeFavorite).toHaveBeenCalledWith('p1');
  });

  it('nao propaga o clique para um Link ancestral', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });
    const onParentClick = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <div onClick={onParentClick}>
          <FavoriteButton professionalId="p1" isFavorite={false} />
        </div>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button'));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/features/favorites/components/FavoriteButton.test.tsx`
Expected: FAIL — `Cannot find module './FavoriteButton'`

- [ ] **Step 11: Write `FavoriteButton.tsx`**

```tsx
import type { JSX, MouseEvent } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAddFavorite, useRemoveFavorite } from '../queries';
import { cn } from '../../../lib/utils';

export interface FavoriteButtonProps {
  professionalId: string;
  isFavorite: boolean;
  className?: string;
}

export function FavoriteButton({ professionalId, isFavorite, className }: FavoriteButtonProps): JSX.Element {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const pending = addFavorite.isPending || removeFavorite.isPending;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isFavorite) {
      removeFavorite.mutate(professionalId);
    } else {
      addFavorite.mutate(professionalId);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={isFavorite}
      className={cn(
        'rounded-full p-2 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
        className,
      )}
    >
      {isFavorite ? (
        <HeartSolid className="h-5 w-5 text-accent" />
      ) : (
        <HeartOutline className="h-5 w-5 text-muted" />
      )}
    </button>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/favorites/components/FavoriteButton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 13: Commit**

```bash
git add frontend/src/features/favorites/
git commit -m "feat(favorites): adiciona api, hooks e FavoriteButton"
```

---

### Task 2: Avaliações — API + hooks + `ReviewList`

**Files:**
- Create: `frontend/src/features/reviews/api.ts`
- Create: `frontend/src/features/reviews/queries.ts`
- Create: `frontend/src/features/reviews/components/ReviewList.tsx`
- Test: `frontend/src/features/reviews/api.test.ts`
- Test: `frontend/src/features/reviews/queries.test.ts`
- Test: `frontend/src/features/reviews/components/ReviewList.test.tsx`

**Interfaces:**
- Consumes: `http` from `frontend/src/lib/http.ts`; `Skeleton`, `EmptyState` from `frontend/src/components/ui/`; `formatDate` from `frontend/src/lib/utils.ts`.
- Produces: `Review { id: string; contractId: string; authorId: string; targetId: string; rating: number; comment: string | null; createdAt: string }`, `fetchProfessionalReviews(professionalId, page?, limit?): Promise<Paginated<Review>>`, hook `useProfessionalReviews(professionalId, page?)`, component `ReviewList` with props `{ professionalId: string }` (owns its own query, renders stars + comment + date per review, `Skeleton` while loading, `EmptyState` when empty). Consumed by the Public Profile page (Phase D).

- [ ] **Step 1: Write the failing API test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { fetchProfessionalReviews } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn() } }));

describe('reviews api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca avaliacoes paginadas de um profissional', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        items: [
          { id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'p1', rating: 5, comment: 'Otimo!', createdAt: '2026-07-01T00:00:00.000Z' },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
    } as never);

    const result = await fetchProfessionalReviews('p1');

    expect(http.get).toHaveBeenCalledWith('/professionals/p1/reviews', { params: { page: 1, limit: 20 } });
    expect(result.items[0].rating).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/reviews/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Write `api.ts`**

```ts
import { http } from '../../lib/http';

export interface Review {
  id: string;
  contractId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchProfessionalReviews(
  professionalId: string,
  page = 1,
  limit = 20,
): Promise<Paginated<Review>> {
  const { data } = await http.get<Paginated<Review>>(`/professionals/${professionalId}/reviews`, {
    params: { page, limit },
  });
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/reviews/api.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing queries test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fetchProfessionalReviews } from './api';
import { useProfessionalReviews } from './queries';

vi.mock('./api', () => ({ fetchProfessionalReviews: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProfessionalReviews', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca avaliacoes do profissional informado', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const { result } = renderHook(() => useProfessionalReviews('p1', 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProfessionalReviews).toHaveBeenCalledWith('p1', 1);
  });

  it('nao dispara a busca sem professionalId', () => {
    const { result } = renderHook(() => useProfessionalReviews(undefined, 1), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/reviews/queries.test.ts`
Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 7: Write `queries.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchProfessionalReviews } from './api';

export const reviewKeys = {
  list: (professionalId: string | undefined, page: number) => ['reviews', professionalId, page] as const,
};

export function useProfessionalReviews(professionalId: string | undefined, page = 1) {
  return useQuery({
    queryKey: reviewKeys.list(professionalId, page),
    queryFn: () => fetchProfessionalReviews(professionalId as string, page),
    enabled: Boolean(professionalId),
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/reviews/queries.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing `ReviewList` test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewList } from './ReviewList';
import { fetchProfessionalReviews } from '../api';

vi.mock('../api', () => ({ fetchProfessionalReviews: vi.fn() }));

function renderList(professionalId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReviewList professionalId={professionalId} />
    </QueryClientProvider>,
  );
}

describe('ReviewList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza avaliacoes com nota e comentario', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({
      items: [{ id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'p1', rating: 4, comment: 'Muito bom', createdAt: '2026-07-01T00:00:00.000Z' }],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderList('p1');

    expect(await screen.findByText('Muito bom')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha avaliacoes', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderList('p1');

    expect(await screen.findByText('Nenhuma avaliação ainda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/features/reviews/components/ReviewList.test.tsx`
Expected: FAIL — `Cannot find module './ReviewList'`

- [ ] **Step 11: Write `ReviewList.tsx`**

```tsx
import type { JSX } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { useProfessionalReviews } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';

export interface ReviewListProps {
  professionalId: string;
}

export function ReviewList({ professionalId }: ReviewListProps): JSX.Element {
  const { data, isPending } = useProfessionalReviews(professionalId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
        <Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState title="Nenhuma avaliação ainda" description="Este profissional ainda não recebeu avaliações." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.items.map((review) => (
        <li key={review.id} className="rounded-lg bg-surface p-4">
          <div className="mb-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon
                key={index}
                className={index < review.rating ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-surface'}
              />
            ))}
          </div>
          {review.comment && <p className="text-sm text-ink">{review.comment}</p>}
          <p className="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/reviews/components/ReviewList.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 13: Commit**

```bash
git add frontend/src/features/reviews/
git commit -m "feat(reviews): adiciona api, hooks e ReviewList"
```

---

Next: [plan_phase_b_dashboard.md](plan_phase_b_dashboard.md)
