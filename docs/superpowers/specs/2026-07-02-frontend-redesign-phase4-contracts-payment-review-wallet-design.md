# Fase 4 do Redesign Frontend — Contratos, Pagamento, Avaliação e Carteira

## Contexto

Fases 1 (design system + shell/nav), 2 (Dashboard Cliente + Demandas + Busca + Perfil Público) e 3 (Dashboard Profissional) já estão implementadas e mescladas na master. Esta fase cobre o restante do ciclo de vida pós-orçamento do marketplace: `Contratos` (hoje uma lista/detalhe crus com classes Tailwind ad-hoc), `Carteira` (mesma situação), e dois fluxos que **nunca tiveram UI nenhuma** apesar de os endpoints já existirem no backend: **Pagamento** e **Avaliação**.

Fluxo completo coberto por esta fase: cliente aceita orçamento → contrato criado → profissional inicia → profissional registra progresso → profissional conclui → **cliente paga** (novo) → **qualquer uma das partes avalia** (novo) → carteira do profissional é creditada.

## Escopo

**Dentro do escopo:**
- Restilizar `ContractListPage` e `ContractDetailPage` com os tokens/componentes da Fase 1 (`Card`, `Badge`, `Button`, `Skeleton`, `EmptyState`).
- Adicionar acionador de "Iniciar contrato" no frontend — o endpoint `POST /contracts/:id/start` já existe no backend mas nunca foi chamado pelo frontend.
- Adicionar fluxo de **Pagamento**: `PaymentDialog` (seleção de método: carteira/cartão de crédito/pix/boleto), consumindo `POST /contracts/:id/payment` e `GET /contracts/:id/payment` (ambos já existentes, nunca consumidos).
- Adicionar fluxo de **Avaliação**: `ReviewForm` (nota 1-5 + comentário), consumindo `POST /reviews` (já existente, nunca consumido pelo frontend).
- Adicionar botão de **Chat vinculado ao contrato**, reaproveitando `useCreateRoom` (já suporta `contractId` opcional, hoje só é chamado com `participantId` em outros pontos do app).
- Restilizar `DisputeDialog` (existente) com os tokens da Fase 1.
- Restilizar `WalletPage`, `WalletBalanceCard`, `TransactionList`, `WithdrawDialog` com os tokens da Fase 1.
- Adicionar `WalletRevenueChart`: gráfico de barras em CSS puro (sem lib nova) mostrando a soma de créditos por mês dos últimos 6 meses, calculada no cliente a partir de `GET /wallet/transactions?limit=100` (mesma técnica de agregação client-side já usada no `DashboardRevenueWidget` da Fase 3).
- **Mudança pontual de backend, aprovada explicitamente pelo usuário**: adicionar `clientName` e `professionalHeadline` ao `contractResponseSchema`, resolvidos em `ContractService.toResponse()` via `findOne` adicional (mesmo padrão já usado ali para resolver o `schedule` do contrato) — sem endpoint novo, sem mudança de rota, só enriquece a resposta já existente de `GET /contracts` e `GET /contracts/:id`.

**Fora do escopo:**
- Qualquer outra mudança de endpoint, DTO, regra de negócio, autenticação, sockets ou banco de dados além da adição pontual acima.
- Gráficos com biblioteca externa — só CSS puro, conforme decisão do usuário.
- Endpoint de "já avaliei este contrato" não existe no backend; a UI trata o erro 409 (`Você já avaliou este contrato`) do próprio `POST /reviews` como sinal de duplicata, em vez de tentar pré-verificar.
- Nome/avatar de clientes em qualquer outro lugar do app além do contrato (essa mudança de schema é escopada só ao contrato).

## Arquitetura

### Backend — `contractResponseSchema` enriquecido

Em `backend/src/modules/contract/contract.schemas.ts`, adicionar dois campos ao `contractResponseSchema`:
```ts
clientName: z.string().describe('Nome do cliente').openapi({ example: 'Maria Cliente' }),
professionalHeadline: z.string().describe('Titulo do profissional').openapi({ example: 'Eletricista Residencial' }),
```

Em `backend/src/modules/contract/contract.service.ts`, `ContractServiceDeps` ganha `users: Repository<User>` e `professionalProfiles: Repository<ProfessionalProfile>`. `toResponse()` passa a resolver ambos via `findOne` (mesmo padrão do `schedule` já existente ali) antes de montar o objeto de resposta. `contract.routes.ts` passa os dois repositórios novos ao construir o `ContractService`.

### Frontend — Contratos

`ContractListPage`: grid de `Card`s (reaproveitando o padrão de `DemandCard`/`ProfessionalCard` das fases anteriores) mostrando valor formatado, `clientName`/`professionalHeadline` (conforme o papel de quem está vendo), `Badge` de status, data de agendamento se houver.

`ContractDetailPage`: compõe:
- Cabeçalho: valor, `Badge` de status, nome da outra parte.
- Bloco de agendamento (se `schedule !== null`).
- `ContractProgress` (existente, restilizado) — timeline cronológica de atualizações.
- `ProgressUpdateForm` (existente, restilizado) — visível só para o profissional quando `status === 'active' && startedAt !== null`.
- Barra de ações condicionada a papel + status:
  - Profissional, `status === 'active' && startedAt === null`: botão "Iniciar contrato" → `POST /contracts/:id/start`.
  - Profissional, `status === 'active' && startedAt !== null`: botão "Concluir contrato" (já existe).
  - Cliente, contrato não cancelado/disputado e sem pagamento capturado: botão "Pagar" → abre `PaymentDialog`.
  - Ambas as partes, `status === 'completed'`: botão "Avaliar" → abre `ReviewForm` (some após sucesso; se a API retornar 409, mostra mensagem "Você já avaliou este contrato" e some do mesmo jeito).
  - Ambas as partes: botão "Chat" → `useCreateRoom({ participantId: <outra parte>, contractId: contract.id })`, navega para `/chat/:roomId`.
  - Ambas as partes: botão "Abrir disputa" (já existe, `DisputeDialog` restilizado).

### Frontend — Pagamento (novo)

`frontend/src/features/contracts/components/PaymentDialog.tsx`: modal com seletor de método (`wallet`, `credit_card`, `pix`, `boleto`), usando `Card`/`Button` da Fase 1. Quando `wallet` selecionado, busca `useWallet()` e desabilita a opção com aviso se `balance < contract.total`. Ao confirmar, chama `POST /contracts/:id/payment`; em sucesso, fecha o diálogo e invalida a query do contrato (pra refletir o novo estado de pagamento).

`frontend/src/features/contracts/queries.ts` ganha `usePayment(contractId)` (consome `GET /contracts/:id/payment`, trata 404 como "sem pagamento ainda" via `retry: false` + checagem de erro) e `usePayContract(contractId)` (mutation).

### Frontend — Avaliação (novo)

`frontend/src/features/reviews/components/ReviewForm.tsx`: formulário com seletor de nota (1-5, usando `StarIcon` já usado em `ReviewList`) + textarea de comentário, `react-hook-form` + Zod (mesmo padrão dos outros formulários do projeto). `frontend/src/features/reviews/queries.ts` ganha `useCreateReview()` (mutation pra `POST /reviews`).

### Frontend — Chat vinculado a contrato

Nenhuma mudança de API — só um novo botão em `ContractDetailPage` chamando `useCreateRoom` já existente com o `contractId` preenchido.

### Frontend — Carteira

`WalletPage`, `WalletBalanceCard`, `TransactionList`, `WithdrawDialog`: restilização direta com `Card`/`Button`/`Skeleton`/`EmptyState`, sem mudança de campos ou endpoints.

`frontend/src/features/wallet/components/WalletRevenueChart.tsx` (novo): recebe as transações já buscadas por `useTransactions(1, { limit: 100 })` (o hook existente ganha um parâmetro de limit opcional, default 20 mantido para não quebrar o `WalletPage` atual — só o gráfico passa `limit: 100`), agrupa créditos por mês (últimos 6 meses, incluindo meses com R$ 0,00), renderiza barras verticais com `height` proporcional ao maior valor do período usando `bg-primary`, sem nenhuma biblioteca de gráficos.

## Testes

TDD igual às fases anteriores. O teste de backend do enriquecimento do `contractResponseSchema` roda os testes de integração já existentes de `contract.routes.test.ts` antes/depois (regressão) e adiciona um caso novo que verifica que `clientName`/`professionalHeadline` aparecem corretamente na resposta. Os fluxos de Pagamento e Avaliação, por serem completamente novos, seguem RED→GREEN normal com mocks de API no nível de componente e (para o backend, se necessário) testes de integração cobrindo os casos de erro já existentes no serviço (saldo insuficiente, contrato já pago, contrato não concluído, avaliação duplicada).

## Riscos e decisões já tomadas

- Mostrar nome do cliente exigiu uma mudança pontual de backend, aprovada explicitamente pelo usuário durante o brainstorming.
- Gráfico de receita em CSS puro (sem lib), decisão explícita do usuário.
- Sem pré-checagem de "já avaliei" — tratamento via erro 409, aceito como limitação razoável dado que não existe endpoint de leitura para isso.
