# Frontend Redesign — Fase 2: Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-02-frontend-redesign-phase2-client-demands-search-profile-design.md`
**Depends on:** Fase 1 (Design System + Shell/Nav) and the Upload de Imagens feature — both already merged to `master`.

**Goal:** Redesign Dashboard Cliente, Busca, Perfil Público, e Demandas (lista/detalhe/publicar), and build the two greenfield frontend features (Favoritos, Avaliações) their backends already support but no UI consumes yet.

**Architecture:** Two new independent feature modules first (favorites, reviews — no dependency on anything else in this plan), then four screen areas built on top of them plus the existing Fase 1 primitives and the Upload feature's `ImageUpload` component. Screen areas are independent of each other and can be worked in any order after the feature modules land.

**Tech Stack:** React 19, TypeScript, TanStack Query 5, Zustand 5, React Hook Form + Zod, Tailwind (Fase 1 tokens), `@heroicons/react`, Vitest + Testing Library.

## Global Constraints

- Zero changes to `backend/`, to any API endpoint, DTO, auth flow, or database — every task touches only `frontend/src/`.
- Zero changes to existing route paths already in `router/index.tsx` — only new routes/branching may be added (this plan adds none; the client-dashboard swap happens by branching what renders at the existing `/` path based on auth state and role, not by adding a path).
- All new components consume color tokens via Tailwind theme utility classes already defined in Fase 1 (`bg-primary`, `bg-accent`, `bg-surface`, `text-ink`, `text-muted`, etc.) — never a raw hex/oklch string inline.
- Every new list/data view uses `Skeleton` during `isPending` and `EmptyState` when the result set is empty — no bare "Carregando..." text, no blank screen.
- `Badge` only has two tones today (`neutral`, `urgent`) — reuse those two; do not invent a third tone without extending `frontend/src/components/ui/Badge.tsx` explicitly as its own task.
- No new runtime dependency beyond what's already in `frontend/package.json` (`@heroicons/react`, `@tanstack/react-query`, `axios`, `zustand`, `react-hook-form`, `zod` already present).
- `GET /favorites` and `GET /professionals/:id/reviews` return only IDs/raw fields — no denormalized professional name/photo on favorites. Any UI needing a favorited professional's display info makes a second call (`usePublicProfile`) per item; this is an accepted N+1 given the expected small favorites-list size (documented in the spec).
- `DELETE /favorites/:id` — despite the `:id` param name, the backend deletes by `professional_id` (verified against `social.service.ts`/`social.routes.test.ts`), so the frontend client calls `DELETE /favorites/{professionalId}`, not a favorite row id.
- File pattern: every component ships with a colocated `<Name>.test.tsx`/`.test.ts` using `renderWithProviders` from `frontend/src/test/renderWithProviders.tsx` when the component needs router/query context, or plain `@testing-library/react`/`vitest` otherwise.

## Simplificação assumida em relação à spec

A spec descreve um widget "Últimos orçamentos" separado, agregando `useDemandQuotes` por demanda aberta. `plan_phase_b_dashboard.md` (Task 4) **não** implementa esse widget isoladamente — geraria uma chamada `useDemandQuotes` por demanda aberta (N+1) só para exibir uma contagem, sem endpoint de agregação (mesma limitação documentada na spec para o dashboard como um todo). O `DashboardDemandsWidget` cobre a visibilidade de demandas abertas; a contagem de orçamentos por demanda já é visível ao entrar no detalhe de cada uma. Se um resumo agregado de orçamentos for realmente necessário, é candidato a uma iteração futura pequena (não nesta fase).

## Execution Order

1. **[plan_phase_a_favorites_reviews.md](plan_phase_a_favorites_reviews.md)** — Tasks 1-2: Favorites feature (api + queries + `FavoriteButton`), Reviews feature (api + queries + `ReviewList`). No dependency on anything else in this plan; both screen areas below depend on these.
2. **[plan_phase_b_dashboard.md](plan_phase_b_dashboard.md)** — Tasks 3-5: home routing split (client dashboard vs public landing), dashboard widgets, `ClientDashboardPage` composition.
3. **[plan_phase_c_search.md](plan_phase_c_search.md)** — Tasks 6-7: rich `ProfessionalCard` v2 (depends on Phase A's `FavoriteButton`), search filters sidebar + sort + page composition.
4. **[plan_phase_d_profile.md](plan_phase_d_profile.md)** — Tasks 8-10: profile header/actions (depends on Phase A), portfolio gallery + availability grid, reviews section (depends on Phase A) + page composition.
5. **[plan_phase_e_demands.md](plan_phase_e_demands.md)** — Tasks 11-13: demand photos (depends on the Upload feature's `ImageUpload`) + `DemandCard` v2, chat link + quote card rework, `DemandDetailPage` composition + list empty state.

Each file is self-contained: file paths, full code, and commit steps for its tasks. Phase B/C/D/E each independently depend only on Phase A (and, for Phase E, the already-merged Upload feature) — they do not depend on each other.
