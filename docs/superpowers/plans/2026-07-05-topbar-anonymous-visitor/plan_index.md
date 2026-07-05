# Topbar Consciente de Visitante Anônimo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir `NotificationBell` para não renderizar/disparar request pra visitante anônimo, e reconstruir `Topbar` para mostrar CTAs de Entrar/Cadastro, logo clicável, link de âncora "Como funciona" (só na Landing) e fundo transparente-até-rolar (só na Landing, só anônimo).

**Architecture:** `NotificationBell` ganha guard de auth (mesmo padrão de `ProfileMenu`/`Sidebar`/`MobileNav`). `useNotifications` ganha opção `enabled`. `Topbar` fica ciente de `user` (via `useAuthStore`) e `pathname` (via `useLocation`), renderizando dois estados visuais (logado vs anônimo) e usando `useScroll`/`useMotionValueEvent` do Framer Motion pra alternar o fundo na Landing. `HowItWorks` ganha um `id` de âncora.

**Tech Stack:** React 18/19 + TypeScript, React Router v6 (`useLocation`), Framer Motion (`useScroll`, `useMotionValueEvent`), TanStack Query, Zustand (`useAuthStore`), Vitest + Testing Library.

## Global Constraints

- Não criar novos primitivos em `components/ui`. Só reusar: `Button` (+`asChild`), `Avatar` (já usado por `ProfileMenu`, inalterado).
- Não alterar API/DTO/contrato/regra de negócio/Socket.IO/estado global (`authApi`, `stores/auth.ts` permanecem intocados, exceto leitura).
- Não alterar `AppShell.tsx`, `Sidebar.tsx`, `MobileNav.tsx`, rotas (`router/index.tsx`) — já corretos.
- Não criar comentários no código.
- Identificadores/arquivos em inglês; textos de UI em português.
- Toda nova constante de motion deve vir de `frontend/src/lib/motion.ts` — nenhuma nova constante de easing/duration/spring inline.
- Cada task termina com `npm test -- <arquivo>` (rodado em `frontend/`) passando antes do commit.
- Mensagens de commit em português, sem trailer `Co-Authored-By`.

## Ordem de execução

1. [plan_phase1_notification_bell.md](plan_phase1_notification_bell.md) — `useNotifications` ganha `enabled`; `NotificationBell` ganha guard de auth.
2. [plan_phase2_how_it_works_anchor.md](plan_phase2_how_it_works_anchor.md) — `HowItWorks` ganha `id="como-funciona"`.
3. [plan_phase3_topbar.md](plan_phase3_topbar.md) — `Topbar` reescrito: logo clicável, CTAs anônimo/logado, âncora condicional, fundo transparente-até-rolar.

Fases 1 e 2 são independentes entre si. Fase 3 depende de ambas (usa o guard da Fase 1 indiretamente ao renderizar `NotificationBell`, e a âncora `#como-funciona` da Fase 2).

Spec de origem: `docs/superpowers/specs/2026-07-05-topbar-anonymous-visitor-design.md`.
