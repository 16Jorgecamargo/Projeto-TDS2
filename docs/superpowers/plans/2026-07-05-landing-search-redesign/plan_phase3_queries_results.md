# Fase 3 — Queries novas + ProfessionalResults (retry, skeleton dinâmico, paginação)

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 1 (usa `Pagination`).

**Goal desta fase:** Adicionar `useFeaturedProfessionals`/`useTotalProfessionalsCount` (reuso do endpoint `/search/professionals` já existente, sem parâmetro novo) e reescrever `ProfessionalResults` para ter retry no erro, skeleton na quantidade certa e paginação real via `Pagination`.

**Files:**
- Modify: `frontend/src/features/landing/queries.ts`
- Test: `frontend/src/features/landing/queries.test.ts`
- Modify: `frontend/src/features/landing/components/ProfessionalResults.tsx`
- Test: `frontend/src/features/landing/components/ProfessionalResults.test.tsx`

**Interfaces:**
- Produces: `useFeaturedProfessionals(limit = 3)` — `useQuery` que retorna `SearchResultItem[]` (até `limit` itens, ordenados por `ratingAverage` desc) — usado pela Fase 6 (`FeaturedProfessionals`, `Testimonials`).
- Produces: `useTotalProfessionalsCount()` — `useQuery` que retorna `number` (campo `total` de uma busca sem filtros) — usado pela Fase 6 (`TrustStats`).
- Produces: `ProfessionalResults` — nova prop `onPageChange: (page: number) => void` adicionada à API existente (`{ params, onlyAvailable?, sort?, onPageChange }`) — usado pela Fase 4 (`SearchPage`).
- Consumes: `landingApi.searchProfessionals` (`../api`, já existe, não alterado), `Pagination` (Fase 1), `useFavoriteIds` (`../../favorites/queries`, já existe), `EmptyState`/`Skeleton`/`Button` de `components/ui` (já existem).

---

### Task 1: `useFeaturedProfessionals` e `useTotalProfessionalsCount`

**Conteúdo atual de `frontend/src/features/landing/queries.ts`:**

```ts
import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams } from './api';

export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}
```

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/queries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFeaturedProfessionals, useTotalProfessionalsCount } from './queries';
import { landingApi } from './api';

vi.mock('./api', () => ({ landingApi: { searchProfessionals: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFeaturedProfessionals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna os N itens com maior ratingAverage', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({
      items: [
        { id: '1', headline: 'A', bio: null, hourlyRate: 50, ratingAverage: 3.5, ratingCount: 2, isAvailable: true },
        { id: '2', headline: 'B', bio: null, hourlyRate: 60, ratingAverage: 4.9, ratingCount: 10, isAvailable: true },
        { id: '3', headline: 'C', bio: null, hourlyRate: 40, ratingAverage: 4.2, ratingCount: 5, isAvailable: false },
      ],
      page: 1,
      limit: 12,
      total: 3,
    });

    const { result } = renderHook(() => useFeaturedProfessionals(2), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data?.map((item) => item.id)).toEqual(['2', '3']);
  });
});

describe('useTotalProfessionalsCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o total da busca sem filtros', async () => {
    vi.mocked(landingApi.searchProfessionals).mockResolvedValue({ items: [], page: 1, limit: 1, total: 128 });

    const { result } = renderHook(() => useTotalProfessionalsCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(128));
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- queries.test.ts -- --root frontend/src/features/landing`

Se o comando acima não localizar o arquivo por ambiguidade de nome (`queries.test.ts` existe em várias features), rodar com o caminho completo:

Run: `npm test -- src/features/landing/queries.test.ts`
Expected: FAIL — `useFeaturedProfessionals`/`useTotalProfessionalsCount` não exportados.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/features/landing/queries.ts` por:

```ts
import { useQuery } from '@tanstack/react-query';
import { landingApi, type SearchParams, type SearchResultItem } from './api';

export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}

export function useFeaturedProfessionals(limit = 3) {
  return useQuery({
    queryKey: ['landing', 'search', { limit: 12 }],
    queryFn: () => landingApi.searchProfessionals({ limit: 12 }),
    select: (data): SearchResultItem[] =>
      [...data.items].sort((a, b) => b.ratingAverage - a.ratingAverage).slice(0, limit),
  });
}

export function useTotalProfessionalsCount() {
  return useQuery({
    queryKey: ['landing', 'search', { limit: 1 }],
    queryFn: () => landingApi.searchProfessionals({ limit: 1 }),
    select: (data): number => data.total,
  });
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/features/landing/queries.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/queries.ts frontend/src/features/landing/queries.test.ts
git commit -m "feat: adiciona useFeaturedProfessionals e useTotalProfessionalsCount"
```

---

### Task 2: `ProfessionalResults` — retry, skeleton dinâmico, paginação

**Conteúdo atual de `frontend/src/features/landing/components/ProfessionalResults.tsx`:**

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

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/ProfessionalResults.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfessionalResults } from './ProfessionalResults';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';

vi.mock('../queries', () => ({ useSearchProfessionals: vi.fn() }));
vi.mock('../../favorites/queries', () => ({ useFavoriteIds: vi.fn() }));

describe('ProfessionalResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());
  });

  it('mostra a mesma quantidade de skeletons do limit solicitado', () => {
    vi.mocked(useSearchProfessionals).mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: vi.fn() } as never);
    render(<ProfessionalResults params={{ limit: 4 }} onPageChange={vi.fn()} />);
    expect(screen.getAllByLabelText('Carregando profissionais')).toHaveLength(4);
  });

  it('mostra acao de tentar novamente no erro e chama refetch', () => {
    const refetch = vi.fn();
    vi.mocked(useSearchProfessionals).mockReturnValue({ isPending: false, isError: true, data: undefined, refetch } as never);
    render(<ProfessionalResults params={{ limit: 12 }} onPageChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(refetch).toHaveBeenCalled();
  });

  it('renderiza Pagination com os dados da resposta e propaga onPageChange', () => {
    const onPageChange = vi.fn();
    vi.mocked(useSearchProfessionals).mockReturnValue({
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        items: [
          { id: '1', headline: 'Prof 1', bio: null, hourlyRate: 50, ratingAverage: 4.5, ratingCount: 3, isAvailable: true },
        ],
        page: 2,
        limit: 1,
        total: 5,
      },
    } as never);

    render(<ProfessionalResults params={{ limit: 1, page: 2 }} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('mostra EmptyState quando nao ha resultados', () => {
    vi.mocked(useSearchProfessionals).mockReturnValue({
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      data: { items: [], page: 1, limit: 12, total: 0 },
    } as never);

    render(<ProfessionalResults params={{ limit: 12 }} onPageChange={vi.fn()} />);

    expect(screen.getByText('Nenhum profissional encontrado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- src/features/landing/components/ProfessionalResults.test.tsx`
Expected: FAIL — `onPageChange` não existe, skeleton fixo em 2, erro sem ação de retry.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/features/landing/components/ProfessionalResults.tsx` por:

```tsx
import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Pagination } from './Pagination';
import { fadeVariants, duration } from '../../../lib/motion';
import type { SearchParams } from '../api';

type SortOption = 'rating' | 'price';

export interface ProfessionalResultsProps {
  params: SearchParams;
  onlyAvailable?: boolean;
  sort?: SortOption;
  onPageChange: (page: number) => void;
}

const DEFAULT_LIMIT = 12;

export function ProfessionalResults({
  params,
  onlyAvailable = false,
  sort = 'rating',
  onPageChange,
}: ProfessionalResultsProps): JSX.Element {
  const { data, isPending, isError, refetch } = useSearchProfessionals(params);
  const favoriteIds = useFavoriteIds();
  const skeletonCount = params.limit ?? DEFAULT_LIMIT;

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" aria-label="Carregando profissionais" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        variant="error"
        title="Não foi possível carregar os resultados"
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
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
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${params.page ?? 1}-${sort}-${onlyAvailable}`}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={fadeVariants}
          transition={{ duration: duration.fast }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
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
        </motion.div>
      </AnimatePresence>
      {data ? (
        <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
```

A troca de página/filtro anima via `AnimatePresence mode="wait"` com `key` derivada de página+ordenação+disponibilidade — sinaliza "conteúdo novo chegou" (item 3 do design spec, seção "Microinterações"), reusando `fadeVariants`/`duration.fast` de `lib/motion.ts` (nenhuma constante de motion nova).

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/features/landing/components/ProfessionalResults.test.tsx`
Expected: PASS (4 testes). O `AnimatePresence`/`motion.div` não afeta as queries de `getByRole`/`getByText` usadas nos testes (mesma estrutura de grid, só com um wrapper de motion).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/ProfessionalResults.tsx frontend/src/features/landing/components/ProfessionalResults.test.tsx
git commit -m "feat: adiciona retry, skeleton dinamico e paginacao a ProfessionalResults"
```
