# Phase 1g: AppShell + Router Integration + Final Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on every prior phase file (1a-1f) — this is where all the pieces get composed and swapped into the live app.

---

### Task 1: `AppShell`

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Test: `frontend/src/components/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: `Topbar` (Phase 1d), `Sidebar` and `MobileNav` (Phase 1e), `CommandPalette` (Phase 1f), `ToastProvider` (Phase 1b).
- Produces: `AppShell` component, `AppShellProps` (`children: ReactNode`). Consumed by `App.tsx` (Task 3 below), replacing `Layout`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { AppShell } from './AppShell';
import { useAuthStore } from '../../stores/auth';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza o conteúdo filho dentro do main', () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo da página</p>
      </AppShell>,
    );
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
  });

  it('renderiza o Topbar', () => {
    renderWithProviders(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx`
Expected: FAIL — `Cannot find module './AppShell'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useState, type JSX, type ReactNode } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { ToastProvider } from '../ui/Toast';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onOpenMore={() => setMobileNavOpen(true)}
      />
      <CommandPalette />
      <ToastProvider />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx frontend/src/components/layout/AppShell.test.tsx
git commit -m "feat(layout): add AppShell composing Topbar, Sidebar, MobileNav, CommandPalette, ToastProvider"
```

---

### Task 2: `ChatIndexPage` placeholder

**Files:**
- Create: `frontend/src/features/chat/pages/ChatIndexPage.tsx`
- Test: `frontend/src/features/chat/pages/ChatIndexPage.test.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `frontend/src/components/ui/EmptyState.tsx`.
- Produces: `ChatIndexPage` component (default export + named export), mounted at the new `/chat` route (Task 4 below).

The sidebar/mobile-nav "Chat" item (from `navConfig.ts`, Phase 1c) points at `/chat`, but today only `/chat/:roomId` exists (see `frontend/src/router/index.tsx`) — there is no room list endpoint to build a real inbox from yet (Fase 5 covers Chat properly). This task adds the minimal honest destination so the nav item never 404s, using only the existing `EmptyState` primitive — no new API call, no new endpoint.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatIndexPage } from './ChatIndexPage';

describe('ChatIndexPage', () => {
  it('mostra o estado vazio explicando como abrir uma conversa', () => {
    render(<ChatIndexPage />);
    expect(screen.getByText('Nenhuma conversa selecionada')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/chat/pages/ChatIndexPage.test.tsx`
Expected: FAIL — `Cannot find module './ChatIndexPage'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';

export function ChatIndexPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}

export default ChatIndexPage;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/chat/pages/ChatIndexPage.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/chat/pages/ChatIndexPage.tsx frontend/src/features/chat/pages/ChatIndexPage.test.tsx
git commit -m "feat(chat): add ChatIndexPage placeholder for the new /chat nav destination"
```

---

### Task 3: Swap `Layout` for `AppShell` in `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Delete: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `AppShell` from Task 1.

`Layout.tsx` is only imported by `App.tsx` (verified: `grep -rln "components/Layout" frontend/src` returns exactly one file). Deleting it is safe.

- [ ] **Step 1: Update `App.tsx`**

Replace the full file content with:

```tsx
import { useEffect, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { bootstrapSession } from './features/auth/bootstrap';

export function App(): JSX.Element {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

- [ ] **Step 2: Update `App.test.tsx` to provide the QueryClient context `AppShell` now needs**

Replace the full file content with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

vi.mock('./features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('App shell', () => {
  it('renders the app shell around routed content', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<App />}>
              <Route path="/" element={<div>home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Delete the old `Layout.tsx`**

Run: `cd frontend && rm src/components/Layout.tsx`

- [ ] **Step 4: Run the App test to verify it passes**

Run: `cd frontend && npx vitest run src/App.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git rm frontend/src/components/Layout.tsx
git commit -m "feat(layout): swap Layout for AppShell as the router's layout component"
```

---

### Task 4: Add the `/chat` route

**Files:**
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `ChatIndexPage` from Task 2.

- [ ] **Step 1: Import `ChatIndexPage`**

In `frontend/src/router/index.tsx`, add near the other chat import:

```ts
import { ChatIndexPage } from '../features/chat/pages/ChatIndexPage';
```

(keep the existing `import { ChatPage } from '../features/chat/pages/ChatPage';` line as-is)

- [ ] **Step 2: Add the route**

Inside the `element: <ProtectedRoute />` block's `children` array (the "any authenticated role" group), add the new route immediately before the existing `{ path: '/chat/:roomId', element: <ChatPage /> }` entry:

```ts
{ path: '/chat', element: <ChatIndexPage /> },
{ path: '/chat/:roomId', element: <ChatPage /> },
```

- [ ] **Step 3: Run the full test suite to confirm the route wiring didn't break anything**

Run: `cd frontend && npm run test`
Expected: PASS (all suites)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.tsx
git commit -m "feat(router): add /chat index route pointing to ChatIndexPage"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: exits 0

- [ ] **Step 3: Full test suite**

Run: `cd frontend && npm run test`
Expected: PASS, every suite green (existing feature suites + every suite added in this plan)

- [ ] **Step 4: Production build**

Run: `cd frontend && npm run build`
Expected: exits 0

- [ ] **Step 5: Manual smoke check (dev server)**

Run: `cd frontend && npm run dev`, open the app in a browser, log in as each of the three seeded roles (client/professional/admin) if seed data is available, and confirm:
- Topbar, sidebar (desktop) and bottom tabs (mobile viewport, e.g. browser dev tools at 375px width) all render with the correct role-specific nav items from `navConfig.ts`.
- `Ctrl+K` / `Cmd+K` opens the command palette from anywhere; typing filters nav items; typing a professional/demand name (2+ chars) surfaces matching results; clicking a result navigates and closes the palette.
- Collapsing the sidebar persists across a page reload (uses `localStorage`).
- No route that existed before this plan (per `docs/telas.md`) has changed path or moved behind a different guard.

Stop the dev server (`Ctrl+C`) once confirmed. No commit for this step — it's a verification gate, not a code change.

---

This completes Fase 1. Next: brainstorm Fase 2 (Dashboard Cliente + Demandas + Busca + Perfil Público) — see `docs/superpowers/specs/2026-07-02-frontend-redesign-phase1-design-system-shell-design.md` for the full fase ordering.
