# Fase 10 — Wallet / Payment / Fees / Refunds / Withdrawals: Relatório de Execução

**Data:** 2026-07-02
**Branch:** feat/marketplace-implementation
**Status:** CONCLUÍDA

---

## Fluxo de execução

13 tasks: `wallet` (1-3) → `fees` (4) → `payment` (5-7) → `refunds` (8-9) → `withdrawals` (10-11) → frontend `wallet` (12-13). Cada task: 1 agente implementador novo (Sonnet) → 1 agente revisor novo (Opus 4.8, sem contexto da implementação) → se bug real, 1 agente corretor novo.

## Commits entregues

```
6939353a feat(wallet): adiciona schemas zod da carteira
c19c2656 feat(wallet): implementa carteira com credito e debito
11b83054 feat(wallet): expoe rotas de carteira e extrato
b1caecea feat(fees): implementa taxa de plataforma por pagamento
0867d0b9 feat(payment): adiciona schemas zod do pagamento
0c14ea9d feat(payment): implementa captura debitando cliente e creditando profissional
4c576910 feat(payment): expoe rotas de pagamento de contrato
29abed86 feat(refunds): implementa estorno revertendo carteiras
9944d484 feat(refunds): expoe rotas de estorno
237efd4e feat(withdrawals): implementa solicitacao e processamento de saque
bad9ee66 feat(withdrawals): expoe rotas de saque
c682db6e feat(wallet): adiciona api e queries da carteira no frontend
30282f6c feat(wallet): adiciona pagina de carteira e saque no frontend
```

13 commits `feat`, um por task. Nenhum bug real exigiu commit `fix` separado nesta fase — os dois bugs reais encontrados foram corrigidos **dentro** do próprio commit de implementação da task, pelo agente implementador, antes do commit (ver seção abaixo).

---

## O padrão de espaço de IDs (ProfessionalProfile.id vs users.id) se repetiu — e desta vez foi evitado corretamente

Esse bug já havia custado três commits de correção separados na fase 9 (demand, contract, dispute). Nesta fase ele reaparece em TODA orquestração que credita/debita a carteira de um profissional a partir de um `Contract`:

- **Task 6 (payment.service.ts)** — `payContract` resolve `Contract.professional_id → ProfessionalProfile.user_id → wallet.credit(user_id, ...)` corretamente, seguindo a "Nota de identidade financeira" que o próprio plano desta fase já documentava (aprendizado herdado da fase 9, escrito no plano por quem gerou o texto). Revisão confirmou a resolução correta e o teste genuinamente prova a distinção (mock usa `id`/`user_id` com strings diferentes).
- **Task 8 (refunds.service.ts)** — mesma resolução preservada ao estornar o profissional.

Diferente da fase 9, aqui o plano já veio ciente do problema (a seção "Nota de identidade financeira" foi escrita com o padrão correto), e os agentes implementadores mantiveram a resolução corretamente em todas as ocasiões — nenhum fix separado foi necessário para esse padrão nesta fase.

## Bugs reais encontrados e corrigidos (dentro do próprio commit de implementação)

### 1. Withdrawal órfão em falha de débito (Task 10)
O pseudocódigo do próprio plano criava a linha `Withdrawal` (`status: pending`) **antes** de debitar a carteira. Se o débito falhasse (saldo insuficiente — cenário que o próprio teste do plano exercita), a linha `Withdrawal` já teria sido persistida, órfã, sem nenhum débito real correspondente — um saque "pendente" fantasma no histórico do usuário. Corrigido invertendo a ordem: gera o UUID do saque antecipadamente (`randomUUID()`), debita primeiro (deixa o erro propagar antes de qualquer persistência), só então cria a linha `Withdrawal` reaproveitando o id já gerado — preservando a referência de transação (`TransactionRef.id`) sem exigir que a linha exista antes do débito. Teste de regressão adicionado prova que `withdrawals.create`/`save` nunca são chamados quando o débito falha.

### 2. Payload inválido no teste de integração do próprio plano (Task 11)
O teste "rejeita saque acima do saldo" do plano usava `destination: 'x'` (1 caractere), que falha a validação `min(3)` do schema **antes** de chegar à lógica de negócio — o teste, se implementado literalmente, teria testado (e coincidentemente "passado" com) um 400 de validação em vez do 422 de saldo insuficiente que a asserção realmente esperava. Corrigido com um destino válido (`'insufficient@pix.com'`), fazendo o teste genuinamente exercitar o caminho de saldo insuficiente do `WithdrawalsService`.

## Débito técnico registrado (não bloqueante, decisão consciente)

**Fallback de taxa ausente em `refunds.service.ts` (Task 8).** `const feeAmount = fee ? fee.amount : 0;` — se uma linha `PlatformFee` não existir para um pagamento (não deveria acontecer, já que `payContract` sempre chama `recordFee` de forma síncrona antes de marcar `captured`), o código debitaria o profissional pelo valor bruto total em vez do líquido, silenciosamente, em vez de lançar erro. Revisão confirmou que essa invariante (fee sempre existe para pagamento `captured`) é genuína no código atual e o cenário é inalcançável na prática — mas recomendou adicionar um `throw UnprocessableError` como defesa em profundidade caso a invariante seja quebrada por código futuro. Não implementado nesta fase, registrado para hardening futuro.

## Gap de plano preenchido: roteamento frontend

Confirmando o padrão já visto nas fases 8 e 9, o plano nunca especifica como `WalletPage` entra no `router/index.tsx`. A Task 13 adicionou `/wallet` dentro do grupo `ProtectedRoute` sem restrição de role (backend usa só `app.authenticate` em `GET /wallet`).

## Outras correções de convenção (não-bugs, adaptação real-vs-plano)

- Toda task usou wiring de DI real (`app.dataSource.getRepository(...)` uma vez por registro de rota) em vez do padrão do plano (`AppDataSource` estático por requisição).
- Nenhum teste de integração usou os factories inexistentes (`createUser`/`createProfessional`/`createContract` em `@/test/factories`) assumidos pelo plano — todos construíram a cadeia real via HTTP (registro → perfil profissional → demanda → orçamento → aceite → pagamento), espelhando o padrão já estabelecido em `dispute.routes.test.ts`/`contract.routes.test.ts` da fase 9.
- Export padrão (`export default`) em vez de nomeado para `WalletPage`, seguindo a convenção real já usada em `DemandListPage`/`ContractListPage`.

---

## Resultados dos testes (fim de fase)

### Backend (`cd backend && npx vitest run src/modules/wallet src/modules/fees src/modules/payment src/modules/refunds src/modules/withdrawals`)
```
Test Files  9 passed (9)
     Tests  60 passed (60)
```

### Frontend (`cd frontend && npx vitest run src/features/wallet`)
```
Test Files  1 passed (1)
     Tests  1 passed (1)
```

`npm run typecheck` e `npm run lint` limpos em ambos os pacotes.

---

## Nota de infraestrutura de teste (recorrente desde a fase 8, ainda não corrigida)

Múltiplos agentes reportaram falhas intermitentes ao rodar a suíte completa em paralelo com módulos de fases anteriores (`demand`, `quote`, `contract`, `dispute`, `wallet`, `refunds`, `withdrawals`), sempre desaparecendo ao rodar o arquivo isoladamente ou em conjunto explícito com os módulos da própria fase. Diagnóstico consistente: `truncateAll()` chamado de forma independente por múltiplos arquivos de teste de rota contra o mesmo banco MySQL real, sem serialização, com Vitest rodando arquivos em paralelo. Ainda não corrigido — recomendado para a fase 14 (hardening/CI).

## Interfaces produzidas (consumidas pelas fases 11+)

- Backend: módulos `wallet`, `fees` (sem rotas próprias, consumido internamente), `payment`, `refunds`, `withdrawals` completos, rotas em `/api/wallet`, `/api/contracts/:id/payment`, `/api/payments/:id`, `/api/payments/:id/refund`, `/api/withdrawals`.
- Frontend: `features/wallet/{api,queries,schemas}.ts` + página `/wallet` (protegida, sem restrição de role).
- Padrão `WalletService.credit/debit(userId, amount, TransactionRef)` reutilizado por `payment`, `refunds` e `withdrawals` — estabelecido como a primitiva financeira central do marketplace, reaproveitável por fases futuras que movimentem saldo (ex: fase 11 social/chat não deve precisar, mas qualquer feature de monetização adicional deve consumir esta mesma primitiva).
