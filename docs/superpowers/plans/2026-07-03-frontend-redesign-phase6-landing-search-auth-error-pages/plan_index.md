# Fase 6 do Redesign Frontend — Landing, Busca, Autenticação, Páginas de Erro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restilizar as últimas áreas do frontend que faltavam (Landing, Busca, 5 telas de Autenticação, páginas 403/404) usando exclusivamente os tokens e primitivos de UI já existentes do design system, fechando o redesign completo do frontend (Fases 1-6).

**Architecture:** Cada área é um conjunto pequeno de arquivos dentro de `frontend/src/features/{auth,landing}/` e `frontend/src/pages/`. Nenhuma API nova, nenhum schema novo — restyle puro, mesmo conteúdo/comportamento de hoje. `AuthField` é um componente compartilhado por todas as 5 páginas de Auth e é restilizado primeiro (Task 1), já que as páginas dependem dele.

**Tech Stack:** React 19, TypeScript, TanStack Query, react-hook-form + zod, Tailwind (tokens do design system da Fase 1: `Card`, `Button`, `EmptyState`), React Router, Vitest + Testing Library.

## Global Constraints

- Sem comentários no código.
- Identificadores e nomes de arquivo em inglês; copy de UI em português.
- Commits em português, sem trailer `Co-Authored-By`.
- Sem PR — merge direto na `master` (dev solo).
- Sem dependências novas de runtime.
- Apenas os primitivos de UI já existentes (`Card`, `Button`, `EmptyState`) — nenhum componente novo de design system nesta fase.
- Nenhuma mudança de endpoint/schema no backend nesta fase.
- Restyle puro: mesmo conteúdo, textos e comportamento de hoje — sem redesenho de fluxo ou copy nova.
- Páginas de Auth e páginas de erro (403/404) continuam fora do `AppShell` (sem topbar/sidebar/nav).
- `<select>` nativo é mantido (sem componente de select no design system) — só ganha borda/cor tokenizada.

## Ordem de execução

1. **`plan_phase_a_auth_field.md`** (Task 1) — restyle de `AuthField.tsx`, componente compartilhado por todas as páginas de Auth.
2. **`plan_phase_b_auth_pages.md`** (Tasks 2-6) — restyle de `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, todas envolvendo o formulário num `Card` centralizado.
3. **`plan_phase_c_landing_search.md`** (Tasks 7-10) — restyle de `SearchBar`, `CategoryGrid`, `LandingPage`, e do `<select>` de ordenação em `SearchPage`.
4. **`plan_phase_d_error_pages.md`** (Tasks 11-12) — nova página real para `/forbidden` (403) usando `EmptyState`, e restyle de `NotFound.tsx` (404) no mesmo padrão.
5. **`plan_phase_e_verification.md`** (Task 13) — verificação final: suíte completa, typecheck, lint, e verificação visual interativa via Playwright MCP feita pelo controller.

Tasks 2-6 dependem da Task 1 (usam `AuthField`). Tasks 7-10 (Task 9 depende das Tasks 7-8, que produzem `SearchBar`/`CategoryGrid`) e 11-12 são independentes entre si e das Tasks 1-6. A Task 13 depende de todas as anteriores.

Base commit desta fase: `c9365f56`.
