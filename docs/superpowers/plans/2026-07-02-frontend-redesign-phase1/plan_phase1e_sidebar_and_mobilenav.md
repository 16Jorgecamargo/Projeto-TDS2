# Phase 1e: Sidebar (desktop) + MobileNav (drawer + bottom tabs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on Phase 1a (tokens), Phase 1b (`Drawer`), Phase 1c (`navConfig`, `sidebarStore`).

---

### Task 1: `Sidebar`

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (`state.user?.role`), `useSidebarStore` (`state.collapsed`, `state.toggle`), `getNavItems(role)` from `navConfig.ts`, `Tooltip` from `frontend/src/components/ui/Tooltip.tsx`, `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Sidebar` component (no props). Consumed by `AppShell` (Phase 1g).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useSidebarStore.setState({ collapsed: false });
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza os itens de navegação do papel do cliente', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('link', { name: /Buscar profissional/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carteira/ })).toBeInTheDocument();
  });

  it('esconde os rótulos de texto quando colapsada', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    useSidebarStore.setState({ collapsed: true });
    renderWithProviders(<Sidebar />);
    expect(screen.queryByText('Buscar profissional')).not.toBeInTheDocument();
  });

  it('alterna o estado ao clicar no botão de colapsar', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(useSidebarStore.getState().collapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: FAIL — `Cannot find module './Sidebar'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';
import { getNavItems } from '../../lib/navConfig';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/utils';

export function Sidebar(): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);

  if (!role) return null;

  const items = getNavItems(role);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-surface bg-bg py-4 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Navegação principal">
        {items.map((item) => {
          const link = (
            <NavLink
              to={item.to}
              end={item.to === '/'}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-surface text-primary' : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.to + item.label} label={item.label}>
              {link}
            </Tooltip>
          ) : (
            <span key={item.to + item.label}>{link}</span>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="mx-2 mt-2 flex items-center justify-center rounded-sm p-2 text-muted hover:bg-surface"
      >
        {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.test.tsx
git commit -m "feat(layout): adiciona Sidebar colapsavel por papel"
```

---

### Task 2: `MobileNav`

**Files:**
- Create: `frontend/src/components/layout/MobileNav.tsx`
- Test: `frontend/src/components/layout/MobileNav.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (`state.user?.role`), `getMobilePrimaryItems(role)` / `getNavItems(role)` from `navConfig.ts`, `Drawer` from `frontend/src/components/ui/Drawer.tsx`, `cn` from `frontend/src/lib/utils.ts`.
- Produces: `MobileNav` component, `MobileNavProps` (`open: boolean`, `onClose: () => void`, `onOpenMore: () => void`). Consumed by `AppShell` (Phase 1g), which owns the shared `open` boolean (both the Topbar's hamburger button and this component's own "Mais" tab open the same drawer instance).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '../../stores/auth';

describe('MobileNav', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('não renderiza nada sem usuário logado', () => {
    const { container } = renderWithProviders(
      <MobileNav open={false} onClose={vi.fn()} onOpenMore={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza os 4 itens primários nas abas inferiores', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav open={false} onClose={vi.fn()} onOpenMore={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contratos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mais/ })).toBeInTheDocument();
  });

  it('chama onOpenMore ao clicar em Mais', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    const onOpenMore = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<MobileNav open={false} onClose={vi.fn()} onOpenMore={onOpenMore} />);

    await user.click(screen.getByRole('button', { name: /Mais/ }));

    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('mostra o drawer com todos os itens quando open=true', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<MobileNav open onClose={vi.fn()} onOpenMore={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getAllByText('Carteira').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/MobileNav.test.tsx`
Expected: FAIL — `Cannot find module './MobileNav'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { getMobilePrimaryItems, getNavItems } from '../../lib/navConfig';
import { Drawer } from '../ui/Drawer';
import { cn } from '../../lib/utils';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onOpenMore: () => void;
}

export function MobileNav({ open, onClose, onOpenMore }: MobileNavProps): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);

  if (!role) return null;

  const primaryItems = getMobilePrimaryItems(role);
  const allItems = getNavItems(role);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-surface bg-bg md:hidden"
      >
        {primaryItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold',
                isActive ? 'text-primary' : 'text-muted',
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-muted"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
          Mais
        </button>
      </nav>
      <Drawer open={open} onClose={onClose} title="Menu" side="left">
        <nav className="flex flex-col gap-1" aria-label="Menu completo">
          {allItems.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold',
                  isActive ? 'bg-surface text-primary' : 'text-ink hover:bg-surface',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/MobileNav.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/MobileNav.tsx frontend/src/components/layout/MobileNav.test.tsx
git commit -m "feat(layout): adiciona MobileNav (abas inferiores + drawer completo)"
```

---

Next: [plan_phase1f_command_palette.md](plan_phase1f_command_palette.md)
