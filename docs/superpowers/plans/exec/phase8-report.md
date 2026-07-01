# Fase 8 — Professional / Catalog / Availability / Portfolio / Search: Relatório de Execução

**Data:** 2026-07-01
**Branch:** feat/marketplace-implementation
**Status:** CONCLUÍDA

---

## Contexto: plano incompleto na retomada

O plano `plan_phase8_professional.md` só tinha as Tasks 1-5 escritas (catalog completo + início do perfil profissional), mas o objetivo da fase e o `plan_index.md` prometiam `availability`, `portfolio`, `search` e as features frontend `professional`/`landing`. As Tasks 6-15 foram escritas nesta sessão (commit `71e65b89`, usando a skill `write-plans`) antes de continuar a implementação, com base no estado real do código (entidades, house style, contratos já mesclados), não em suposições.

## Fluxo de execução

Cada task: 1 agente implementador novo (Sonnet) → 1 agente revisor novo (Opus 4.8, sem contexto da implementação) → se bug real, 1 agente corretor novo. Repetido para as 15 tasks.

## Commits entregues

```
aa596ce8 feat(catalog): adiciona schemas zod de categorias e tags
c19c7ad3 feat(catalog): implementa service de categorias e tags
6579bd72 feat(catalog): expoe rotas de categorias e tags com testes de integracao
9fd716d6 feat(professional): adiciona schemas zod de perfil profissional
b89d47d5 feat(professional): implementa perfil e associacoes de categoria/tag
71e65b89 docs: completa plano da fase 8 com tasks 6-15
e7d2de79 feat(professional): adiciona crud de experiencia, formacao, certificacao, area e documentos
e341f624 feat(professional): expoe rotas de perfil profissional com testes de integracao
b34ba10c feat(availability): implementa slots e excecoes de disponibilidade
63b7b0c0 fix(availability): normaliza horario para HH:MM ao mapear resposta
5cb19864 feat(availability): expoe rotas de slots e excecoes com testes de integracao
5086bb29 feat(portfolio): implementa itens e imagens de portfolio
55a7d901 feat(portfolio): expoe rotas de itens e imagens com testes de integracao
66fe2935 feat(search): adiciona busca publica de profissionais com paginacao
c3a7ed94 feat(professional-web): adiciona formulario de perfil profissional
d77ddd93 feat(professional-web): adiciona portfolio, disponibilidade, areas e perfil publico
51e42dda feat(landing-web): adiciona busca publica e pagina inicial
bbe55d01 fix(landing-web): normaliza uf e alinha validacao de busca com o backend
```

---

## Bugs reais encontrados em revisão e corrigidos

### 1. Horário de disponibilidade com segundos (Task 8, corrigido em 63b7b0c0)
Colunas MySQL `time` (`availability_slots.start_time/end_time`) retornam `HH:MM:SS` via mysql2/TypeORM, mas o response schema exigia regex `HH:MM` estrito. Unit tests com mocks não pegaram — mocks só ecoavam o valor de entrada, nunca simulavam o round-trip real do banco. Corrigido normalizando com `.slice(0, 5)` nos mappers `toSlot`/`toException`. Task 9 (integração real com MySQL) confirmou o fix ponta a ponta, com assert explícito de `'09:00'` (não `'09:00:00'`) tanto na resposta do POST quanto no GET público subsequente.

### 2. Validação de busca divergente do backend (Task 15, corrigido em bbe55d01)
`searchFormSchema` do frontend não impunha `q.min(2)` nem uppercase em `state`, ambos exigidos pelo backend (`search.schemas.ts`). Um usuário digitando UF em minúsculo ou busca de 1 caractere passava a validação client-side e recebia 400 do backend sem feedback claro. Corrigido com normalização (`state` uppercased via `setValueAs` no form e via `.toUpperCase()` na leitura de query params em `SearchPage`) e alinhamento do `min(2)` em `q`.

## Gaps de cobertura de teste identificados (não bloqueantes, registrados para follow-up)

- Task 3 (catalog): `PATCH /categories/:id` nunca testado via HTTP; caso 401 (sem token) não testado, só 403 (role errado); nesting de `/categories/tree` não testado com filhos reais.
- Task 6 (professional sub-recursos): `removeEducation`/`removeCertification`/`removeServiceArea` sem teste de ownership-rejection (só `removeExperience` tem).
- Task 7 (professional routes): sem teste de 403 com role errado (só 401 sem token); sem teste positivo de categorias aparecendo no perfil público.
- Task 12 (search): filtro por `categoryId`/`city`+`state` só testado via mock, sem integração real contra join no banco (a segurança contra duplicação de linhas foi confirmada por análise das constraints UNIQUE, não por teste).

## Verificação final

### Backend (`cd backend && npx vitest run src/modules/catalog src/modules/professional src/modules/availability src/modules/portfolio src/modules/search`)
```
Test Files  10 passed (10)
     Tests  63 passed (63)
```
`npx tsc --noEmit` e `npm run lint`: limpos.

### Frontend (`cd frontend && npx vitest run src/features/professional src/features/landing`)
```
Test Files  2 passed (2)
     Tests  9 passed (9)
```
`npm run typecheck` e `npm run lint`: limpos.

## Nota de infraestrutura de teste (fora de escopo, registrada para fase de hardening)

Múltiplos agentes reportaram falhas intermitentes e não-relacionadas em `professional.routes.test.ts`/`catalog.routes.test.ts` durante execuções da suíte completa, diagnosticadas como corrida entre arquivos de teste de rota que chamam `truncateAll()` de forma independente contra o mesmo banco MySQL real, sem serialização entre arquivos. Não foi corrigido (fora do escopo das tasks desta fase) — recomenda-se tratar na fase 14 (hardening/CI): `fileParallelism: false` no Vitest ou um fixture de lock compartilhado.

## Interfaces produzidas (consumidas pelas fases 9+)

- Backend: módulos `catalog`, `professional`, `availability`, `portfolio`, `search` completos, rotas em `/api/categories`, `/api/tags`, `/api/professionals`, `/api/availability`, `/api/portfolio`, `/api/search`.
- Frontend: `features/professional/{api,queries,schemas}.ts` + dashboard (`/professional/dashboard`, protegido) + perfil público (`/professionals/:id`); `features/landing/{api,queries,schemas}.ts` + `/` (home) + `/search`.
- Fecha o gap da fase 7: `/` agora resolve para `LandingPage` (antes caía no catch-all `NotFound` após login).
