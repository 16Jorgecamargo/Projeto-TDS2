# Redesign de LandingPage e SearchPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir `LandingPage` e `SearchPage` via composição de primitivos existentes de `components/ui`, corrigindo gaps funcionais (URL como fonte única de verdade, debounce, validação unificada, paginação real, retry em erro, ícone por categoria) e expandindo o conteúdo da Landing com seções reais/estáticas (stats, profissionais em destaque, como funciona, depoimentos, FAQ, CTA de fechamento).

**Architecture:** Componentes novos de composição (não primitivos) em `frontend/src/features/landing/components/`: `PageHeader`, `Pagination`, `FilterBar` (substitui `SearchFilters`), `SearchToolbar`, `TrustStats`, `FeaturedProfessionals`, `HowItWorks`, `Testimonials`, `Faq`, `ClosingCta`. `SearchPage` passa a ler/escrever todos os filtros (`q`,`city`,`state`,`categoryId`,`sort`,`onlyAvailable`,`page`) via `useSearchParams`. `LandingPage` compõe hero existente + seções novas.

**Tech Stack:** React 18/19 + TypeScript, React Router v6 (`useSearchParams`), React Hook Form + Zod (só em `SearchBar`, mantido), TanStack Query, Framer Motion (`motion`, `AnimatePresence`, `useSpring`/`useTransform`), lucide-react, Vitest + Testing Library.

## Global Constraints

- Não criar novos primitivos em `components/ui`. Só reusar: `Card` (+`interactive`/`flat`), `Button` (+`asChild`), `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Drawer`, `ProfessionalCard` (feature `professional`, já existente).
- Não alterar API/DTO/contrato/regra de negócio/Socket.IO/estado global (`landingApi`, `authApi`, `stores/*` permanecem intocados, exceto leitura). Exceção documentada: `searchFormSchema` (`frontend/src/features/landing/schemas.ts`) ganha um preprocess em `categoryId` (bugfix de validação client-side, não é contrato de API — ver Fase 2).
- Não criar comentários no código (regra global do usuário).
- Identificadores/arquivos em inglês; textos de UI em português.
- Toda nova constante de motion deve vir de `frontend/src/lib/motion.ts` — nenhuma nova constante de easing/duration/spring inline.
- Nenhuma nova chamada de API/endpoint novo no backend — toda "correção funcional" usa dados já existentes (`total`, `ratingAverage`, reviews por profissional).
- Cada task termina com `npm test -- <arquivo>` (rodado em `frontend/`) passando antes do commit.
- Mensagens de commit em português, sem trailer `Co-Authored-By`.

## Ordem de execução

1. [plan_phase1_foundation.md](plan_phase1_foundation.md) — `getCategoryIcon` (util), `PageHeader`, `Pagination`.
2. [plan_phase2_filterbar_toolbar.md](plan_phase2_filterbar_toolbar.md) — `FilterBar` (substitui `SearchFilters`, debounce + validação unificada) e `SearchToolbar`.
3. [plan_phase3_queries_results.md](plan_phase3_queries_results.md) — `useFeaturedProfessionals`/`useTotalProfessionalsCount` em `queries.ts` + `ProfessionalResults` (retry, skeleton dinâmico, paginação).
4. [plan_phase4_search_page.md](plan_phase4_search_page.md) — `SearchPage` reescrita (URL como fonte única de verdade, composição de `PageHeader`/`SearchToolbar`/`FilterBar`/`Drawer`/`ProfessionalResults`).
5. [plan_phase5_category_grid.md](plan_phase5_category_grid.md) — `CategoryGrid` com ícone por categoria via `getCategoryIcon`.
6. [plan_phase6_landing_sections.md](plan_phase6_landing_sections.md) — `TrustStats`, `FeaturedProfessionals`, `HowItWorks`, `Testimonials`, `Faq`, `ClosingCta`.
7. [plan_phase7_landing_page.md](plan_phase7_landing_page.md) — `LandingPage` reescrita (composição final de todas as seções) + verificação da suíte completa.

Fases 1-3 são independentes entre si. Fase 4 depende de 1-3. Fase 5 é independente (só depende do util da Fase 1). Fase 6 depende de 3 (usa `useFeaturedProfessionals`/`useTotalProfessionalsCount`). Fase 7 depende de todas as anteriores (5 e 6 no mínimo).

Spec de origem: `docs/superpowers/specs/2026-07-05-landing-search-redesign-design.md`.
