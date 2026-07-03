# Fase 5 do Redesign Frontend — Chat, Notificações, Admin, Configurações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restilizar as 4 áreas que fecham o redesign do frontend (Chat, Notificações, Admin, Configurações) usando exclusivamente os tokens e primitivos de UI já existentes do design system, sem tocar em backend nem em camada de dados (exceto expor no front um campo `note` que os hooks de admin já aceitavam).

**Architecture:** Cada área é um conjunto pequeno e independente de arquivos dentro de `frontend/src/features/{chat,notifications,admin,settings}/`. Todas consomem hooks e endpoints já existentes — nenhuma API nova, nenhum schema novo. As tasks de Admin e Configurações introduzem uso do `Modal` já existente para confirmar ações (resolução de denúncia/disputa com nota opcional; exclusão de conta), seguindo o mesmo padrão já usado em `DisputeDialog`/`PaymentDialog` na Fase 4.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Tailwind (tokens do design system da Fase 1: `Card`, `Badge`, `Button`, `Modal`, `Skeleton`, `EmptyState`), Vitest + Testing Library, react-hook-form + zod (já usados no projeto).

## Global Constraints

- Sem comentários no código.
- Identificadores e nomes de arquivo em inglês; copy de UI em português.
- Commits em português, sem trailer `Co-Authored-By`.
- Sem PR — merge direto na `master` (dev solo).
- Sem dependências novas de runtime.
- Apenas os primitivos de UI já existentes (`Card`, `Badge`, `Button`, `Modal`, `Skeleton`, `EmptyState`) — nenhum componente novo de design system nesta fase.
- Badge só tem 2 tons: `neutral` e `urgent`. Button só tem 3 variantes: `primary`, `accent`, `ghost`.
- TDD estrito em toda task: teste falho → confirma RED → implementa → confirma GREEN → roda suíte completa + typecheck + lint → commit.
- Nenhuma mudança de endpoint/schema no backend nesta fase.

## Ordem de execução

1. **`plan_phase_a_chat.md`** (Tasks 1-2) — restyle de `ChatWindow`, `ChatIndexPage`, `ChatPage`.
2. **`plan_phase_b_notifications.md`** (Tasks 3-4) — restyle de `NotificationsPage`, `NotificationBell`.
3. **`plan_phase_c_admin.md`** (Tasks 5-7) — restyle de `ReportsTable`, `DisputesTable` (com `Modal` de confirmação + nota) e `AdminDashboardPage`.
4. **`plan_phase_d_settings.md`** (Tasks 8-11) — restyle de `PreferencesForm`, `ConsentsPanel`, `DeleteAccountPanel` (com `Modal` de confirmação) e `SettingsPage`.
5. **`plan_phase_e_verification.md`** (Task 12) — verificação final: suíte completa, typecheck, lint, e verificação visual interativa via Playwright MCP feita pelo controller.

As Fases A, B, C e D são independentes entre si (podem ser feitas em qualquer ordem relativa). Dentro de cada fase, a última task depende das anteriores (ex: `AdminDashboardPage` depende de `ReportsTable`/`DisputesTable` já restilizados; `SettingsPage` depende de `PreferencesForm`/`ConsentsPanel`/`DeleteAccountPanel`). A Fase E depende de todas as anteriores.

Base commit desta fase: `e0454c3b`.
