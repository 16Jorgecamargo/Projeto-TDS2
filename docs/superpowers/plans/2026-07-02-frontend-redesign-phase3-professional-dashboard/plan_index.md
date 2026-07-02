# Fase 3 do Redesign Frontend — Dashboard Profissional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/professional/dashboard` (hoje um único formulário cru empilhando 4 seções de gestão) em duas telas: um painel de leitura com 6 widgets (`ProfessionalDashboardPage`) e uma página de edição restilizada (`ProfessionalProfileEditPage`), corrigindo também o bug de `HomeRoute` que não redireciona profissionais para seu dashboard.

**Architecture:** Segue exatamente o padrão já estabelecido na Fase 2 para `ClientDashboardPage`: grid de widgets independentes, cada um com seu próprio hook TanStack Query, disciplina `Skeleton`/`EmptyState`. A página de edição reaproveita `PortfolioGallery`/`AvailabilityGrid` (componentes read-only já construídos na Fase 2) como pré-visualização acima de cada formulário de gestão restilizado.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Query 5, Zustand 5, React Router 6, Tailwind (tokens da Fase 1), React Hook Form + Zod, Vitest + Testing Library.

## Global Constraints

- Nenhuma mudança de endpoint, DTO, regra de negócio, autenticação, sockets ou banco de dados, **exceto** a correção pontual de `backend/src/modules/portfolio/portfolio.schemas.ts` (Task 1): `imageUrl` usa `.url()` mas o endpoint de upload sempre retorna caminho relativo (`/uploads/...`) — mesmo bug já corrigido em `demand.schemas.ts` na Fase 2.
- Só usar os tokens/componentes de UI já existentes da Fase 1: `bg-primary`/`text-primary`, `bg-accent`/`text-accent`, `bg-surface`, `text-ink`, `text-muted`, `Card`, `Badge` (só 2 tones: `neutral`/`urgent`), `Button` (`variant`: `primary`/`accent`/`ghost`), `Avatar`, `Skeleton`, `EmptyState`. Não criar nenhum token ou variante nova.
- Todo widget assíncrono segue a disciplina `Skeleton` durante `isPending` e `EmptyState` quando a lista/dado vier vazio — sem exceção.
- Sem novas dependências de runtime (`package.json` não muda).
- Widgets "Novos convites" e "Ranking" ficam **fora do escopo** — não existe fonte de dados real no backend para nenhum dos dois (decisão confirmada com o usuário no brainstorming).
- Commits em português, sem `Co-Authored-By`, direto na `master` (sem PR) — projeto é dev solo.
- Nunca usar comentários no código. Identificadores, funções e nomes de arquivo sempre em inglês (nomes de campo de UI/labels em português, como já é o padrão do projeto).

## Ordem de Execução

O plano está dividido em 4 arquivos, executados nesta ordem:

1. **[plan_phase_a_backend_fix.md](plan_phase_a_backend_fix.md)** — Task 1: correção de schema do backend (portfolio image URL) + hooks de mutation no frontend (`useAddPortfolioImage`, `useRemovePortfolioImage`). Roda primeiro porque a Task 12 (upload de foto no portfólio) depende desses hooks.
2. **[plan_phase_b_dashboard.md](plan_phase_b_dashboard.md)** — Tasks 2-8: os 6 widgets do `ProfessionalDashboardPage` + composição da página + correção do roteamento/`HomeRoute`. Cada widget é independente dos outros (consome apenas `useContracts`/`useWallet`/`useMyProfile`/`useSlots`/`useProfessionalReviews`, todos hooks já existentes) — podem ser feitos em qualquer ordem entre si, mas a Task 8 (composição) depende das Tasks 2-7 estarem prontas.
3. **[plan_phase_c_profile_edit.md](plan_phase_c_profile_edit.md)** — Tasks 9-14: restilização dos 4 formulários de gestão + composição da `ProfessionalProfileEditPage` + rota nova + ajuste de navegação. Depende da Task 1 (hooks de imagem) para a Task 12.
4. **[plan_phase_d_verification.md](plan_phase_d_verification.md)** — Task 15: verificação visual interativa via Playwright MCP, feita pelo controller (não delegada a subagent), cobrindo desktop e mobile — mesmo formato usado ao final da Fase 2, conforme preferência já confirmada pelo usuário.

**Fases B e C são independentes entre si** (nenhuma depende da outra, só ambas dependem da Task 1). Fase D depende de todas as anteriores estarem completas.

## Ledger de Progresso

Ao executar via subagent-driven-development, mantenha um arquivo `.superpowers/sdd/progress-phase3.md` com uma linha por task concluída (`Task N: complete (commit <sha>, review clean)`), no mesmo formato usado nas Fases 1 e 2.
