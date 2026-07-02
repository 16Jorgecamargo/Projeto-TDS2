# Frontend Redesign — Fase 1: Design System + Shell/Nav — Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-02-frontend-redesign-phase1-design-system-shell-design.md`
**Design tokens source:** `frontend/DESIGN.md`

**Goal:** Replace the current bare `Layout.tsx` shell with a full app shell (topbar + role-aware collapsible sidebar + mobile drawer/bottom-tabs + command palette) built on a new Tailwind design-token system and a reusable UI primitives library, without touching any route, endpoint, DTO, or business logic.

**Architecture:** Bottom-up build order — tokens first, then standalone UI primitives (no dependents yet), then nav config/state, then the layout components that consume both, finishing with the `AppShell` swap in `App.tsx`. Every task after the tokens task can be reviewed and tested in isolation before the next task wires it in.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3, Zustand, React Router 6, TanStack Query, `@heroicons/react`, Vitest + Testing Library.

## Global Constraints

- Zero changes to `backend/`, to any API endpoint, DTO, auth flow, socket event, or database — every task touches only `frontend/src/`.
- Zero changes to existing route paths in `router/index.tsx` — only the layout component wrapping `<Outlet/>` changes.
- All new components consume the color tokens from `frontend/DESIGN.md` via Tailwind theme (`theme.extend.colors`) — never a raw hex/oklch string inline in a component.
- `prefers-reduced-motion: reduce` must degrade every transition/animation to instant or crossfade — no motion-only affordance.
- WCAG AA: visible focus ring on every interactive element, keyboard reachable, `aria-*` where semantics aren't implicit from the tag.
- No new runtime dependency beyond what's already in `frontend/package.json` (`@heroicons/react`, `zustand`, `react-router-dom`, `@tanstack/react-query` already present — reuse them).
- File pattern: every component ships with a colocated `<Name>.test.tsx` using `renderWithProviders` from `frontend/src/test/renderWithProviders.tsx` when the component needs router/query context, or plain `@testing-library/react` `render` otherwise.

## Execution Order

1. **[plan_phase1a_tokens_and_primitives.md](plan_phase1a_tokens_and_primitives.md)** — Design tokens (CSS vars + Tailwind theme + font) and the 7 stateless UI primitives: `Button`, `Badge`, `Skeleton`, `EmptyState`, `Avatar`, `Tooltip`, `Card`.
2. **[plan_phase1b_overlays.md](plan_phase1b_overlays.md)** — `Toast` (+ provider), `Modal`, `Drawer`. These are portal-based overlay primitives consumed by later layout components.
3. **[plan_phase1c_nav_and_stores.md](plan_phase1c_nav_and_stores.md)** — `navConfig.ts` (role → nav items), `sidebarStore` (collapse state), `commandPaletteStore` (open/close state). Pure logic, no rendering.
4. **[plan_phase1d_topbar.md](plan_phase1d_topbar.md)** — `Topbar` + `ProfileMenu`, wiring in the already-existing `NotificationBell`.
5. **[plan_phase1e_sidebar_and_mobilenav.md](plan_phase1e_sidebar_and_mobilenav.md)** — `Sidebar` (desktop, collapsible) + `MobileNav` (drawer + bottom tabs).
6. **[plan_phase1f_command_palette.md](plan_phase1f_command_palette.md)** — `CommandPalette`: navigation + debounced cross-entity search (professionals/demands/contracts), global `Ctrl/Cmd+K` shortcut.
7. **[plan_phase1g_appshell_and_integration.md](plan_phase1g_appshell_and_integration.md)** — `AppShell` composing everything, swap into `App.tsx`, `ToastProvider` mounted globally, final full-suite verification (`typecheck`, `lint`, `test`, `build`).

Each file is self-contained: file paths, full code, and commit steps for its tasks. Work through the files in order — later files assume the components/stores from earlier files exist.
