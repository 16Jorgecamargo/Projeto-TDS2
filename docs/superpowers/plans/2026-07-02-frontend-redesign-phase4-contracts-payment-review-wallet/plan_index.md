# Fase 4 do Redesign Frontend — Contratos, Pagamento, Avaliação e Carteira — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o ciclo de vida pós-orçamento do marketplace: restilizar Contratos e Carteira com os tokens da Fase 1, e construir do zero os fluxos de Pagamento e Avaliação (endpoints já existem no backend, nunca foram consumidos pelo frontend), mais um botão de Chat vinculado ao contrato e um gráfico de receita em CSS puro na Carteira.

**Architecture:** Uma mudança pontual e mínima de backend (enriquecer `contractResponseSchema` com nome do cliente/profissional, resolvida em `ContractService.toResponse()` do mesmo jeito que o `schedule` já é resolvido ali) libera o restante do trabalho, que é 100% frontend: reaproveitar os componentes `Card`/`Badge`/`Button`/`Modal`/`Skeleton`/`EmptyState` da Fase 1, seguir o padrão de feature TanStack Query já estabelecido nas Fases 2 e 3, e compor a página de detalhe do contrato por último, depois que todos os blocos (progresso, pagamento, avaliação, chat, disputa) já existem isolados e testados.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Query 5, Zustand 5, React Router 6, Tailwind (tokens da Fase 1), React Hook Form + Zod, Vitest + Testing Library. Backend: Fastify 5, TypeORM, Zod (zod-openapi).

## Global Constraints

- Nenhuma mudança de endpoint, DTO, regra de negócio, autenticação, sockets ou banco de dados, **exceto** a adição de 3 campos de leitura (`clientName`, `professionalHeadline`, `professionalUserId`) ao `contractResponseSchema` existente, resolvidos em `ContractService.toResponse()` — sem rota nova, sem endpoint novo.
- Só usar os tokens/componentes de UI já existentes da Fase 1: `Card`, `Badge` (só 2 tones: `neutral`/`urgent`), `Button` (`variant`: `primary`/`accent`/`ghost`), `Modal`, `Skeleton`, `EmptyState`, `Avatar`. Não criar tokens ou variantes novas.
- Todo widget/tela assíncrona segue a disciplina `Skeleton` durante carregamento e `EmptyState` quando a lista/dado vier vazio.
- Sem novas dependências de runtime — o gráfico de receita é CSS puro, sem biblioteca de charting.
- Cache do TanStack Query: toda `queryKey` que varia por parâmetro (ex: `page`, `limit`) deve incluir esse parâmetro na key, para não colidir entre diferentes chamadas do mesmo hook com argumentos diferentes (lição já aprendida na Fase 2 com `favoriteKeys`).
- Sem pré-checagem de "já avaliei este contrato" — não existe endpoint de leitura para isso; a UI trata o erro 409 do próprio `POST /reviews` como sinal de duplicata.
- Commits em português, sem `Co-Authored-By`, direto na `master` (sem PR) — projeto é dev solo.
- Nunca usar comentários no código. Identificadores, funções e nomes de arquivo sempre em inglês (labels de UI em português, como já é o padrão do projeto).

## Ordem de Execução

O plano está dividido em 6 arquivos, executados nesta ordem:

1. **[plan_phase_a_backend_enrichment.md](plan_phase_a_backend_enrichment.md)** — Task 1: enriquecimento do backend (`clientName`/`professionalHeadline`/`professionalUserId`). Roda primeiro porque todo o resto depende desses campos existirem na resposta da API.
2. **[plan_phase_b_contracts_restyle.md](plan_phase_b_contracts_restyle.md)** — Tasks 2-5: camada de dados do frontend (`Contract` type + `startContract`), restilização de `ContractListPage`, `ContractProgress`/`ProgressUpdateForm`, `DisputeDialog`. Depende só da Task 1.
3. **[plan_phase_c_payment.md](plan_phase_c_payment.md)** — Tasks 6-7: camada de dados de pagamento (`usePayment`/`usePayContract`) + `PaymentDialog`. Depende da Task 1 (usa `contract.total`, `clientId`) e é independente das Fases D/E.
4. **[plan_phase_d_review.md](plan_phase_d_review.md)** — Tasks 8-9: camada de dados de avaliação (`createReview`/`useCreateReview`) + `ReviewForm`. Independente das Fases C/E.
5. **[plan_phase_e_wallet.md](plan_phase_e_wallet.md)** — Tasks 10-11: restilização da Carteira + `WalletRevenueChart`. Totalmente independente das Fases B/C/D (não toca em Contratos).
6. **[plan_phase_f_composition_verification.md](plan_phase_f_composition_verification.md)** — Tasks 12-13: composição final de `ContractDetailPage` (reúne tudo: progresso, ações por papel, pagamento, avaliação, chat, disputa) + verificação visual interativa via Playwright MCP, feita pelo controller (não delegada a subagent — preferência já confirmada pelo usuário nas Fases 2 e 3).

**Fases C, D e E são independentes entre si** (todas só dependem da Fase A+B estarem prontas). Fase F depende de todas as anteriores.

## Ledger de Progresso

Ao executar via subagent-driven-development, mantenha um arquivo `.superpowers/sdd/progress-phase4.md` com uma linha por task concluída (`Task N: complete (commit <sha>, review clean)`), no mesmo formato usado nas Fases 1-3.
