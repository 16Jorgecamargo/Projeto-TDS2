# Phase 1f: Command Palette

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on Phase 1b (`Modal`), Phase 1c (`navConfig`, `commandPaletteStore`).

**Scope note:** search covers navigation (always) and professionals + demands (when the query is 2+ characters). Contracts are excluded from cross-entity search in this phase — `Contract` (see `frontend/src/features/contracts/api.ts`) has no title/free-text field, only `total` and `status`, so there is nothing meaningful to full-text match; contracts stay reachable via the "Contratos" nav item. No new endpoint is added for any of this — professionals reuse `GET /search/professionals` (already wired via `useSearchProfessionals`), demands reuse `GET /demands` (already wired via `useDemands`), both client-side filtered/passed through as today.

---

### Task 1: Add an `enabled` escape hatch to `useSearchProfessionals` and `useDemands`

**Files:**
- Modify: `frontend/src/features/landing/queries.ts`
- Modify: `frontend/src/features/demands/queries.ts`

**Interfaces:**
- Produces: `useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean })` and `useDemands(mine?: boolean, options?: { enabled?: boolean })` — both backward-compatible (existing single-argument call sites in `SearchPage.tsx` and `DemandListPage.tsx` keep working unchanged, since `options` is optional and defaults to TanStack Query's own default of `enabled: true`). `CommandPalette` (Task 2 below) is the reason this is needed: it mounts once, globally, for the whole app session, and must not fire a professionals/demands fetch until the palette is open and the user has typed 2+ characters.

This task has no new testable behavior of its own (the existing call sites are unaffected); it's verified by the existing test suites for those two features plus a typecheck.

- [ ] **Step 1: Add the `enabled` option to `useSearchProfessionals`**

In `frontend/src/features/landing/queries.ts`, replace:

```ts
export function useSearchProfessionals(params: SearchParams) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
  });
}
```

with:

```ts
export function useSearchProfessionals(params: SearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['landing', 'search', params],
    queryFn: () => landingApi.searchProfessionals(params),
    enabled: options?.enabled ?? true,
  });
}
```

- [ ] **Step 2: Add the `enabled` option to `useDemands`**

In `frontend/src/features/demands/queries.ts`, replace:

```ts
export function useDemands(mine?: boolean) {
  return useQuery({ queryKey: demandKeys.list(mine), queryFn: () => fetchDemands({ mine }) });
}
```

with:

```ts
export function useDemands(mine?: boolean, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: demandKeys.list(mine),
    queryFn: () => fetchDemands({ mine }),
    enabled: options?.enabled ?? true,
  });
}
```

- [ ] **Step 3: Run the existing suites for both features to confirm no regression**

Run: `cd frontend && npx vitest run src/features/landing src/features/demands`
Expected: PASS (all existing tests, unchanged)

- [ ] **Step 4: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/queries.ts frontend/src/features/demands/queries.ts
git commit -m "feat(queries): add optional enabled flag to useSearchProfessionals and useDemands"
```

---

### Task 2: `CommandPalette`

**Files:**
- Create: `frontend/src/components/layout/CommandPalette.tsx`
- Test: `frontend/src/components/layout/CommandPalette.test.tsx`

**Interfaces:**
- Consumes: `Modal` from `frontend/src/components/ui/Modal.tsx`; `useCommandPaletteStore` (`state.open`, `state.closePalette`, `state.toggle`); `useAuthStore` (`state.user?.role`); `getNavItems(role)` from `navConfig.ts`; `useSearchProfessionals` and `useDemands` from Task 1 above.
- Produces: `CommandPalette` component (no props — owns its own `Ctrl/Cmd+K` global listener). Mounted once by `AppShell` (Phase 1g).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { CommandPalette } from './CommandPalette';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';
import { useSearchProfessionals } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';

vi.mock('../../features/landing/queries', () => ({
  useSearchProfessionals: vi.fn(),
}));

vi.mock('../../features/demands/queries', () => ({
  useDemands: vi.fn(),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useSearchProfessionals).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isFetching: false,
    } as never);
    vi.mocked(useDemands).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
    } as never);
  });

  it('não renderiza o diálogo quando fechada', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista itens de navegação do papel ao abrir', () => {
    useCommandPaletteStore.setState({ open: true });
    renderWithProviders(<CommandPalette />);
    expect(screen.getByRole('button', { name: /Buscar profissional/ })).toBeInTheDocument();
  });

  it('filtra a navegação pelo texto digitado', async () => {
    useCommandPaletteStore.setState({ open: true });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.type(screen.getByPlaceholderText(/Digite para buscar/), 'carteira');

    expect(screen.getByRole('button', { name: /Carteira/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contratos/ })).not.toBeInTheDocument();
  });

  it('fecha e navega ao clicar em um item de navegação', async () => {
    useCommandPaletteStore.setState({ open: true });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(screen.getByRole('button', { name: /Carteira/ }));

    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('abre a paleta com Ctrl+K quando fechada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.keyboard('{Control>}k{/Control}');

    await waitFor(() => expect(useCommandPaletteStore.getState().open).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/CommandPalette.test.tsx`
Expected: FAIL — `Cannot find module './CommandPalette'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useEffect, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';
import { getNavItems } from '../../lib/navConfig';
import { useSearchProfessionals } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CommandPalette(): JSX.Element {
  const open = useCommandPaletteStore((state) => state.open);
  const closePalette = useCommandPaletteStore((state) => state.closePalette);
  const toggle = useCommandPaletteStore((state) => state.toggle);
  const role = useAuthStore((state) => state.user?.role);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canSearch = debouncedQuery.trim().length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const navItems = useMemo(() => (role ? getNavItems(role) : []), [role]);
  const navMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? navItems.filter((item) => item.label.toLowerCase().includes(needle)) : navItems;
  }, [navItems, query]);

  const professionalResults = useSearchProfessionals(
    { q: debouncedQuery.trim() || undefined },
    { enabled: open && canSearch },
  );
  const demandResults = useDemands(undefined, { enabled: open && canSearch });

  const demandMatches = useMemo(() => {
    if (!canSearch || !demandResults.data) return [];
    const needle = debouncedQuery.trim().toLowerCase();
    return demandResults.data.items.filter((demand) => demand.title.toLowerCase().includes(needle)).slice(0, 5);
  }, [canSearch, demandResults.data, debouncedQuery]);

  function goTo(path: string) {
    closePalette();
    navigate(path);
  }

  return (
    <Modal open={open} onClose={closePalette} title="Buscar ou navegar">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Digite para buscar telas, profissionais ou demandas..."
        className="mb-4 w-full rounded-sm border border-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
      <div className="max-h-96 overflow-y-auto">
        {navMatches.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Navegação</p>
            <ul>
              {navMatches.map((item) => (
                <li key={item.to + item.label}>
                  <button
                    type="button"
                    onClick={() => goTo(item.to)}
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canSearch && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Profissionais</p>
            {professionalResults.isFetching ? (
              <p className="px-3 py-2 text-sm text-muted">Buscando...</p>
            ) : professionalResults.data && professionalResults.data.items.length > 0 ? (
              <ul>
                {professionalResults.data.items.slice(0, 5).map((professional) => (
                  <li key={professional.id}>
                    <button
                      type="button"
                      onClick={() => goTo(`/professionals/${professional.id}`)}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                    >
                      {professional.headline}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-muted">Nenhum profissional encontrado.</p>
            )}
          </div>
        )}

        {canSearch && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Demandas</p>
            {demandMatches.length > 0 ? (
              <ul>
                {demandMatches.map((demand) => (
                  <li key={demand.id}>
                    <button
                      type="button"
                      onClick={() => goTo(`/demands/${demand.id}`)}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                    >
                      {demand.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-muted">Nenhuma demanda encontrada.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/CommandPalette.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/CommandPalette.tsx frontend/src/components/layout/CommandPalette.test.tsx
git commit -m "feat(layout): add CommandPalette with Ctrl+K, nav filter, and professional/demand search"
```

---

Next: [plan_phase1g_appshell_and_integration.md](plan_phase1g_appshell_and_integration.md)
