# Phase 1d: Topbar + ProfileMenu

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on Phase 1a (tokens), Phase 1c (`commandPaletteStore`), and the existing `frontend/src/features/notifications/components/NotificationBell.tsx`.

---

### Task 1: Widen `AuthUser` to type the name/email already present at runtime

**Files:**
- Modify: `frontend/src/stores/auth.ts`

**Interfaces:**
- Produces: `AuthUser` now includes optional `name?: string` and `email?: string`.

`authApi.login/register/refresh` (see `frontend/src/features/auth/api.ts`) already resolve `PublicUser` (`{ id, email, name, role }`) and every call site (`frontend/src/features/auth/queries.ts`, `frontend/src/features/auth/bootstrap.ts`) passes that full object into `setAuth`. `AuthUser`'s current type (`{ id, role }`) is just narrower than what's actually stored at runtime — this task only widens the TypeScript type to match reality. No endpoint, DTO, or auth flow changes; nothing here alters what's sent over the wire or how tokens are handled.

- [ ] **Step 1: Widen the type**

In `frontend/src/stores/auth.ts`, change:

```ts
export type AuthUser = { id: string; role: Role };
```

to:

```ts
export type AuthUser = { id: string; role: Role; name?: string; email?: string };
```

- [ ] **Step 2: Run the existing auth store tests to confirm nothing broke**

Run: `cd frontend && npx vitest run src/stores/auth.test.ts`
Expected: PASS (all existing tests, unchanged)

- [ ] **Step 3: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/auth.ts
git commit -m "feat(auth): amplia tipo AuthUser para incluir name/email ja retornados pela API"
```

---

### Task 2: `ProfileMenu`

**Files:**
- Create: `frontend/src/components/layout/ProfileMenu.tsx`
- Test: `frontend/src/components/layout/ProfileMenu.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore` from `frontend/src/stores/auth.ts` (`state.user: AuthUser | null`, `state.clear: () => void`); `Avatar` from `frontend/src/components/ui/Avatar.tsx`.
- Produces: `ProfileMenu` component (no props — reads auth state directly). Consumed by `Topbar` (this file, Task 3).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ProfileMenu } from './ProfileMenu';
import { useAuthStore } from '../../stores/auth';

describe('ProfileMenu', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('não renderiza nada quando não há usuário logado', () => {
    renderWithProviders(<ProfileMenu />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra o nome e o papel do usuário ao abrir o menu', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client', name: 'Maria Souza' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<ProfileMenu />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });

  it('limpa a sessão ao clicar em Sair', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional', name: 'João' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<ProfileMenu />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /sair/i }));

    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/ProfileMenu.test.tsx`
Expected: FAIL — `Cannot find module './ProfileMenu'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { Avatar } from '../ui/Avatar';

const roleLabels: Record<string, string> = {
  client: 'Cliente',
  professional: 'Profissional',
  admin: 'Administrador',
};

export function ProfileMenu(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.name ?? roleLabels[user.role];

  function handleLogout() {
    clear();
    setOpen(false);
    navigate('/login');
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-sm p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Avatar name={displayName} size="sm" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-dropdown mt-2 w-56 rounded-md bg-bg py-2 shadow-modal">
          <div className="px-4 py-2">
            <p className="text-sm font-semibold text-ink">{displayName}</p>
            <p className="text-xs text-muted">{roleLabels[user.role]}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Configurações
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/ProfileMenu.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/ProfileMenu.tsx frontend/src/components/layout/ProfileMenu.test.tsx
git commit -m "feat(layout): adiciona ProfileMenu"
```

---

### Task 3: `Topbar`

**Files:**
- Create: `frontend/src/components/layout/Topbar.tsx`
- Test: `frontend/src/components/layout/Topbar.test.tsx`

**Interfaces:**
- Consumes: `useCommandPaletteStore` from `frontend/src/stores/commandPalette.ts` (`state.openPalette: () => void`); `NotificationBell` from `frontend/src/features/notifications/components/NotificationBell.tsx` (existing, no props); `ProfileMenu` from this file's Task 2.
- Produces: `Topbar` component, `TopbarProps` (`onOpenMobileNav: () => void`). Consumed by `AppShell` (Phase 1g).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';
import { useCommandPaletteStore } from '../../stores/commandPalette';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it('renderiza o título e o botão de busca', () => {
    renderWithProviders(<Topbar onOpenMobileNav={vi.fn()} />);
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Buscar ou navegar...')).toBeInTheDocument();
  });

  it('abre a command palette ao clicar na busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Topbar onOpenMobileNav={vi.fn()} />);

    await user.click(screen.getByText('Buscar ou navegar...'));

    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it('chama onOpenMobileNav ao clicar no botão de menu', async () => {
    const onOpenMobileNav = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Topbar onOpenMobileNav={onOpenMobileNav} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    expect(onOpenMobileNav).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/Topbar.test.tsx`
Expected: FAIL — `Cannot find module './Topbar'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { ProfileMenu } from './ProfileMenu';

export interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps): JSX.Element {
  const openPalette = useCommandPaletteStore((state) => state.openPalette);

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
        className="rounded-sm p-2 hover:bg-surface md:hidden"
      >
        <Bars3Icon className="h-6 w-6 text-ink" />
      </button>
      <Link to="/" className="shrink-0 text-lg font-bold text-ink">
        Services Marketplace
      </Link>
      <button
        type="button"
        onClick={openPalette}
        className="flex flex-1 items-center gap-2 rounded-sm border border-surface px-3 py-2 text-left text-sm text-muted hover:border-primary"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="flex-1">Buscar ou navegar...</span>
        <kbd className="rounded-sm bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted">Ctrl K</kbd>
      </button>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/Topbar.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Topbar.tsx frontend/src/components/layout/Topbar.test.tsx
git commit -m "feat(layout): adiciona Topbar com gatilho da command palette e NotificationBell"
```

---

Next: [plan_phase1e_sidebar_and_mobilenav.md](plan_phase1e_sidebar_and_mobilenav.md)
