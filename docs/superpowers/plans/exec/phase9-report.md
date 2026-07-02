# Fase 9 — Demand / Quote / Contract / Disputes: Relatório de Execução

**Data:** 2026-07-02
**Branch:** feat/marketplace-implementation
**Status:** CONCLUÍDA

---

## Fluxo de execução

12 tasks de implementação (Task 13 é só verificação final, não gerou código). Cada task: 1 agente implementador novo (Sonnet) → 1 agente revisor novo (Opus 4.8, sem contexto da implementação) → se bug real, 1 agente corretor novo, seguido de re-revisão. Repetido em sequência: demand (Tasks 1-4) → quote (5-6) → contract (7-8) → dispute (9) → frontend demands (10-11) → frontend contracts (12).

## Commits entregues

```
c31bfa6d feat(demand): adiciona schemas zod da demanda
23d0540e feat(demand): implementa service de criacao, listagem e detalhe
41c55faf feat(demand): adiciona convites diretos a profissionais
374d72bc feat(demand): expoe rotas de demanda e convites
3f073d86 feat(quote): implementa orcamento com itens e total calculado
fc9deeab feat(quote): expoe rotas de orcamento
b695f931 feat(contract): aceita orcamento e gera contrato com progresso
84636069 fix(contract): separa id de perfil profissional e id de usuario em progresso e cancelamento
ec07d311 fix(contract): corrige verificacao de participante profissional em getById e listMine
951a18dd feat(contract): expoe rotas de contrato, execucao e progresso
0f480b57 feat(dispute): adiciona disputa de contrato
c47f5a83 fix(dispute): reativa contrato ao resolver disputa
e8aa3c42 feat(demands): adiciona api, queries e schemas da feature demandas
9483ee4f feat(demands): adiciona telas de publicar, listar e detalhar demanda
1b550abc feat(contracts): adiciona acompanhamento, progresso e disputa
```

15 commits: 12 `feat` (um por task) + 3 `fix` (bugs reais encontrados em revisão).

---

## Discrepância de enum recorrente (achada na Task 1, propagada por toda a fase)

O plano assumia `ServiceDemand.status: 'open' | 'contracted' | 'closed' | 'cancelled'`. O valor real (confirmado na entidade e migration) é `'open' | 'in_progress' | 'closed' | 'cancelled'` — **não existe `'contracted'`**. Essa correção, feita já na Task 1, precisou ser propagada manualmente para instruções de todas as tasks seguintes que tocam status de demanda (Tasks 2, 3, 7) e para o frontend (Task 10), porque o texto do plano continuava usando o valor errado em pseudocódigos e testes.

De forma similar, `Contract.status` no plano assumia incluir `'in_progress'`, mas o valor real é `'active' | 'completed' | 'cancelled' | 'disputed'` — sem `'in_progress'`. O sinal real de "execução em andamento" é `status === 'active' && startedAt !== null` (setado por `POST /contracts/:id/start`). Essa segunda discrepância foi descoberta na Task 7 e teve que ser propagada para Tasks 8, 9 e 12.

---

## Padrão de bug recorrente: espaço de IDs (ProfessionalProfile.id vs users.id)

O bug mais caro da fase, encontrado e corrigido **três vezes** em módulos diferentes:

1. **Task 4 (demand)** — `demand_invitations.professional_id` tem FK real para `professional_profiles(id)`, não `users(id)`. O pseudocódigo do plano passava `req.user.id` (um `users.id`) direto para `respondInvitation`, que sempre falharia com 403. Corrigido resolvendo o `ProfessionalProfile` do usuário autenticado no controller antes de chamar o service.
2. **Task 7/8 (contract)** — o mesmo padrão apareceu em DUAS formas distintas no módulo de contrato, cada uma corrigida em commit separado:
   - `84636069`: `addProgress`/`cancel` (branch profissional) escreviam um `ProfessionalProfile.id` em colunas com FK para `users.id` (`author_id`, `cancelled_by`) — violação de FK garantida em produção. Corrigido separando os parâmetros: um id para checagem de posse (`professional_profiles.id`), outro para a escrita na coluna (`users.id`).
   - `ec07d311`: o mesmo problema do lado de leitura — `getById`/`listMine` comparavam um único id contra `client_id` (`users.id`) E `professional_id` (`professional_profiles.id`), tornando impossível um profissional nunca acessar seus próprios contratos. Corrigido com um objeto `actor: { userId, professionalId }`.
3. **Task 9 (dispute)** — o mesmo padrão foi **pré-empetido antes de acontecer**: a instrução de implementação já alertava sobre o padrão, e o agente implementador usou o padrão `actor`-based desde o início, com um teste prova explícito ("profissional abre disputa usando o profile id, provando a correcao do id-space").

Esse padrão se repete porque toda entidade que referencia "o profissional" via FK aponta para `professional_profiles.id`, não para `users.id` — e o payload JWT/`req.user.id` é sempre um `users.id`. Qualquer módulo futuro que relacione um profissional a um contrato/demanda/orçamento precisa resolver o profile explicitamente no controller antes de chamar o service.

## Bug de produto: contrato disputado ficava permanentemente travado

**Task 9, corrigido em `c47f5a83`.** `DisputeService.open()` marca o contrato como `'disputed'`, mas `resolve()` só mutava a disputa, nunca o contrato — como nenhum outro método reverte `'disputed'` para outro estado, um contrato que entrasse em disputa nunca mais poderia ser completado (`complete()` exige `status==='active'`) nem receber uma segunda disputa (`open()` também exige `'active'`). Corrigido fazendo `resolve()` reativar o contrato para `'active'` (guardado por `contract.status === 'disputed'`, não sobrescreve estados terminais como `completed`/`cancelled`) independente do resultado (`resolved` ou `rejected`) — a semântica do resultado fica no campo de texto `resolution`, não no estado da máquina.

## Gaps de plano preenchidos: roteamento frontend nunca especificado

Confirmando um padrão já visto na fase 8, o plano nunca especifica como as novas páginas (`demands`, `contracts`) entram no `router/index.tsx`. Cada task frontend (10-12) teve que decidir e implementar o roteamento com base na exigência real de auth/role de cada rota backend correspondente:
- `/demands`, `/demands/:id`, `/contracts`, `/contracts/:id` — dentro do `ProtectedRoute` sem restrição de role (autenticação simples, backend usa só `app.authenticate`).
- `/demands/new` — dentro de um `ProtectedRoute roles={['client']}` separado, já que `POST /demands` exige `requireRole('client')`.

---

## Resultados dos testes (fim de fase)

### Backend (`cd backend && npx vitest run src/modules/demand src/modules/quote src/modules/contract src/modules/dispute`)
```
Test Files  8 passed (8)
     Tests  93 passed (93)
```

### Frontend (`cd frontend && npx vitest run src/features/demands src/features/contracts`)
```
Test Files  2 passed (2)
     Tests  3 passed (3)
```

`npm run typecheck` e `npm run lint` limpos em ambos os pacotes.

---

## Nota de infraestrutura de teste (recorrente desde a fase 8, ainda não corrigida)

Vários agentes reportaram falhas intermitentes ao rodar a suíte completa junto com outros módulos (`demand`, `quote`, `contract`, `dispute`, `account`), sempre desaparecendo ao rodar o arquivo isoladamente. Diagnóstico consistente: múltiplos arquivos de teste de rota chamam `truncateAll()` de forma independente contra o mesmo banco MySQL real, sem serialização entre arquivos, e o Vitest roda arquivos em paralelo. Segue não corrigido (fora do escopo de todas as tasks de domínio) — recomenda-se `fileParallelism: false` no Vitest ou um fixture de lock compartilhado na fase 14 (hardening/CI).

## Gaps de cobertura de teste (não bloqueantes)

- Duplicate-invite test (demand) não verifica que o WHERE usou `demand_id` E `professional_id`, só que `ConflictError` foi lançado.
- `removeEducation`/`removeCertification`/`removeServiceArea` (fase 8, mas relevante aqui por analogia) sem teste de ownership — não é desta fase, apenas nota cruzada.
- `resolved_by` no dispute nunca é persistido (a assinatura do service não carrega um id de admin) — perde rastreabilidade de qual admin resolveu a disputa. Registrado como débito técnico, não bloqueante.
- `InviteProfessionalDialog` (frontend) não valida formato UUID nem mostra erro de mutation — usuário digitando lixo recebe 400 opaco sem feedback.
- `useAcceptQuote` (frontend) invalida só `demandKeys.detail`, não `demandKeys.quotes` — labels de orçamentos irmãos ficam desatualizados até refresh manual (o botão "Aceitar" já some corretamente pois depende do status da demanda, que é invalidado).

---

## Interfaces produzidas (consumidas pelas fases 10+)

- Backend: módulos `demand`, `quote`, `contract`, `dispute` completos, rotas em `/api/demands`, `/api/quotes`, `/api/contracts`, `/api/disputes`.
- Frontend: `features/demands/{api,queries,schemas}.ts` + páginas `/demands`, `/demands/:id`, `/demands/new` (protegido, role client); `features/contracts/{api,queries,schemas}.ts` + páginas `/contracts`, `/contracts/:id`.
- Padrão `actor: { userId, professionalId }` estabelecido em `contract.service.ts` e `dispute.service.ts` para qualquer método que precise diferenciar entre "usuário autenticado" e "perfil profissional do usuário" — reaproveitável pelas próximas fases que tocarem profissionais em contratos (ex: wallet/payment na fase 10).
