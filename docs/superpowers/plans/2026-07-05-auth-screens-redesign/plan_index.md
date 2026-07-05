# Redesign das Telas de Autenticação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir as 5 telas públicas de autenticação (Login, Register, ForgotPassword, ResetPassword, VerifyEmail) via composição de primitivos existentes em `components/ui`, com um novo `AuthLayout` split-screen, guard `RequireGuest`, `AuthField` evoluído, uso híbrido de `Toast`/inline e correção dos gaps de navegação/consistência identificados na auditoria.

**Architecture:** Um layout de página dedicado (`AuthLayout`) substitui o `AppShell` nas 5 rotas de auth, montado sob um novo guard de rota (`RequireGuest`) que redireciona usuário já autenticado para `/`. Cada página existente é reescrita para usar `AuthLayout` + `AuthField` (evoluído com ícone/endAdornment/aria) + `Card` (interactive para seleção de papel) + `Toast` (erro/sucesso global) + `EmptyState` (sucesso/erro de fluxo). Nenhum primitivo novo em `components/ui`; toda animação reusa `lib/motion.ts`.

**Tech Stack:** React 18/19 + TypeScript, React Router v6 (`createBrowserRouter`), React Hook Form + Zod (`@hookform/resolvers/zod`), TanStack Query (`useMutation`), Zustand (`useAuthStore`, `useToastStore`), Framer Motion (`motion`, `AnimatePresence`, `MotionConfig`), `class-variance-authority`, `lucide-react`, Vitest + Testing Library (+ `@testing-library/user-event`).

## Global Constraints

- Não criar novos primitivos em `components/ui`. Só reusar: `Button`, `Card` (+`Header`/`Body`/`Footer`, `interactive`, `selected`), `Toast`/`useToast`, `EmptyState`.
- Não alterar API/DTO/contrato/regra de negócio/Socket.IO/estado global existentes (`authApi`, `queries.ts`, `schemas.ts`, `stores/auth.ts` permanecem intocados, exceto leitura).
- Não criar comentários no código (regra global do usuário).
- Identificadores/arquivos em inglês; textos de UI em português (padrão já usado no projeto).
- Toda nova constante de motion deve vir de `frontend/src/lib/motion.ts` — nenhuma nova constante de easing/duration/spring inline.
- `MotionConfig reducedMotion="user"` deve continuar efetivo em todas as 5 rotas de auth mesmo depois de saírem de dentro de `<App/>`.
- Cada task termina com `npm test -- <arquivo>` (rodado em `frontend/`) passando antes do commit.
- Mensagens de commit em português, sem trailer `Co-Authored-By`.

## Ordem de execução

1. [plan_phase1_guard_layout.md](plan_phase1_guard_layout.md) — `RequireGuest` (guard de rota) + `AuthLayout` (layout split-screen) + rewiring do router.
2. [plan_phase2_authfield.md](plan_phase2_authfield.md) — Evolução do `AuthField` (tokens, ícone, endAdornment, aria) + `PasswordStrengthBar` compartilhado (Register + ResetPassword).
3. [plan_phase3_login.md](plan_phase3_login.md) — Redesign da `LoginPage`.
4. [plan_phase4_register.md](plan_phase4_register.md) — Redesign da `RegisterPage` (seletor de papel via `Card interactive`).
5. [plan_phase5_forgot_password.md](plan_phase5_forgot_password.md) — Redesign da `ForgotPasswordPage` (`EmptyState` de sucesso, link de volta).
6. [plan_phase6_reset_password.md](plan_phase6_reset_password.md) — Redesign da `ResetPasswordPage` (`EmptyState` de erro com ação).
7. [plan_phase7_verify_email.md](plan_phase7_verify_email.md) — Redesign da `VerifyEmailPage` (`EmptyState` unificado por estado).

Fases 3–7 dependem das fases 1 e 2 (usam `AuthLayout`, `RequireGuest` via router, `AuthField` evoluído). Fases 3–7 são independentes entre si e podem ser executadas em qualquer ordem relativa umas às outras, ou em paralelo por diferentes subagents, desde que 1 e 2 já estejam mescladas.

Spec de origem: `docs/superpowers/specs/2026-07-05-auth-screens-redesign-design.md`.
