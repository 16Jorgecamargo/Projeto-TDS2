# Phase 1c: Nav Config + Sidebar/Command-Palette Stores

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. No dependency on Phase 1a/1b files — pure logic, no rendering.

**Route-mapping note (read before Task 1):** several nav items below point to the *same* existing route as a sibling item in the same role's list (e.g. admin's Dashboard/Denúncias/Disputas/Usuários all point to `/admin`, because `AdminDashboardPage` currently renders reports+disputes on one page and there is no `/admin/users` route yet; professional's Portfólio/Perfil and Disponibilidade both point to `/professional/dashboard` for the same reason). This is intentional and documented inline in `navConfig.ts` — it keeps every nav item honest (no dead links) without inventing new routes or backend calls in this phase. Fases 3 (Profissional) and 6 (Admin) split these pages into dedicated routes and will update `navConfig.ts` then.

---

### Task 1: `navConfig.ts`

**Files:**
- Create: `frontend/src/lib/navConfig.ts`
- Test: `frontend/src/lib/navConfig.test.ts`

**Interfaces:**
- Consumes: `Role` type from `frontend/src/stores/auth.ts` (`export type Role = 'client' | 'professional' | 'admin'`).
- Produces: `NavItem` type (`{ label: string; to: string; icon: ComponentType<SVGProps<SVGSVGElement>> }`), `getNavItems(role: Role): NavItem[]`, `getMobilePrimaryItems(role: Role): NavItem[]` (first 4), `getMobileOverflowItems(role: Role): NavItem[]` (the rest). Consumed by `Sidebar` (Phase 1e), `MobileNav` (Phase 1e), and `CommandPalette` (Phase 1f).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getNavItems, getMobilePrimaryItems, getMobileOverflowItems } from './navConfig';

describe('navConfig', () => {
  it('retorna 8 itens para o cliente', () => {
    expect(getNavItems('client')).toHaveLength(8);
  });

  it('retorna 9 itens para o profissional', () => {
    expect(getNavItems('professional')).toHaveLength(9);
  });

  it('retorna 6 itens para o admin', () => {
    expect(getNavItems('admin')).toHaveLength(6);
  });

  it('separa os 4 primeiros itens como prioridade mobile do cliente', () => {
    const primary = getMobilePrimaryItems('client');
    expect(primary.map((item) => item.label)).toEqual([
      'Dashboard',
      'Buscar profissional',
      'Minhas demandas',
      'Contratos',
    ]);
  });

  it('coloca o restante no overflow mobile do cliente', () => {
    const overflow = getMobileOverflowItems('client');
    expect(overflow.map((item) => item.label)).toEqual([
      'Chat',
      'Carteira',
      'Notificações',
      'Configurações',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/navConfig.test.ts`
Expected: FAIL — `Cannot find module './navConfig'`

- [ ] **Step 3: Write the implementation**

```ts
import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  BellIcon,
  Cog6ToothIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UsersIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import type { Role } from '../stores/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Client: every item maps to its own existing route today.
const clientNav: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: HomeIcon },
  { label: 'Buscar profissional', to: '/search', icon: MagnifyingGlassIcon },
  { label: 'Minhas demandas', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
  { label: 'Notificações', to: '/notifications', icon: BellIcon },
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
];

// Professional: "Portfólio/Perfil" and "Disponibilidade" both point at
// /professional/dashboard because that single page currently renders both
// sections (ProfileForm+PortfolioManager+AvailabilityManager+ServiceAreaManager).
// Fase 3 splits them into dedicated routes.
const professionalNav: NavItem[] = [
  { label: 'Dashboard', to: '/professional/dashboard', icon: HomeIcon },
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Portfólio/Perfil', to: '/professional/dashboard', icon: BriefcaseIcon },
  { label: 'Disponibilidade', to: '/professional/dashboard', icon: CalendarDaysIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
  { label: 'Notificações', to: '/notifications', icon: BellIcon },
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
];

// Admin: Dashboard/Denúncias/Disputas/Usuários all point at /admin because
// AdminDashboardPage currently renders reports+disputes on one page and
// there is no dedicated user-management route yet. Fase 6 splits them.
const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: ChartBarIcon },
  { label: 'Denúncias', to: '/admin', icon: ExclamationTriangleIcon },
  { label: 'Disputas', to: '/admin', icon: ScaleIcon },
  { label: 'Usuários', to: '/admin', icon: UsersIcon },
  { label: 'Contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Pagamentos/Carteira', to: '/wallet', icon: CreditCardIcon },
];

const navByRole: Record<Role, NavItem[]> = {
  client: clientNav,
  professional: professionalNav,
  admin: adminNav,
};

const MOBILE_PRIMARY_COUNT = 4;

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role];
}

export function getMobilePrimaryItems(role: Role): NavItem[] {
  return getNavItems(role).slice(0, MOBILE_PRIMARY_COUNT);
}

export function getMobileOverflowItems(role: Role): NavItem[] {
  return getNavItems(role).slice(MOBILE_PRIMARY_COUNT);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/navConfig.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/navConfig.ts frontend/src/lib/navConfig.test.ts
git commit -m "feat(nav): adiciona navConfig por papel"
```

---

### Task 2: `sidebarStore`

**Files:**
- Create: `frontend/src/stores/sidebar.ts`
- Test: `frontend/src/stores/sidebar.test.ts`

**Interfaces:**
- Produces: `useSidebarStore` (Zustand store persisted to `localStorage` under key `sidebar-collapsed`), shape `{ collapsed: boolean; toggle: () => void; setCollapsed: (collapsed: boolean) => void }`. Consumed by `Sidebar` (Phase 1e).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSidebarStore } from './sidebar';

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false });
    localStorage.clear();
  });

  it('inicia expandida', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('alterna o estado ao chamar toggle', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('define o estado diretamente com setCollapsed', () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/sidebar.test.ts`
Expected: FAIL — `Cannot find module './sidebar'`

- [ ] **Step 3: Write the implementation**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: 'sidebar-collapsed' },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/sidebar.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/sidebar.ts frontend/src/stores/sidebar.test.ts
git commit -m "feat(nav): adiciona sidebarStore persistido"
```

---

### Task 3: `commandPaletteStore`

**Files:**
- Create: `frontend/src/stores/commandPalette.ts`
- Test: `frontend/src/stores/commandPalette.test.ts`

**Interfaces:**
- Produces: `useCommandPaletteStore` (Zustand store), shape `{ open: boolean; openPalette: () => void; closePalette: () => void; toggle: () => void }`. Consumed by `Topbar` (Phase 1d, the `Ctrl+K` trigger button) and `CommandPalette` (Phase 1f, the global keyboard shortcut listener + the modal's own open state).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandPaletteStore } from './commandPalette';

describe('useCommandPaletteStore', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it('inicia fechada', () => {
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('abre com openPalette', () => {
    useCommandPaletteStore.getState().openPalette();
    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it('fecha com closePalette', () => {
    useCommandPaletteStore.getState().openPalette();
    useCommandPaletteStore.getState().closePalette();
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('alterna com toggle', () => {
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().open).toBe(true);
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/commandPalette.test.ts`
Expected: FAIL — `Cannot find module './commandPalette'`

- [ ] **Step 3: Write the implementation**

```ts
import { create } from 'zustand';

interface CommandPaletteState {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  openPalette: () => set({ open: true }),
  closePalette: () => set({ open: false }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/commandPalette.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/commandPalette.ts frontend/src/stores/commandPalette.test.ts
git commit -m "feat(nav): adiciona commandPaletteStore"
```

---

Next: [plan_phase1d_topbar.md](plan_phase1d_topbar.md)
