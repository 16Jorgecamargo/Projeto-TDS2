# Publicar Demanda: endereço + visibilidade condicional — Índice do Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformar a tela Publicar Demanda (categoria pesquisável, remoção de orçamento, endereço completo, botão roxo, galeria de fotos com preview/deletar) e implementar a regra de negócio de que o endereço completo da demanda só é revelado ao profissional depois que ele tem um contrato ativo/concluído naquela demanda — cidade/UF ficam públicos desde a publicação.

**Spec:** `docs/superpowers/specs/2026-07-05-publish-demand-address-design.md`

**Architecture:** Backend guarda endereço completo direto em `service_demands` (sem depender do módulo `address` do usuário, decisão explícita). `DemandService.toResponse` fica actor-aware: sempre expõe `city`/`state`; só expõe `street/number/complement/district/zipCode` se o ator for o dono ou tiver `Contract` `active`/`completed` para a demanda. Frontend ganha um `SearchableSelect` genérico (categoria + UF), remove orçamento, adiciona campos de endereço, botão vira `Button variant="primary"`, e a lista de fotos vira `PhotoGallery` com hover (olho abre `Modal` de preview, lixeira remove sem confirmação).

**Tech Stack:** Fastify + TypeORM + Zod + Vitest (backend). React + react-hook-form + Zod + Vitest + Testing Library (frontend).

## Global Constraints

- Nunca usar comentários no código.
- Variáveis/funções/arquivos sempre em inglês (nomes técnicos); textos de UI em português.
- Sem `addressId`/módulo `address` do usuário nesta feature — campos de endereço ficam direto na demanda (decisão do usuário).
- Colunas novas em `service_demands` ficam `NULL` no banco (mesmo padrão de `budget_min`/`budget_max`); obrigatoriedade é responsabilidade do Zod na criação.
- `budgetMin`/`budgetMax` viram opcionais em toda a cadeia (schema, entidade já era nullable).

## Ordem de execução

1. `plan_phase1_backend_data_model.md` — migration + entidade `ServiceDemand`
2. `plan_phase2_backend_schemas_service.md` — schemas Zod, `DemandService` actor-aware, DI (`Contract` repo), controller, testes existentes ajustados
3. `plan_phase3_frontend_searchable_select.md` — `SearchableSelect` genérico + lista estática de UFs
4. `plan_phase4_frontend_demand_form.md` — `DemandForm` (categoria combobox, remove orçamento, campos de endereço, botão roxo), schema/api do frontend
5. `plan_phase5_frontend_photo_gallery.md` — `PhotoGallery` (hover olho/lixeira + modal de preview)

Cada fase é independentemente testável (roda sua própria suíte antes de passar pra próxima). Fases 1-2 (backend) precisam terminar antes da fase 4 rodar de ponta a ponta contra a API real, mas fases 3 e 5 (componentes de UI puros) podem ser feitas em paralelo com o backend.
