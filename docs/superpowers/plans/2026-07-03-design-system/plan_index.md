# Design System Implementation Plan — Índice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir os 11 componentes primitivos de `frontend/src/components/ui` (Button, Badge, Card, Avatar, Skeleton, EmptyState, ImageUpload, Modal, Drawer, Tooltip, Toast) seguindo a spec em `docs/superpowers/specs/2026-07-03-design-system/`, sem alterar nenhuma tela.

**Architecture:** Cada componente é reescrito no próprio arquivo, usando `class-variance-authority` (cva) para variants/sizes, `framer-motion` para todos os estados de motion, e `lucide-react` para ícones. Foundation compartilhada (`lib/motion.ts`, `lib/slot.tsx`, `lib/hooks/useFocusTrap.ts`) é criada antes dos componentes que dependem dela.

**Tech Stack:** React 19, TypeScript, TailwindCSS, `class-variance-authority`, `framer-motion`, `lucide-react`, Vitest + Testing Library (já configurados).

## Global Constraints

- Não alterar backend, APIs, DTOs, hooks de dados, regras de negócio, TanStack Query, React Hook Form, Zod, autenticação, Socket.IO — mudança é só na camada visual de `components/ui`.
- Escopo fechado nos 11 componentes existentes — nenhum componente novo (Dialog, Tabs, Select etc.) é criado neste plano.
- Dark mode fora de escopo — só light mode, valores atuais de `:root`.
- Nunca usar comentários no código (`CLAUDE.md` global).
- Variáveis, funções e arquivos sempre em inglês; texto visível ao usuário em português (convenção já usada no projeto).
- Mensagens de commit sempre em português, sem trailer `Co-Authored-By`.
- Merge direto na branch atual, sem abrir PR no GitHub.
- `cn` em `frontend/src/lib/utils.ts:1-3` é implementação própria (`filter+join`, sem `clsx`/`tailwind-merge`) — mantida como está, cva + `cn` são suficientes para combinar classes.
- Cada tarefa entrega componente + teste atualizado, rodando `npm run test` (ou `npx vitest run <arquivo>`) dentro de `frontend/`.

## Ordem de execução

1. `plan_phase0_foundation.md` — dependências novas, `lib/motion.ts`, `lib/slot.tsx`
2. `plan_phase1_tokens.md` — tokens em `tailwind.config.js` + `index.css`
3. `plan_phase2_button_badge.md` — Button, Badge
4. `plan_phase3_content.md` — Card, Avatar, Skeleton, EmptyState, ImageUpload
5. `plan_phase4_overlay_modal_drawer.md` — `useFocusTrap`, Modal, Drawer
6. `plan_phase5_tooltip_toast.md` — Tooltip, Toast

Cada fase depende da anterior (tokens e foundation são pré-requisito de todo componente; Modal/Drawer reusam `useFocusTrap`). Dentro de uma fase, as tarefas são independentes entre si e podem ser executadas em qualquer ordem.

## Fora de escopo deste plano (documentado, não implementado)

- Substituir `@heroicons/react` por `lucide-react` fora de `components/ui` — a auditoria (`docs/frontend-audit/relatorio.md`) mostra heroicons "amplamente usado" em features; remover a dependência do `package.json` só é seguro depois de migrar todo o app, que é um passo futuro.
- Redesign de telas — feito num passo posterior, usando só os componentes deste plano.
