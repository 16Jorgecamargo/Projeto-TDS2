# Fase 10 — Wallet / Payment / Fees / Refunds / Withdrawals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar a carteira interna e o núcleo financeiro do marketplace — pagamento de contrato debitando o cliente e creditando o profissional líquido de taxa, taxa de plataforma registrada por pagamento, estornos e saques (gateway externo simulado, per §8 da spec) — mais a feature frontend `wallet`.

**Architecture:** Cinco módulos backend Fastify (`wallet`, `payment`, `fees`, `refunds`, `withdrawals`) seguindo o padrão routes/controller/service/schemas + testes unit (mocka repos) e integração (`buildTestApp()` com banco real). `wallet` expõe primitivas `credit`/`debit` reutilizadas por `payment`, `refunds` e `withdrawals`. `payment` orquestra a captura: debita o pagador, chama `fees` para registrar a taxa e credita o profissional pelo líquido. Cada módulo consome os contratos fundacionais (fases 3-5) e as entidades TypeORM da fase 6 (dependência circular `payments`↔`contracts` já resolvida na fase 6, Tasks 7 e 8). Frontend React 19/Vite com TanStack Query + react-hook-form/Zod, feature `wallet`.

**Tech Stack:** Node 20 + TypeScript strict, Fastify 5, TypeORM 0.3 + MySQL 8, Zod + fastify-type-provider-zod + zod-openapi, Vitest; React 19 + Vite 6, TanStack Query 5, react-hook-form + Zod, axios, Tailwind 3, Vitest + Testing Library.

## Global Constraints

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. Docs de plano e mensagens de commit em pt-BR.
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética; ao gravar de volta, `.toFixed(2)`.
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

---

## Contratos consumidos (fases 3-5)

Não redefinir; importar. Assinaturas exatas:

```ts
import { buildApp } from '@/app';
import { buildTestApp } from '@/test/buildTestApp';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '@/shared/errors';
import {
  idParamSchema,
  paginationQuerySchema,
  paginatedResponse,
} from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { createUser, createProfessional } from '@/test/factories';
```

- `app.authenticate` (preHandler) popula `request.user = { id: string; role: 'client' | 'professional' | 'admin' }`.
- `requireRole(...roles)` preHandler factory.
- `paginatedResponse(itemSchema)` → `z.object({ items: z.array(itemSchema), page, limit, total })`.
- Data source TypeORM em `@/infra/database/data-source` exporta `AppDataSource`. Services recebem repositórios via `AppDataSource.getRepository(Entity)`.
- Cada `*.routes.ts` exporta `async function <name>Routes(app: FastifyInstance)`; `buildApp` (fase 3) registra sob prefixo `/api` (as rotas abaixo já incluem `/api` no path, seguindo o padrão da fase 9).

## Entidades consumidas (fase 6, Tasks 7-8)

Definidas na fase 6; propriedades em **snake_case** (batem 1:1 com as colunas). Colunas `decimal` chegam como **string**.

```ts
// Wallet
{ id, user_id, balance: string, pending_balance: string, currency: string, created_at, updated_at }
// WalletTransaction
{ id, wallet_id, type: 'credit'|'debit'|'hold'|'release', amount: string, balance_after: string,
  reference_type: 'payment'|'withdrawal'|'refund'|'fee'|'adjustment' | null,
  reference_id: string | null, description: string | null, created_at }
// Payment
{ id, contract_id, payer_id, amount: string,
  status: 'pending'|'authorized'|'captured'|'failed'|'refunded',
  method: 'wallet'|'credit_card'|'pix'|'boleto', external_reference: string | null,
  paid_at: Date | null, created_at, updated_at }
// PlatformFee
{ id, payment_id, percentage: string, amount: string, created_at }
// Refund
{ id, payment_id, amount: string, reason: string | null,
  status: 'pending'|'completed'|'failed', processed_at: Date | null, created_at }
// Withdrawal
{ id, wallet_id, amount: string, payment_method: 'pix'|'bank_transfer',
  status: 'pending'|'processing'|'completed'|'failed', destination: string,
  processed_at: Date | null, created_at, updated_at }
// Contract (fase 6 Task 7)
{ id, demand_id, quote_id, client_id, professional_id, total_amount: string,
  status: 'active'|'completed'|'cancelled'|'disputed', started_at, completed_at,
  cancelled_at, cancelled_by: string | null, cancellation_reason, created_at, updated_at }
// ProfessionalProfile (fase 6 Task 3) — resolve professional_id -> user_id
{ id, user_id, ... }
```

**Nota de identidade financeira:** `Wallet.user_id` e `Payment.payer_id` referenciam `User.id`. `Contract.client_id` é `User.id`, mas `Contract.professional_id` é `ProfessionalProfile.id`. Para creditar o profissional, resolver `Contract.professional_id → ProfessionalProfile.user_id → Wallet.user_id`.

## File Structure

```
backend/src/modules/wallet/
  wallet.schemas.ts        Zod (walletResponse, walletTransactionResponse, transactionListQuery)
  wallet.service.ts        ensureWallet + credit/debit + getByUserId + listTransactions
  wallet.controller.ts     handlers finos
  wallet.routes.ts         GET /api/wallet, GET /api/wallet/transactions
  wallet.service.test.ts   unit (mocka repos)
  wallet.routes.test.ts    integração buildTestApp
backend/src/modules/fees/
  fees.schemas.ts          platformFeeResponse
  fees.service.ts          computeFee + recordFee (DEFAULT_PLATFORM_FEE_PERCENTAGE)
  fees.service.test.ts     unit
backend/src/modules/payment/
  payment.schemas.ts       payContract input, paymentResponse, paymentMethodEnum
  payment.service.ts       payContract (debita pagador, registra taxa, credita profissional líquido)
  payment.controller.ts
  payment.routes.ts        POST /api/contracts/:id/payment, GET /api/contracts/:id/payment, GET /api/payments/:id, GET /api/payments/:id/fee
  payment.service.test.ts  unit
  payment.routes.test.ts   integração
backend/src/modules/refunds/
  refunds.schemas.ts       refundResponse, createRefund input
  refunds.service.ts       refund (reverte crédito do profissional, devolve ao pagador)
  refunds.controller.ts
  refunds.routes.ts        POST /api/payments/:id/refund, GET /api/payments/:id/refunds
  refunds.service.test.ts  unit
  refunds.routes.test.ts   integração
backend/src/modules/withdrawals/
  withdrawals.schemas.ts   withdrawalResponse, requestWithdrawal input, withdrawalMethodEnum
  withdrawals.service.ts   request (debita carteira) + process/fail (mock gateway)
  withdrawals.controller.ts
  withdrawals.routes.ts    POST /api/withdrawals, GET /api/withdrawals, POST /api/withdrawals/:id/process
  withdrawals.service.test.ts  unit
  withdrawals.routes.test.ts   integração

frontend/src/features/wallet/
  api.ts        chamadas axios tipadas
  queries.ts    hooks TanStack Query/mutations
  schemas.ts    Zod (resolver do saque)
  components/WalletBalanceCard.tsx
  components/TransactionList.tsx
  components/WithdrawDialog.tsx
  pages/WalletPage.tsx
  wallet.test.tsx
```

Ordem de execução das tasks (dependências): `wallet` → `fees` → `payment` → `refunds` → `withdrawals` → frontend.

---

## Task 1: Módulo `wallet` — schemas

**Files:**
- Create: `backend/src/modules/wallet/wallet.schemas.ts`

**Interfaces:**
- Consumes: `paginationQuerySchema`, `paginatedResponse` de `@/shared/schemas`.
- Produces: `walletResponseSchema`, `walletTransactionResponseSchema`, `transactionListQuerySchema`, `transactionListResponseSchema`, `transactionTypeEnum`, `transactionReferenceTypeEnum`, `WalletResponse`, `WalletTransactionResponse`.

- [ ] **Step 1: Escrever os schemas**

`backend/src/modules/wallet/wallet.schemas.ts`:

```ts
import { z } from 'zod';
import { paginationQuerySchema, paginatedResponse } from '@/shared/schemas';

export const transactionTypeEnum = z
  .enum(['credit', 'debit', 'hold', 'release'])
  .describe('Tipo de movimentação da carteira')
  .openapi({ example: 'credit' });

export const transactionReferenceTypeEnum = z
  .enum(['payment', 'withdrawal', 'refund', 'fee', 'adjustment'])
  .describe('Origem da movimentação')
  .openapi({ example: 'payment' });

export const walletResponseSchema = z.object({
  id: z.string().uuid().describe('ID da carteira').openapi({ example: 'w1' }),
  userId: z.string().uuid().describe('Dono da carteira').openapi({ example: 'u1' }),
  balance: z.number().describe('Saldo disponível').openapi({ example: 270 }),
  pendingBalance: z.number().describe('Saldo pendente').openapi({ example: 0 }),
  currency: z.string().describe('Moeda').openapi({ example: 'BRL' }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const walletTransactionResponseSchema = z.object({
  id: z.string().uuid().describe('ID da transação').openapi({ example: 't1' }),
  walletId: z.string().uuid().describe('Carteira').openapi({ example: 'w1' }),
  type: transactionTypeEnum,
  amount: z.number().describe('Valor movimentado').openapi({ example: 270 }),
  balanceAfter: z.number().describe('Saldo após a movimentação').openapi({ example: 270 }),
  referenceType: transactionReferenceTypeEnum.nullable().describe('Origem').openapi({ example: 'payment' }),
  referenceId: z.string().uuid().nullable().describe('ID da origem').openapi({ example: 'p1' }),
  description: z.string().nullable().describe('Descrição').openapi({ example: 'Pagamento de contrato' }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const transactionListQuerySchema = paginationQuerySchema.extend({
  type: transactionTypeEnum.optional(),
});

export const transactionListResponseSchema = paginatedResponse(walletTransactionResponseSchema);

export type WalletResponse = z.infer<typeof walletResponseSchema>;
export type WalletTransactionResponse = z.infer<typeof walletTransactionResponseSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/wallet/wallet.schemas.ts
git commit -m "feat(wallet): adiciona schemas zod da carteira"
```

---

## Task 2: Módulo `wallet` — service (ensureWallet, credit/debit, listagem)

**Files:**
- Create: `backend/src/modules/wallet/wallet.service.ts`
- Test: `backend/src/modules/wallet/wallet.service.test.ts`

**Interfaces:**
- Consumes: entidades `Wallet`, `WalletTransaction` (fase 6); `NotFoundError`, `UnprocessableError`.
- Produces:
  ```ts
  interface TransactionRef {
    type: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment';
    id: string | null;
    description?: string;
  }
  class WalletService {
    constructor(deps: { wallets: Repository<Wallet>; transactions: Repository<WalletTransaction> })
    ensureWallet(userId: string): Promise<Wallet>
    getByUserId(userId: string): Promise<WalletResponse>
    listTransactions(userId: string, query: TransactionListQuery): Promise<{ items: WalletTransactionResponse[]; total: number }>
    credit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction>
    debit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction>
  }
  ```
  `credit` soma `amount` ao `balance`; `debit` subtrai e lança `UnprocessableError` se `Number(balance) < amount`. Ambos gravam `WalletTransaction` com `balance_after`. Todo cálculo via `Number()` e persistência via `.toFixed(2)`.

- [ ] **Step 1: Escrever o teste falho**

`backend/src/modules/wallet/wallet.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from './wallet.service';
import { UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'gen', createdAt: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    findAndCount: vi.fn(async () => [[], 0]),
  } as any;
}

describe('WalletService.credit', () => {
  let wallets: any, transactions: any, service: WalletService;
  beforeEach(() => {
    wallets = mockRepo();
    transactions = mockRepo();
    service = new WalletService({ wallets, transactions });
  });

  it('soma ao saldo e grava balance_after (string DECIMAL -> Number)', async () => {
    wallets.findOne.mockResolvedValueOnce({ id: 'w1', user_id: 'u1', balance: '100.00', pending_balance: '0.00', currency: 'BRL' });
    wallets.save.mockImplementationOnce(async (x: any) => x);
    transactions.save.mockImplementationOnce(async (x: any) => ({ id: 't1', created_at: new Date('2026-07-01T12:00:00Z'), ...x }));
    const tx = await service.credit('u1', 170, { type: 'payment', id: 'p1' });
    expect(tx.amount).toBe('170.00');
    expect(tx.balance_after).toBe('270.00');
    expect(wallets.save).toHaveBeenCalledWith(expect.objectContaining({ balance: '270.00' }));
  });
});

describe('WalletService.debit', () => {
  let wallets: any, transactions: any, service: WalletService;
  beforeEach(() => {
    wallets = mockRepo();
    transactions = mockRepo();
    service = new WalletService({ wallets, transactions });
  });

  it('rejeita saldo insuficiente', async () => {
    wallets.findOne.mockResolvedValueOnce({ id: 'w1', user_id: 'u1', balance: '50.00', pending_balance: '0.00', currency: 'BRL' });
    await expect(service.debit('u1', 100, { type: 'withdrawal', id: 'wd1' })).rejects.toBeInstanceOf(UnprocessableError);
  });

  it('subtrai do saldo quando suficiente', async () => {
    wallets.findOne.mockResolvedValueOnce({ id: 'w1', user_id: 'u1', balance: '300.00', pending_balance: '0.00', currency: 'BRL' });
    wallets.save.mockImplementationOnce(async (x: any) => x);
    transactions.save.mockImplementationOnce(async (x: any) => ({ id: 't2', created_at: new Date('2026-07-01T12:00:00Z'), ...x }));
    const tx = await service.debit('u1', 120, { type: 'withdrawal', id: 'wd1' });
    expect(tx.balance_after).toBe('180.00');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/wallet/wallet.service.test.ts`
Expected: FAIL — `Cannot find module './wallet.service'`.

- [ ] **Step 3: Implementar o service**

`backend/src/modules/wallet/wallet.service.ts`:

```ts
import { Repository } from 'typeorm';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { WalletTransaction } from '@/infra/database/entities/wallet-transaction.entity';
import { UnprocessableError } from '@/shared/errors';
import type {
  WalletResponse,
  WalletTransactionResponse,
  TransactionListQuery,
} from './wallet.schemas';

export interface TransactionRef {
  type: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment';
  id: string | null;
  description?: string;
}

interface WalletServiceDeps {
  wallets: Repository<Wallet>;
  transactions: Repository<WalletTransaction>;
}

export class WalletService {
  constructor(private readonly deps: WalletServiceDeps) {}

  private toResponse(wallet: Wallet): WalletResponse {
    return {
      id: wallet.id,
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      pendingBalance: Number(wallet.pending_balance),
      currency: wallet.currency,
      createdAt: wallet.created_at.toISOString(),
    };
  }

  private transactionToResponse(tx: WalletTransaction): WalletTransactionResponse {
    return {
      id: tx.id,
      walletId: tx.wallet_id,
      type: tx.type,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balance_after),
      referenceType: tx.reference_type,
      referenceId: tx.reference_id,
      description: tx.description,
      createdAt: tx.created_at.toISOString(),
    };
  }

  async ensureWallet(userId: string): Promise<Wallet> {
    const existing = await this.deps.wallets.findOne({ where: { user_id: userId } });
    if (existing) return existing;
    return this.deps.wallets.save(
      this.deps.wallets.create({
        user_id: userId,
        balance: '0.00',
        pending_balance: '0.00',
        currency: 'BRL',
      }),
    );
  }

  async getByUserId(userId: string): Promise<WalletResponse> {
    const wallet = await this.ensureWallet(userId);
    return this.toResponse(wallet);
  }

  async listTransactions(
    userId: string,
    query: TransactionListQuery,
  ): Promise<{ items: WalletTransactionResponse[]; total: number }> {
    const wallet = await this.ensureWallet(userId);
    const where: Record<string, unknown> = { wallet_id: wallet.id };
    if (query.type) where.type = query.type;
    const [rows, total] = await this.deps.transactions.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: rows.map((r) => this.transactionToResponse(r)), total };
  }

  async credit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    const nextBalance = Number((Number(wallet.balance) + amount).toFixed(2));
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'credit',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }

  async debit(userId: string, amount: number, ref: TransactionRef): Promise<WalletTransaction> {
    const wallet = await this.ensureWallet(userId);
    if (Number(wallet.balance) < amount) {
      throw new UnprocessableError('Saldo insuficiente');
    }
    const nextBalance = Number((Number(wallet.balance) - amount).toFixed(2));
    wallet.balance = nextBalance.toFixed(2);
    await this.deps.wallets.save(wallet);
    return this.deps.transactions.save(
      this.deps.transactions.create({
        wallet_id: wallet.id,
        type: 'debit',
        amount: amount.toFixed(2),
        balance_after: nextBalance.toFixed(2),
        reference_type: ref.type,
        reference_id: ref.id,
        description: ref.description ?? null,
      }),
    );
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/wallet/wallet.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/wallet/wallet.service.ts backend/src/modules/wallet/wallet.service.test.ts
git commit -m "feat(wallet): implementa carteira com credito e debito"
```

---

## Task 3: Módulo `wallet` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/wallet/wallet.controller.ts`
- Create: `backend/src/modules/wallet/wallet.routes.ts`
- Test: `backend/src/modules/wallet/wallet.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `walletRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`; `buildTestApp`, `createUser`.
- Produces: `walletRoutes(app)`; rotas `GET /api/wallet`, `GET /api/wallet/transactions`.

- [ ] **Step 1: Teste de integração falho**

`backend/src/modules/wallet/wallet.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { createUser } from '@/test/factories';

describe('wallet routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('cria carteira sob demanda e retorna saldo zero como number', async () => {
    const { token } = await createUser(app, { role: 'professional' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.balance).toBe(0);
    expect(typeof body.balance).toBe('number');
    expect(body.currency).toBe('BRL');
  });

  it('lista transações paginadas (vazio inicialmente)', async () => {
    const { token } = await createUser(app, { role: 'professional' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/wallet/transactions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
    expect(res.json().total).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/wallet/wallet.routes.test.ts`
Expected: FAIL — rota `/api/wallet` inexistente (404).

- [ ] **Step 3: Implementar controller**

`backend/src/modules/wallet/wallet.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { WalletTransaction } from '@/infra/database/entities/wallet-transaction.entity';
import { WalletService } from './wallet.service';
import type { TransactionListQuery } from './wallet.schemas';

export function walletService(): WalletService {
  return new WalletService({
    wallets: AppDataSource.getRepository(Wallet),
    transactions: AppDataSource.getRepository(WalletTransaction),
  });
}

export async function getWallet(req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await walletService().getByUserId(req.user.id));
}

export async function listTransactions(
  req: FastifyRequest<{ Querystring: TransactionListQuery }>,
  reply: FastifyReply,
) {
  const { items, total } = await walletService().listTransactions(req.user.id, req.query);
  return reply.send({ items, page: req.query.page, limit: req.query.limit, total });
}
```

- [ ] **Step 4: Implementar routes**

`backend/src/modules/wallet/wallet.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import {
  walletResponseSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
} from './wallet.schemas';
import { getWallet, listTransactions } from './wallet.controller';

export async function walletRoutes(app: FastifyInstance) {
  app.get('/api/wallet', {
    preHandler: [app.authenticate],
    schema: { tags: ['wallet'], summary: 'Minha carteira', response: { 200: walletResponseSchema } },
  }, getWallet);

  app.get('/api/wallet/transactions', {
    preHandler: [app.authenticate],
    schema: { tags: ['wallet'], summary: 'Extrato da carteira', querystring: transactionListQuerySchema, response: { 200: transactionListResponseSchema } },
  }, listTransactions);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

Em `backend/src/app.ts`, no bloco de registro de módulos:

```ts
import { walletRoutes } from '@/modules/wallet/wallet.routes';
await app.register(walletRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/wallet/wallet.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/wallet/wallet.controller.ts backend/src/modules/wallet/wallet.routes.ts backend/src/modules/wallet/wallet.routes.test.ts backend/src/app.ts
git commit -m "feat(wallet): expoe rotas de carteira e extrato"
```

---

## Task 4: Módulo `fees` — schemas + service

**Files:**
- Create: `backend/src/modules/fees/fees.schemas.ts`
- Create: `backend/src/modules/fees/fees.service.ts`
- Test: `backend/src/modules/fees/fees.service.test.ts`

**Interfaces:**
- Consumes: entidade `PlatformFee` (fase 6).
- Produces:
  ```ts
  export const DEFAULT_PLATFORM_FEE_PERCENTAGE = 10;
  // schemas
  platformFeeResponseSchema, PlatformFeeResponse
  // service
  class FeesService {
    constructor(deps: { fees: Repository<PlatformFee> })
    computeFee(baseAmount: number): { percentage: number; amount: number }
    recordFee(paymentId: string, baseAmount: number): Promise<PlatformFeeResponse>
    findByPayment(paymentId: string): Promise<PlatformFeeResponse | null>
  }
  ```
  `amount = round(baseAmount * percentage / 100)` com 2 casas.

- [ ] **Step 1: Escrever schemas**

`backend/src/modules/fees/fees.schemas.ts`:

```ts
import { z } from 'zod';

export const platformFeeResponseSchema = z.object({
  id: z.string().uuid().describe('ID da taxa').openapi({ example: 'f1' }),
  paymentId: z.string().uuid().describe('Pagamento').openapi({ example: 'p1' }),
  percentage: z.number().describe('Percentual aplicado').openapi({ example: 10 }),
  amount: z.number().describe('Valor da taxa').openapi({ example: 30 }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type PlatformFeeResponse = z.infer<typeof platformFeeResponseSchema>;
```

- [ ] **Step 2: Teste falho (taxa = 10% arredondado)**

`backend/src/modules/fees/fees.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeesService, DEFAULT_PLATFORM_FEE_PERCENTAGE } from './fees.service';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'f1', created_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(async () => null),
  } as any;
}

describe('FeesService', () => {
  let fees: any, service: FeesService;
  beforeEach(() => { fees = mockRepo(); service = new FeesService({ fees }); });

  it('usa percentual padrão', () => {
    expect(DEFAULT_PLATFORM_FEE_PERCENTAGE).toBe(10);
  });

  it('computa taxa arredondada em 2 casas', () => {
    expect(service.computeFee(300)).toEqual({ percentage: 10, amount: 30 });
    expect(service.computeFee(99.99)).toEqual({ percentage: 10, amount: 10 });
  });

  it('grava taxa e retorna amount como number', async () => {
    const result = await service.recordFee('p1', 300);
    expect(result.amount).toBe(30);
    expect(typeof result.amount).toBe('number');
    expect(fees.save).toHaveBeenCalledWith(expect.objectContaining({ payment_id: 'p1', percentage: '10.00', amount: '30.00' }));
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/fees/fees.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

`backend/src/modules/fees/fees.service.ts`:

```ts
import { Repository } from 'typeorm';
import { PlatformFee } from '@/infra/database/entities/platform-fee.entity';
import type { PlatformFeeResponse } from './fees.schemas';

export const DEFAULT_PLATFORM_FEE_PERCENTAGE = 10;

interface FeesServiceDeps {
  fees: Repository<PlatformFee>;
}

export class FeesService {
  constructor(private readonly deps: FeesServiceDeps) {}

  private toResponse(fee: PlatformFee): PlatformFeeResponse {
    return {
      id: fee.id,
      paymentId: fee.payment_id,
      percentage: Number(fee.percentage),
      amount: Number(fee.amount),
      createdAt: fee.created_at.toISOString(),
    };
  }

  computeFee(baseAmount: number): { percentage: number; amount: number } {
    const percentage = DEFAULT_PLATFORM_FEE_PERCENTAGE;
    const amount = Number(((baseAmount * percentage) / 100).toFixed(2));
    return { percentage, amount };
  }

  async recordFee(paymentId: string, baseAmount: number): Promise<PlatformFeeResponse> {
    const { percentage, amount } = this.computeFee(baseAmount);
    const fee = await this.deps.fees.save(
      this.deps.fees.create({
        payment_id: paymentId,
        percentage: percentage.toFixed(2),
        amount: amount.toFixed(2),
      }),
    );
    return this.toResponse(fee);
  }

  async findByPayment(paymentId: string): Promise<PlatformFeeResponse | null> {
    const fee = await this.deps.fees.findOne({ where: { payment_id: paymentId } });
    return fee ? this.toResponse(fee) : null;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/fees/fees.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/fees/fees.schemas.ts backend/src/modules/fees/fees.service.ts backend/src/modules/fees/fees.service.test.ts
git commit -m "feat(fees): implementa taxa de plataforma por pagamento"
```

---

## Task 5: Módulo `payment` — schemas

**Files:**
- Create: `backend/src/modules/payment/payment.schemas.ts`

**Interfaces:**
- Produces: `paymentMethodEnum`, `paymentStatusEnum`, `payContractSchema`, `paymentResponseSchema`, `PayContractInput`, `PaymentResponse`.

- [ ] **Step 1: Escrever schemas**

`backend/src/modules/payment/payment.schemas.ts`:

```ts
import { z } from 'zod';

export const paymentMethodEnum = z
  .enum(['wallet', 'credit_card', 'pix', 'boleto'])
  .describe('Método de pagamento')
  .openapi({ example: 'wallet' });

export const paymentStatusEnum = z
  .enum(['pending', 'authorized', 'captured', 'failed', 'refunded'])
  .describe('Estado do pagamento')
  .openapi({ example: 'captured' });

export const payContractSchema = z.object({
  method: paymentMethodEnum,
});

export const paymentResponseSchema = z.object({
  id: z.string().uuid().describe('ID do pagamento').openapi({ example: 'p1' }),
  contractId: z.string().uuid().describe('Contrato pago').openapi({ example: 'c1' }),
  payerId: z.string().uuid().describe('Pagador').openapi({ example: 'cl1' }),
  amount: z.number().describe('Valor pago').openapi({ example: 300 }),
  status: paymentStatusEnum,
  method: paymentMethodEnum,
  paidAt: z.string().datetime().nullable().describe('Data da captura').openapi({ example: '2026-07-01T12:00:00Z' }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type PayContractInput = z.infer<typeof payContractSchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/payment/payment.schemas.ts
git commit -m "feat(payment): adiciona schemas zod do pagamento"
```

---

## Task 6: Módulo `payment` — service (captura orquestrada)

**Files:**
- Create: `backend/src/modules/payment/payment.service.ts`
- Test: `backend/src/modules/payment/payment.service.test.ts`

**Interfaces:**
- Consumes: entidades `Payment`, `Contract`, `ProfessionalProfile` (fase 6); `WalletService` (Task 2), `FeesService` (Task 4); `NotFoundError`, `ForbiddenError`, `ConflictError`, `UnprocessableError`.
- Produces:
  ```ts
  class PaymentService {
    constructor(deps: {
      payments: Repository<Payment>;
      contracts: Repository<Contract>;
      professionals: Repository<ProfessionalProfile>;
      wallet: WalletService;
      fees: FeesService;
    })
    payContract(clientId: string, contractId: string, input: PayContractInput): Promise<PaymentResponse>
    getById(id: string): Promise<PaymentResponse>
    getByContract(contractId: string): Promise<PaymentResponse>
    getFee(paymentId: string): Promise<PlatformFeeResponse>
  }
  ```
  `payContract`: valida contrato do cliente e status ≠ `cancelled`/`disputed`; bloqueia pagamento duplicado capturado (`ConflictError`); cria `Payment` `pending`; se `method='wallet'` debita a carteira do pagador (senão simula captura externa); registra taxa via `FeesService`; credita a carteira do profissional (`ProfessionalProfile.user_id`) pelo líquido `amount - fee`; marca `captured` + `paid_at`.

- [ ] **Step 1: Escrever o teste falho**

`backend/src/modules/payment/payment.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './payment.service';
import { ConflictError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'p1', created_at: new Date('2026-07-01T12:00:00Z'), updated_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
  } as any;
}

describe('PaymentService.payContract', () => {
  let payments: any, contracts: any, professionals: any, wallet: any, fees: any, service: PaymentService;
  beforeEach(() => {
    payments = mockRepo();
    contracts = mockRepo();
    professionals = mockRepo();
    wallet = { debit: vi.fn(async () => ({})), credit: vi.fn(async () => ({})) };
    fees = { recordFee: vi.fn(async () => ({ id: 'f1', paymentId: 'p1', percentage: 10, amount: 30, createdAt: '2026-07-01T12:00:00Z' })) };
    service = new PaymentService({ payments, contracts, professionals, wallet, fees });
  });

  it('debita pagador, registra taxa e credita profissional pelo líquido', async () => {
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', client_id: 'cl1', professional_id: 'prof1', total_amount: '300.00', status: 'completed' });
    payments.findOne.mockResolvedValueOnce(null);
    professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
    payments.save
      .mockImplementationOnce(async (x: any) => ({ id: 'p1', created_at: new Date('2026-07-01T12:00:00Z'), ...x }))
      .mockImplementationOnce(async (x: any) => ({ ...x }));

    const result = await service.payContract('cl1', 'c1', { method: 'wallet' });

    expect(wallet.debit).toHaveBeenCalledWith('cl1', 300, expect.objectContaining({ type: 'payment' }));
    expect(fees.recordFee).toHaveBeenCalledWith('p1', 300);
    expect(wallet.credit).toHaveBeenCalledWith('prouser1', 270, expect.objectContaining({ type: 'payment' }));
    expect(result.status).toBe('captured');
    expect(result.amount).toBe(300);
    expect(typeof result.amount).toBe('number');
  });

  it('não debita carteira quando método externo', async () => {
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', client_id: 'cl1', professional_id: 'prof1', total_amount: '300.00', status: 'completed' });
    payments.findOne.mockResolvedValueOnce(null);
    professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
    payments.save.mockImplementation(async (x: any) => ({ id: 'p1', created_at: new Date('2026-07-01T12:00:00Z'), ...x }));
    await service.payContract('cl1', 'c1', { method: 'pix' });
    expect(wallet.debit).not.toHaveBeenCalled();
    expect(wallet.credit).toHaveBeenCalledWith('prouser1', 270, expect.objectContaining({ type: 'payment' }));
  });

  it('rejeita pagamento já capturado', async () => {
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', client_id: 'cl1', professional_id: 'prof1', total_amount: '300.00', status: 'completed' });
    payments.findOne.mockResolvedValueOnce({ id: 'p0', status: 'captured' });
    await expect(service.payContract('cl1', 'c1', { method: 'wallet' })).rejects.toBeInstanceOf(ConflictError);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/payment/payment.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar service**

`backend/src/modules/payment/payment.service.ts`:

```ts
import { Repository } from 'typeorm';
import { Payment } from '@/infra/database/entities/payment.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { ProfessionalProfile } from '@/infra/database/entities/professional-profile.entity';
import { NotFoundError, ForbiddenError, ConflictError, UnprocessableError } from '@/shared/errors';
import { WalletService } from '@/modules/wallet/wallet.service';
import { FeesService } from '@/modules/fees/fees.service';
import type { PlatformFeeResponse } from '@/modules/fees/fees.schemas';
import type { PayContractInput, PaymentResponse } from './payment.schemas';

interface PaymentServiceDeps {
  payments: Repository<Payment>;
  contracts: Repository<Contract>;
  professionals: Repository<ProfessionalProfile>;
  wallet: WalletService;
  fees: FeesService;
}

export class PaymentService {
  constructor(private readonly deps: PaymentServiceDeps) {}

  private toResponse(payment: Payment): PaymentResponse {
    return {
      id: payment.id,
      contractId: payment.contract_id,
      payerId: payment.payer_id,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      paidAt: payment.paid_at ? payment.paid_at.toISOString() : null,
      createdAt: payment.created_at.toISOString(),
    };
  }

  async payContract(
    clientId: string,
    contractId: string,
    input: PayContractInput,
  ): Promise<PaymentResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    if (contract.client_id !== clientId) throw new ForbiddenError('Não é o cliente do contrato');
    if (contract.status === 'cancelled' || contract.status === 'disputed') {
      throw new UnprocessableError('Contrato não pode ser pago');
    }
    const existing = await this.deps.payments.findOne({
      where: { contract_id: contractId, status: 'captured' },
    });
    if (existing) throw new ConflictError('Contrato já pago');

    const amount = Number(contract.total_amount);
    const professional = await this.deps.professionals.findOne({
      where: { id: contract.professional_id },
    });
    if (!professional) throw new NotFoundError('Profissional não encontrado');

    let payment = await this.deps.payments.save(
      this.deps.payments.create({
        contract_id: contractId,
        payer_id: clientId,
        amount: amount.toFixed(2),
        status: 'pending',
        method: input.method,
        external_reference: null,
        paid_at: null,
      }),
    );

    if (input.method === 'wallet') {
      await this.deps.wallet.debit(clientId, amount, {
        type: 'payment',
        id: payment.id,
        description: 'Pagamento de contrato',
      });
    }

    const fee = await this.deps.fees.recordFee(payment.id, amount);
    const net = Number((amount - fee.amount).toFixed(2));
    await this.deps.wallet.credit(professional.user_id, net, {
      type: 'payment',
      id: payment.id,
      description: 'Recebimento de contrato',
    });

    payment.status = 'captured';
    payment.paid_at = new Date();
    payment = await this.deps.payments.save(payment);
    return this.toResponse(payment);
  }

  async getById(id: string): Promise<PaymentResponse> {
    const payment = await this.deps.payments.findOne({ where: { id } });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    return this.toResponse(payment);
  }

  async getByContract(contractId: string): Promise<PaymentResponse> {
    const payment = await this.deps.payments.findOne({
      where: { contract_id: contractId },
      order: { created_at: 'DESC' },
    });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    return this.toResponse(payment);
  }

  async getFee(paymentId: string): Promise<PlatformFeeResponse> {
    const fee = await this.deps.fees.findByPayment(paymentId);
    if (!fee) throw new NotFoundError('Taxa não encontrada');
    return fee;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/payment/payment.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payment/payment.service.ts backend/src/modules/payment/payment.service.test.ts
git commit -m "feat(payment): implementa captura debitando cliente e creditando profissional"
```

---

## Task 7: Módulo `payment` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/payment/payment.controller.ts`
- Create: `backend/src/modules/payment/payment.routes.ts`
- Test: `backend/src/modules/payment/payment.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `paymentRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`, `requireRole('client')`; `buildTestApp`, `createUser`, `createProfessional`.
- Produces: `paymentRoutes(app)`; rotas `POST /api/contracts/:id/payment` (client), `GET /api/contracts/:id/payment`, `GET /api/payments/:id`, `GET /api/payments/:id/fee`.

- [ ] **Step 1: Teste de integração falho**

Consome fixtures de contrato. Assume que o helper `createContract(app, ...)` existe em `@/test/factories` (fase 5 / fase 9). O teste semeia um contrato pago com carteira previamente creditada.

`backend/src/modules/payment/payment.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { AppDataSource } from '@/infra/database/data-source';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { createUser, createProfessional, createContract } from '@/test/factories';

async function creditWallet(userId: string, amount: string): Promise<void> {
  const repo = AppDataSource.getRepository(Wallet);
  const wallet = await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
  void wallet;
}

describe('payment routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('cliente paga contrato via carteira e taxa fica registrada', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const contract = await createContract(app, { client, pro, total: '300.00' });
    await creditWallet(client.user.id, '500.00');

    const pay = await app.inject({
      method: 'POST',
      url: `/api/contracts/${contract.id}/payment`,
      headers: { authorization: `Bearer ${client.token}` },
      payload: { method: 'wallet' },
    });
    expect(pay.statusCode).toBe(201);
    expect(pay.json().status).toBe('captured');
    expect(pay.json().amount).toBe(300);

    const fee = await app.inject({
      method: 'GET',
      url: `/api/payments/${pay.json().id}/fee`,
      headers: { authorization: `Bearer ${client.token}` },
    });
    expect(fee.statusCode).toBe(200);
    expect(fee.json().amount).toBe(30);

    const wallet = await app.inject({
      method: 'GET',
      url: '/api/wallet',
      headers: { authorization: `Bearer ${pro.token}` },
    });
    expect(wallet.json().balance).toBe(270);
  });

  it('bloqueia segundo pagamento do mesmo contrato', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const contract = await createContract(app, { client, pro, total: '100.00' });
    await creditWallet(client.user.id, '500.00');
    await app.inject({
      method: 'POST', url: `/api/contracts/${contract.id}/payment`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { method: 'wallet' },
    });
    const second = await app.inject({
      method: 'POST', url: `/api/contracts/${contract.id}/payment`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { method: 'wallet' },
    });
    expect(second.statusCode).toBe(409);
  });
});
```

> **Nota ao implementador:** se `createContract` ainda não existir em `@/test/factories`, adicioná-lo seguindo o padrão das factories da fase 5 (persistir `ServiceDemand` + `Quote` + `Contract` com `total_amount` e status `completed`), retornando `{ id }`. Não invente assinatura divergente das demais factories.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/payment/payment.routes.test.ts`
Expected: FAIL — rota inexistente (404).

- [ ] **Step 3: Implementar controller**

`backend/src/modules/payment/payment.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Payment } from '@/infra/database/entities/payment.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { ProfessionalProfile } from '@/infra/database/entities/professional-profile.entity';
import { PlatformFee } from '@/infra/database/entities/platform-fee.entity';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { WalletTransaction } from '@/infra/database/entities/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { FeesService } from '@/modules/fees/fees.service';
import { PaymentService } from './payment.service';
import type { PayContractInput } from './payment.schemas';

export function paymentService(): PaymentService {
  return new PaymentService({
    payments: AppDataSource.getRepository(Payment),
    contracts: AppDataSource.getRepository(Contract),
    professionals: AppDataSource.getRepository(ProfessionalProfile),
    wallet: new WalletService({
      wallets: AppDataSource.getRepository(Wallet),
      transactions: AppDataSource.getRepository(WalletTransaction),
    }),
    fees: new FeesService({ fees: AppDataSource.getRepository(PlatformFee) }),
  });
}

export async function payContract(
  req: FastifyRequest<{ Params: { id: string }; Body: PayContractInput }>,
  reply: FastifyReply,
) {
  const result = await paymentService().payContract(req.user.id, req.params.id, req.body);
  return reply.status(201).send(result);
}

export async function getContractPayment(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await paymentService().getByContract(req.params.id));
}

export async function getPayment(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await paymentService().getById(req.params.id));
}

export async function getPaymentFee(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await paymentService().getFee(req.params.id));
}
```

- [ ] **Step 4: Implementar routes**

`backend/src/modules/payment/payment.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { platformFeeResponseSchema } from '@/modules/fees/fees.schemas';
import { payContractSchema, paymentResponseSchema } from './payment.schemas';
import {
  payContract,
  getContractPayment,
  getPayment,
  getPaymentFee,
} from './payment.controller';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/api/contracts/:id/payment', {
    preHandler: [app.authenticate, requireRole('client')],
    schema: { tags: ['payment'], summary: 'Pagar contrato', params: idParamSchema, body: payContractSchema, response: { 201: paymentResponseSchema } },
  }, payContract);

  app.get('/api/contracts/:id/payment', {
    preHandler: [app.authenticate],
    schema: { tags: ['payment'], summary: 'Pagamento do contrato', params: idParamSchema, response: { 200: paymentResponseSchema } },
  }, getContractPayment);

  app.get('/api/payments/:id', {
    preHandler: [app.authenticate],
    schema: { tags: ['payment'], summary: 'Detalhe do pagamento', params: idParamSchema, response: { 200: paymentResponseSchema } },
  }, getPayment);

  app.get('/api/payments/:id/fee', {
    preHandler: [app.authenticate],
    schema: { tags: ['payment'], summary: 'Taxa do pagamento', params: idParamSchema, response: { 200: platformFeeResponseSchema } },
  }, getPaymentFee);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

```ts
import { paymentRoutes } from '@/modules/payment/payment.routes';
await app.register(paymentRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/payment/payment.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/payment/payment.controller.ts backend/src/modules/payment/payment.routes.ts backend/src/modules/payment/payment.routes.test.ts backend/src/app.ts
git commit -m "feat(payment): expoe rotas de pagamento de contrato"
```

---

## Task 8: Módulo `refunds` — schemas + service

**Files:**
- Create: `backend/src/modules/refunds/refunds.schemas.ts`
- Create: `backend/src/modules/refunds/refunds.service.ts`
- Test: `backend/src/modules/refunds/refunds.service.test.ts`

**Interfaces:**
- Consumes: entidades `Refund`, `Payment`, `Contract`, `ProfessionalProfile` (fase 6); `WalletService` (Task 2), `FeesService` (Task 4); `NotFoundError`, `UnprocessableError`.
- Produces:
  ```ts
  // schemas
  refundStatusEnum, createRefundSchema, refundResponseSchema, CreateRefundInput, RefundResponse
  // service
  class RefundsService {
    constructor(deps: {
      refunds: Repository<Refund>; payments: Repository<Payment>;
      contracts: Repository<Contract>; professionals: Repository<ProfessionalProfile>;
      wallet: WalletService; fees: FeesService;
    })
    refund(paymentId: string, input: CreateRefundInput): Promise<RefundResponse>
    listByPayment(paymentId: string): Promise<RefundResponse[]>
  }
  ```
  `refund`: só para pagamento `captured` (senão `UnprocessableError`); estorna o profissional pelo líquido (`amount - fee`) via `wallet.debit`; se `method='wallet'` devolve `amount` ao pagador via `wallet.credit`; marca `Payment.status='refunded'`; cria `Refund` `completed` + `processed_at`.

- [ ] **Step 1: Escrever schemas**

`backend/src/modules/refunds/refunds.schemas.ts`:

```ts
import { z } from 'zod';

export const refundStatusEnum = z
  .enum(['pending', 'completed', 'failed'])
  .describe('Estado do estorno')
  .openapi({ example: 'completed' });

export const createRefundSchema = z.object({
  reason: z.string().min(3).max(1000).nullable().describe('Motivo do estorno').openapi({ example: 'Serviço não executado' }),
});

export const refundResponseSchema = z.object({
  id: z.string().uuid().describe('ID do estorno').openapi({ example: 'r1' }),
  paymentId: z.string().uuid().describe('Pagamento estornado').openapi({ example: 'p1' }),
  amount: z.number().describe('Valor estornado').openapi({ example: 300 }),
  reason: z.string().nullable().describe('Motivo').openapi({ example: 'Serviço não executado' }),
  status: refundStatusEnum,
  processedAt: z.string().datetime().nullable().describe('Processamento').openapi({ example: '2026-07-01T12:00:00Z' }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type RefundResponse = z.infer<typeof refundResponseSchema>;
```

- [ ] **Step 2: Teste falho**

`backend/src/modules/refunds/refunds.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundsService } from './refunds.service';
import { UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'r1', created_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
  } as any;
}

describe('RefundsService.refund', () => {
  let refunds: any, payments: any, contracts: any, professionals: any, wallet: any, fees: any, service: RefundsService;
  beforeEach(() => {
    refunds = mockRepo(); payments = mockRepo(); contracts = mockRepo(); professionals = mockRepo();
    wallet = { debit: vi.fn(async () => ({})), credit: vi.fn(async () => ({})) };
    fees = { findByPayment: vi.fn(async () => ({ id: 'f1', paymentId: 'p1', percentage: 10, amount: 30, createdAt: '2026-07-01T12:00:00Z' })) };
    service = new RefundsService({ refunds, payments, contracts, professionals, wallet, fees });
  });

  it('estorna profissional pelo líquido e devolve ao pagador quando carteira', async () => {
    payments.findOne.mockResolvedValueOnce({ id: 'p1', contract_id: 'c1', payer_id: 'cl1', amount: '300.00', status: 'captured', method: 'wallet' });
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', professional_id: 'prof1' });
    professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
    payments.save.mockImplementationOnce(async (x: any) => x);

    const result = await service.refund('p1', { reason: 'cancelado' });

    expect(wallet.debit).toHaveBeenCalledWith('prouser1', 270, expect.objectContaining({ type: 'refund' }));
    expect(wallet.credit).toHaveBeenCalledWith('cl1', 300, expect.objectContaining({ type: 'refund' }));
    expect(result.status).toBe('completed');
    expect(result.amount).toBe(300);
  });

  it('não credita pagador quando método externo', async () => {
    payments.findOne.mockResolvedValueOnce({ id: 'p1', contract_id: 'c1', payer_id: 'cl1', amount: '300.00', status: 'captured', method: 'pix' });
    contracts.findOne.mockResolvedValueOnce({ id: 'c1', professional_id: 'prof1' });
    professionals.findOne.mockResolvedValueOnce({ id: 'prof1', user_id: 'prouser1' });
    payments.save.mockImplementationOnce(async (x: any) => x);
    await service.refund('p1', { reason: null });
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('rejeita estorno de pagamento não capturado', async () => {
    payments.findOne.mockResolvedValueOnce({ id: 'p1', status: 'pending', method: 'wallet' });
    await expect(service.refund('p1', { reason: null })).rejects.toBeInstanceOf(UnprocessableError);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/refunds/refunds.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

`backend/src/modules/refunds/refunds.service.ts`:

```ts
import { Repository } from 'typeorm';
import { Refund } from '@/infra/database/entities/refund.entity';
import { Payment } from '@/infra/database/entities/payment.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { ProfessionalProfile } from '@/infra/database/entities/professional-profile.entity';
import { NotFoundError, UnprocessableError } from '@/shared/errors';
import { WalletService } from '@/modules/wallet/wallet.service';
import { FeesService } from '@/modules/fees/fees.service';
import type { CreateRefundInput, RefundResponse } from './refunds.schemas';

interface RefundsServiceDeps {
  refunds: Repository<Refund>;
  payments: Repository<Payment>;
  contracts: Repository<Contract>;
  professionals: Repository<ProfessionalProfile>;
  wallet: WalletService;
  fees: FeesService;
}

export class RefundsService {
  constructor(private readonly deps: RefundsServiceDeps) {}

  private toResponse(refund: Refund): RefundResponse {
    return {
      id: refund.id,
      paymentId: refund.payment_id,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      processedAt: refund.processed_at ? refund.processed_at.toISOString() : null,
      createdAt: refund.created_at.toISOString(),
    };
  }

  async refund(paymentId: string, input: CreateRefundInput): Promise<RefundResponse> {
    const payment = await this.deps.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    if (payment.status !== 'captured') throw new UnprocessableError('Pagamento não pode ser estornado');

    const contract = await this.deps.contracts.findOne({ where: { id: payment.contract_id } });
    if (!contract) throw new NotFoundError('Contrato não encontrado');
    const professional = await this.deps.professionals.findOne({ where: { id: contract.professional_id } });
    if (!professional) throw new NotFoundError('Profissional não encontrado');

    const amount = Number(payment.amount);
    const fee = await this.deps.fees.findByPayment(paymentId);
    const feeAmount = fee ? fee.amount : 0;
    const net = Number((amount - feeAmount).toFixed(2));

    await this.deps.wallet.debit(professional.user_id, net, {
      type: 'refund',
      id: paymentId,
      description: 'Estorno de contrato',
    });
    if (payment.method === 'wallet') {
      await this.deps.wallet.credit(payment.payer_id, amount, {
        type: 'refund',
        id: paymentId,
        description: 'Estorno de pagamento',
      });
    }

    payment.status = 'refunded';
    await this.deps.payments.save(payment);

    const refund = await this.deps.refunds.save(
      this.deps.refunds.create({
        payment_id: paymentId,
        amount: amount.toFixed(2),
        reason: input.reason,
        status: 'completed',
        processed_at: new Date(),
      }),
    );
    return this.toResponse(refund);
  }

  async listByPayment(paymentId: string): Promise<RefundResponse[]> {
    const rows = await this.deps.refunds.find({
      where: { payment_id: paymentId },
      order: { created_at: 'DESC' },
    });
    return rows.map((r) => this.toResponse(r));
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/refunds/refunds.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/refunds/refunds.schemas.ts backend/src/modules/refunds/refunds.service.ts backend/src/modules/refunds/refunds.service.test.ts
git commit -m "feat(refunds): implementa estorno revertendo carteiras"
```

---

## Task 9: Módulo `refunds` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/refunds/refunds.controller.ts`
- Create: `backend/src/modules/refunds/refunds.routes.ts`
- Test: `backend/src/modules/refunds/refunds.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `refundsRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`, `requireRole('admin')`; `buildTestApp`, `createUser`, `createProfessional`, `createContract`.
- Produces: `refundsRoutes(app)`; rotas `POST /api/payments/:id/refund` (admin), `GET /api/payments/:id/refunds`.

- [ ] **Step 1: Teste de integração falho**

`backend/src/modules/refunds/refunds.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { AppDataSource } from '@/infra/database/data-source';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { createUser, createProfessional, createContract } from '@/test/factories';

async function seedWallet(userId: string, amount: string): Promise<void> {
  const repo = AppDataSource.getRepository(Wallet);
  await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
}

describe('refund routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('admin estorna pagamento capturado', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const admin = await createUser(app, { role: 'admin' });
    const contract = await createContract(app, { client, pro, total: '200.00' });
    await seedWallet(client.user.id, '500.00');

    const pay = await app.inject({
      method: 'POST', url: `/api/contracts/${contract.id}/payment`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { method: 'wallet' },
    });
    const paymentId = pay.json().id;

    const refund = await app.inject({
      method: 'POST', url: `/api/payments/${paymentId}/refund`,
      headers: { authorization: `Bearer ${admin.token}` }, payload: { reason: 'cancelado' },
    });
    expect(refund.statusCode).toBe(201);
    expect(refund.json().status).toBe('completed');
    expect(refund.json().amount).toBe(200);

    const clientWallet = await app.inject({
      method: 'GET', url: '/api/wallet', headers: { authorization: `Bearer ${client.token}` },
    });
    expect(clientWallet.json().balance).toBe(500);
  });

  it('cliente não pode estornar', async () => {
    const client = await createUser(app, { role: 'client' });
    const pro = await createProfessional(app);
    const contract = await createContract(app, { client, pro, total: '100.00' });
    await seedWallet(client.user.id, '500.00');
    const pay = await app.inject({
      method: 'POST', url: `/api/contracts/${contract.id}/payment`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { method: 'wallet' },
    });
    const res = await app.inject({
      method: 'POST', url: `/api/payments/${pay.json().id}/refund`,
      headers: { authorization: `Bearer ${client.token}` }, payload: { reason: null },
    });
    expect(res.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/refunds/refunds.routes.test.ts`
Expected: FAIL — rota inexistente (404).

- [ ] **Step 3: Implementar controller**

`backend/src/modules/refunds/refunds.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Refund } from '@/infra/database/entities/refund.entity';
import { Payment } from '@/infra/database/entities/payment.entity';
import { Contract } from '@/infra/database/entities/contract.entity';
import { ProfessionalProfile } from '@/infra/database/entities/professional-profile.entity';
import { PlatformFee } from '@/infra/database/entities/platform-fee.entity';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { WalletTransaction } from '@/infra/database/entities/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { FeesService } from '@/modules/fees/fees.service';
import { RefundsService } from './refunds.service';
import type { CreateRefundInput } from './refunds.schemas';

export function refundsService(): RefundsService {
  return new RefundsService({
    refunds: AppDataSource.getRepository(Refund),
    payments: AppDataSource.getRepository(Payment),
    contracts: AppDataSource.getRepository(Contract),
    professionals: AppDataSource.getRepository(ProfessionalProfile),
    wallet: new WalletService({
      wallets: AppDataSource.getRepository(Wallet),
      transactions: AppDataSource.getRepository(WalletTransaction),
    }),
    fees: new FeesService({ fees: AppDataSource.getRepository(PlatformFee) }),
  });
}

export async function createRefund(
  req: FastifyRequest<{ Params: { id: string }; Body: CreateRefundInput }>,
  reply: FastifyReply,
) {
  const result = await refundsService().refund(req.params.id, req.body);
  return reply.status(201).send(result);
}

export async function listPaymentRefunds(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await refundsService().listByPayment(req.params.id));
}
```

- [ ] **Step 4: Implementar routes**

`backend/src/modules/refunds/refunds.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { createRefundSchema, refundResponseSchema } from './refunds.schemas';
import { createRefund, listPaymentRefunds } from './refunds.controller';

export async function refundsRoutes(app: FastifyInstance) {
  app.post('/api/payments/:id/refund', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['refunds'], summary: 'Estornar pagamento', params: idParamSchema, body: createRefundSchema, response: { 201: refundResponseSchema } },
  }, createRefund);

  app.get('/api/payments/:id/refunds', {
    preHandler: [app.authenticate],
    schema: { tags: ['refunds'], summary: 'Estornos do pagamento', params: idParamSchema, response: { 200: z.array(refundResponseSchema) } },
  }, listPaymentRefunds);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

```ts
import { refundsRoutes } from '@/modules/refunds/refunds.routes';
await app.register(refundsRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/refunds/refunds.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/refunds/refunds.controller.ts backend/src/modules/refunds/refunds.routes.ts backend/src/modules/refunds/refunds.routes.test.ts backend/src/app.ts
git commit -m "feat(refunds): expoe rotas de estorno"
```

---

## Task 10: Módulo `withdrawals` — schemas + service

**Files:**
- Create: `backend/src/modules/withdrawals/withdrawals.schemas.ts`
- Create: `backend/src/modules/withdrawals/withdrawals.service.ts`
- Test: `backend/src/modules/withdrawals/withdrawals.service.test.ts`

**Interfaces:**
- Consumes: entidades `Withdrawal`, `Wallet` (fase 6); `WalletService` (Task 2); `NotFoundError`, `ForbiddenError`, `UnprocessableError`.
- Produces:
  ```ts
  // schemas — payment_method é ENUM (z.enum), casando com a coluna
  withdrawalMethodEnum, withdrawalStatusEnum, requestWithdrawalSchema, withdrawalResponseSchema,
  RequestWithdrawalInput, WithdrawalResponse
  // service
  class WithdrawalsService {
    constructor(deps: {
      withdrawals: Repository<Withdrawal>; wallets: Repository<Wallet>; wallet: WalletService;
    })
    request(userId: string, input: RequestWithdrawalInput): Promise<WithdrawalResponse>
    listMine(userId: string): Promise<WithdrawalResponse[]>
    process(id: string): Promise<WithdrawalResponse>
  }
  ```
  `request`: cria `Withdrawal` `pending` e debita a carteira (lança `UnprocessableError` em saldo insuficiente, propagado do `WalletService`). `process` (mock gateway): `pending`/`processing` → `completed` + `processed_at`; contrário → `UnprocessableError`.

- [ ] **Step 1: Escrever schemas**

`backend/src/modules/withdrawals/withdrawals.schemas.ts`:

```ts
import { z } from 'zod';

export const withdrawalMethodEnum = z
  .enum(['pix', 'bank_transfer'])
  .describe('Método do saque')
  .openapi({ example: 'pix' });

export const withdrawalStatusEnum = z
  .enum(['pending', 'processing', 'completed', 'failed'])
  .describe('Estado do saque')
  .openapi({ example: 'pending' });

export const requestWithdrawalSchema = z.object({
  amount: z.number().positive().describe('Valor do saque').openapi({ example: 200 }),
  paymentMethod: withdrawalMethodEnum,
  destination: z.string().min(3).max(255).describe('Destino (chave PIX ou dados bancários)').openapi({ example: 'user@pix.com' }),
});

export const withdrawalResponseSchema = z.object({
  id: z.string().uuid().describe('ID do saque').openapi({ example: 'wd1' }),
  walletId: z.string().uuid().describe('Carteira de origem').openapi({ example: 'w1' }),
  amount: z.number().describe('Valor').openapi({ example: 200 }),
  paymentMethod: withdrawalMethodEnum,
  status: withdrawalStatusEnum,
  destination: z.string().describe('Destino').openapi({ example: 'user@pix.com' }),
  processedAt: z.string().datetime().nullable().describe('Processamento').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criação').openapi({ example: '2026-07-01T12:00:00Z' }),
});

export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
export type WithdrawalResponse = z.infer<typeof withdrawalResponseSchema>;
```

- [ ] **Step 2: Teste falho**

`backend/src/modules/withdrawals/withdrawals.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalsService } from './withdrawals.service';
import { UnprocessableError } from '@/shared/errors';

function mockRepo() {
  return {
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ id: 'wd1', created_at: new Date('2026-07-01T12:00:00Z'), ...x })),
    findOne: vi.fn(),
    find: vi.fn(async () => []),
  } as any;
}

describe('WithdrawalsService.request', () => {
  let withdrawals: any, wallets: any, wallet: any, service: WithdrawalsService;
  beforeEach(() => {
    withdrawals = mockRepo(); wallets = mockRepo();
    wallet = { debit: vi.fn(async () => ({})), ensureWallet: vi.fn(async () => ({ id: 'w1', user_id: 'u1', balance: '300.00' })) };
    service = new WithdrawalsService({ withdrawals, wallets, wallet });
  });

  it('cria saque pending e debita a carteira', async () => {
    withdrawals.save.mockImplementationOnce(async (x: any) => ({ id: 'wd1', created_at: new Date('2026-07-01T12:00:00Z'), ...x }));
    const result = await service.request('u1', { amount: 200, paymentMethod: 'pix', destination: 'user@pix.com' });
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(200);
    expect(result.paymentMethod).toBe('pix');
    expect(wallet.debit).toHaveBeenCalledWith('u1', 200, expect.objectContaining({ type: 'withdrawal', id: 'wd1' }));
  });

  it('propaga saldo insuficiente', async () => {
    withdrawals.save.mockImplementationOnce(async (x: any) => ({ id: 'wd1', created_at: new Date('2026-07-01T12:00:00Z'), ...x }));
    wallet.debit.mockRejectedValueOnce(new UnprocessableError('Saldo insuficiente'));
    await expect(service.request('u1', { amount: 999, paymentMethod: 'pix', destination: 'x' })).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe('WithdrawalsService.process', () => {
  let withdrawals: any, wallets: any, wallet: any, service: WithdrawalsService;
  beforeEach(() => {
    withdrawals = mockRepo(); wallets = mockRepo();
    wallet = { debit: vi.fn(), ensureWallet: vi.fn() };
    service = new WithdrawalsService({ withdrawals, wallets, wallet });
  });

  it('conclui saque pendente', async () => {
    withdrawals.findOne.mockResolvedValueOnce({ id: 'wd1', wallet_id: 'w1', amount: '200.00', payment_method: 'pix', status: 'pending', destination: 'x', processed_at: null, created_at: new Date('2026-07-01T12:00:00Z') });
    withdrawals.save.mockImplementationOnce(async (x: any) => x);
    const result = await service.process('wd1');
    expect(result.status).toBe('completed');
    expect(result.processedAt).not.toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/withdrawals/withdrawals.service.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar service**

`backend/src/modules/withdrawals/withdrawals.service.ts`:

```ts
import { Repository } from 'typeorm';
import { Withdrawal } from '@/infra/database/entities/withdrawal.entity';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { NotFoundError, UnprocessableError } from '@/shared/errors';
import { WalletService } from '@/modules/wallet/wallet.service';
import type { RequestWithdrawalInput, WithdrawalResponse } from './withdrawals.schemas';

interface WithdrawalsServiceDeps {
  withdrawals: Repository<Withdrawal>;
  wallets: Repository<Wallet>;
  wallet: WalletService;
}

export class WithdrawalsService {
  constructor(private readonly deps: WithdrawalsServiceDeps) {}

  private toResponse(withdrawal: Withdrawal): WithdrawalResponse {
    return {
      id: withdrawal.id,
      walletId: withdrawal.wallet_id,
      amount: Number(withdrawal.amount),
      paymentMethod: withdrawal.payment_method,
      status: withdrawal.status,
      destination: withdrawal.destination,
      processedAt: withdrawal.processed_at ? withdrawal.processed_at.toISOString() : null,
      createdAt: withdrawal.created_at.toISOString(),
    };
  }

  async request(userId: string, input: RequestWithdrawalInput): Promise<WithdrawalResponse> {
    const wallet = await this.deps.wallet.ensureWallet(userId);
    const withdrawal = await this.deps.withdrawals.save(
      this.deps.withdrawals.create({
        wallet_id: wallet.id,
        amount: input.amount.toFixed(2),
        payment_method: input.paymentMethod,
        status: 'pending',
        destination: input.destination,
        processed_at: null,
      }),
    );
    await this.deps.wallet.debit(userId, input.amount, {
      type: 'withdrawal',
      id: withdrawal.id,
      description: 'Saque solicitado',
    });
    return this.toResponse(withdrawal);
  }

  async listMine(userId: string): Promise<WithdrawalResponse[]> {
    const wallet = await this.deps.wallet.ensureWallet(userId);
    const rows = await this.deps.withdrawals.find({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
    });
    return rows.map((w) => this.toResponse(w));
  }

  async process(id: string): Promise<WithdrawalResponse> {
    const withdrawal = await this.deps.withdrawals.findOne({ where: { id } });
    if (!withdrawal) throw new NotFoundError('Saque não encontrado');
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      throw new UnprocessableError('Saque não pode ser processado');
    }
    withdrawal.status = 'completed';
    withdrawal.processed_at = new Date();
    const saved = await this.deps.withdrawals.save(withdrawal);
    return this.toResponse(saved);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/withdrawals/withdrawals.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/withdrawals/withdrawals.schemas.ts backend/src/modules/withdrawals/withdrawals.service.ts backend/src/modules/withdrawals/withdrawals.service.test.ts
git commit -m "feat(withdrawals): implementa solicitacao e processamento de saque"
```

---

## Task 11: Módulo `withdrawals` — controller + routes + integração

**Files:**
- Create: `backend/src/modules/withdrawals/withdrawals.controller.ts`
- Create: `backend/src/modules/withdrawals/withdrawals.routes.ts`
- Test: `backend/src/modules/withdrawals/withdrawals.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `withdrawalsRoutes`)

**Interfaces:**
- Consumes: `app.authenticate`, `requireRole('professional')`, `requireRole('admin')`; `buildTestApp`, `createProfessional`, `createUser`.
- Produces: `withdrawalsRoutes(app)`; rotas `POST /api/withdrawals` (professional), `GET /api/withdrawals` (professional), `POST /api/withdrawals/:id/process` (admin).

- [ ] **Step 1: Teste de integração falho**

`backend/src/modules/withdrawals/withdrawals.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '@/test/buildTestApp';
import { AppDataSource } from '@/infra/database/data-source';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { createUser, createProfessional } from '@/test/factories';

async function seedWallet(userId: string, amount: string): Promise<void> {
  const repo = AppDataSource.getRepository(Wallet);
  await repo.save(repo.create({ user_id: userId, balance: amount, pending_balance: '0.00', currency: 'BRL' }));
}

describe('withdrawal routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('profissional solicita saque, saldo cai e admin processa', async () => {
    const pro = await createProfessional(app);
    const admin = await createUser(app, { role: 'admin' });
    await seedWallet(pro.user.id, '300.00');

    const req = await app.inject({
      method: 'POST', url: '/api/withdrawals',
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { amount: 200, paymentMethod: 'pix', destination: 'user@pix.com' },
    });
    expect(req.statusCode).toBe(201);
    expect(req.json().status).toBe('pending');

    const wallet = await app.inject({
      method: 'GET', url: '/api/wallet', headers: { authorization: `Bearer ${pro.token}` },
    });
    expect(wallet.json().balance).toBe(100);

    const process = await app.inject({
      method: 'POST', url: `/api/withdrawals/${req.json().id}/process`,
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(process.statusCode).toBe(200);
    expect(process.json().status).toBe('completed');
  });

  it('rejeita saque acima do saldo', async () => {
    const pro = await createProfessional(app);
    await seedWallet(pro.user.id, '50.00');
    const res = await app.inject({
      method: 'POST', url: '/api/withdrawals',
      headers: { authorization: `Bearer ${pro.token}` },
      payload: { amount: 200, paymentMethod: 'pix', destination: 'x' },
    });
    expect(res.statusCode).toBe(422);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npx vitest run src/modules/withdrawals/withdrawals.routes.test.ts`
Expected: FAIL — rota inexistente (404).

- [ ] **Step 3: Implementar controller**

`backend/src/modules/withdrawals/withdrawals.controller.ts`:

```ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '@/infra/database/data-source';
import { Withdrawal } from '@/infra/database/entities/withdrawal.entity';
import { Wallet } from '@/infra/database/entities/wallet.entity';
import { WalletTransaction } from '@/infra/database/entities/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { WithdrawalsService } from './withdrawals.service';
import type { RequestWithdrawalInput } from './withdrawals.schemas';

export function withdrawalsService(): WithdrawalsService {
  return new WithdrawalsService({
    withdrawals: AppDataSource.getRepository(Withdrawal),
    wallets: AppDataSource.getRepository(Wallet),
    wallet: new WalletService({
      wallets: AppDataSource.getRepository(Wallet),
      transactions: AppDataSource.getRepository(WalletTransaction),
    }),
  });
}

export async function requestWithdrawal(
  req: FastifyRequest<{ Body: RequestWithdrawalInput }>,
  reply: FastifyReply,
) {
  const result = await withdrawalsService().request(req.user.id, req.body);
  return reply.status(201).send(result);
}

export async function listWithdrawals(req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await withdrawalsService().listMine(req.user.id));
}

export async function processWithdrawal(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await withdrawalsService().process(req.params.id));
}
```

- [ ] **Step 4: Implementar routes**

`backend/src/modules/withdrawals/withdrawals.routes.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '@/shared/schemas';
import { requireRole } from '@/shared/middlewares/require-role';
import { requestWithdrawalSchema, withdrawalResponseSchema } from './withdrawals.schemas';
import { requestWithdrawal, listWithdrawals, processWithdrawal } from './withdrawals.controller';

export async function withdrawalsRoutes(app: FastifyInstance) {
  app.post('/api/withdrawals', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['withdrawals'], summary: 'Solicitar saque', body: requestWithdrawalSchema, response: { 201: withdrawalResponseSchema } },
  }, requestWithdrawal);

  app.get('/api/withdrawals', {
    preHandler: [app.authenticate, requireRole('professional')],
    schema: { tags: ['withdrawals'], summary: 'Meus saques', response: { 200: z.array(withdrawalResponseSchema) } },
  }, listWithdrawals);

  app.post('/api/withdrawals/:id/process', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['withdrawals'], summary: 'Processar saque', params: idParamSchema, response: { 200: withdrawalResponseSchema } },
  }, processWithdrawal);
}
```

- [ ] **Step 5: Registrar em `app.ts`**

```ts
import { withdrawalsRoutes } from '@/modules/withdrawals/withdrawals.routes';
await app.register(withdrawalsRoutes);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/withdrawals/withdrawals.routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/withdrawals/withdrawals.controller.ts backend/src/modules/withdrawals/withdrawals.routes.ts backend/src/modules/withdrawals/withdrawals.routes.test.ts backend/src/app.ts
git commit -m "feat(withdrawals): expoe rotas de saque"
```

---

## Task 12: Frontend `wallet` — api + queries + schemas

**Files:**
- Create: `frontend/src/features/wallet/api.ts`
- Create: `frontend/src/features/wallet/schemas.ts`
- Create: `frontend/src/features/wallet/queries.ts`

**Interfaces:**
- Consumes: `http` de `@/lib/http` (fase 3), `useQuery`/`useMutation`/`useQueryClient` de `@tanstack/react-query`.
- Produces:
  ```ts
  // api.ts
  fetchWallet(): Promise<Wallet>
  fetchTransactions(page: number): Promise<Paginated<WalletTransaction>>
  fetchWithdrawals(): Promise<Withdrawal[]>
  requestWithdrawal(input: WithdrawFormInput): Promise<Withdrawal>
  // queries.ts
  walletKeys, useWallet(), useTransactions(page), useWithdrawals(), useRequestWithdrawal()
  // schemas.ts
  withdrawFormSchema, WithdrawFormInput
  ```

- [ ] **Step 1: Escrever tipos e api**

`frontend/src/features/wallet/api.ts`:

```ts
import { http } from '@/lib/http';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'hold' | 'release';
  amount: number;
  balanceAfter: number;
  referenceType: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment' | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  walletId: string;
  amount: number;
  paymentMethod: 'pix' | 'bank_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  destination: string;
  processedAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface WithdrawInput {
  amount: number;
  paymentMethod: 'pix' | 'bank_transfer';
  destination: string;
}

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await http.get<Wallet>('/wallet');
  return data;
}

export async function fetchTransactions(page: number): Promise<Paginated<WalletTransaction>> {
  const { data } = await http.get<Paginated<WalletTransaction>>('/wallet/transactions', {
    params: { page },
  });
  return data;
}

export async function fetchWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await http.get<Withdrawal[]>('/withdrawals');
  return data;
}

export async function requestWithdrawal(input: WithdrawInput): Promise<Withdrawal> {
  const { data } = await http.post<Withdrawal>('/withdrawals', input);
  return data;
}
```

- [ ] **Step 2: Escrever schema do formulário**

`frontend/src/features/wallet/schemas.ts`:

```ts
import { z } from 'zod';

export const withdrawFormSchema = z.object({
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
  paymentMethod: z.enum(['pix', 'bank_transfer']),
  destination: z.string().min(3, 'Informe o destino'),
});

export type WithdrawFormInput = z.infer<typeof withdrawFormSchema>;
```

- [ ] **Step 3: Escrever queries**

`frontend/src/features/wallet/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchWallet,
  fetchTransactions,
  fetchWithdrawals,
  requestWithdrawal,
  type WithdrawInput,
} from './api';

export const walletKeys = {
  wallet: ['wallet'] as const,
  transactions: (page: number) => ['wallet', 'transactions', page] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
};

export function useWallet() {
  return useQuery({ queryKey: walletKeys.wallet, queryFn: fetchWallet });
}

export function useTransactions(page: number) {
  return useQuery({
    queryKey: walletKeys.transactions(page),
    queryFn: () => fetchTransactions(page),
  });
}

export function useWithdrawals() {
  return useQuery({ queryKey: walletKeys.withdrawals, queryFn: fetchWithdrawals });
}

export function useRequestWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: WithdrawInput) => requestWithdrawal(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: walletKeys.wallet });
      void client.invalidateQueries({ queryKey: walletKeys.withdrawals });
    },
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/wallet/api.ts frontend/src/features/wallet/schemas.ts frontend/src/features/wallet/queries.ts
git commit -m "feat(wallet): adiciona api e queries da carteira no frontend"
```

---

## Task 13: Frontend `wallet` — componentes + página + teste

**Files:**
- Create: `frontend/src/features/wallet/components/WalletBalanceCard.tsx`
- Create: `frontend/src/features/wallet/components/TransactionList.tsx`
- Create: `frontend/src/features/wallet/components/WithdrawDialog.tsx`
- Create: `frontend/src/features/wallet/pages/WalletPage.tsx`
- Test: `frontend/src/features/wallet/wallet.test.tsx`

**Interfaces:**
- Consumes: `useWallet`, `useTransactions`, `useRequestWithdrawal` (Task 12); `withdrawFormSchema` (Task 12); `useForm` + `zodResolver`.
- Produces: `WalletPage` (rota `/wallet`).

- [ ] **Step 1: Escrever o teste falho**

`frontend/src/features/wallet/wallet.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletPage } from './pages/WalletPage';

vi.mock('./queries', () => ({
  useWallet: () => ({ data: { balance: 270, pendingBalance: 0, currency: 'BRL' }, isLoading: false }),
  useTransactions: () => ({
    data: {
      items: [
        { id: 't1', type: 'credit', amount: 270, balanceAfter: 270, referenceType: 'payment', description: 'Recebimento de contrato', createdAt: '2026-07-01T12:00:00Z' },
      ],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  }),
  useWithdrawals: () => ({ data: [], isLoading: false }),
  useRequestWithdrawal: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <WalletPage />
    </QueryClientProvider>,
  );
}

describe('WalletPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra saldo formatado e transações', () => {
    renderPage();
    expect(screen.getByText(/270/)).toBeInTheDocument();
    expect(screen.getByText('Recebimento de contrato')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Expected: FAIL — `WalletPage` inexistente.

- [ ] **Step 3: Escrever `WalletBalanceCard`**

`frontend/src/features/wallet/components/WalletBalanceCard.tsx`:

```tsx
interface WalletBalanceCardProps {
  balance: number;
  pendingBalance: number;
  currency: string;
}

export function WalletBalanceCard({ balance, pendingBalance, currency }: WalletBalanceCardProps) {
  const format = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">Saldo disponível</p>
      <p className="text-3xl font-semibold text-gray-900">{format(balance)}</p>
      <p className="mt-2 text-sm text-gray-400">Pendente: {format(pendingBalance)}</p>
    </div>
  );
}
```

- [ ] **Step 4: Escrever `TransactionList`**

`frontend/src/features/wallet/components/TransactionList.tsx`:

```tsx
import type { WalletTransaction } from '../api';

interface TransactionListProps {
  transactions: WalletTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-400">Nenhuma movimentação ainda.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{tx.description ?? tx.type}</p>
            <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
            {tx.type === 'credit' ? '+' : '-'}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Escrever `WithdrawDialog`**

`frontend/src/features/wallet/components/WithdrawDialog.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawFormSchema, type WithdrawFormInput } from '../schemas';
import { useRequestWithdrawal } from '../queries';

interface WithdrawDialogProps {
  onClose: () => void;
}

export function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const { register, handleSubmit, formState } = useForm<WithdrawFormInput>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: { amount: 0, paymentMethod: 'pix', destination: '' },
  });
  const mutation = useRequestWithdrawal();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: onClose });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">Solicitar saque</h2>
      <div>
        <label className="block text-sm text-gray-600">Valor</label>
        <input type="number" step="0.01" {...register('amount')} className="w-full rounded border p-2" />
        {formState.errors.amount && <p className="text-xs text-red-600">{formState.errors.amount.message}</p>}
      </div>
      <div>
        <label className="block text-sm text-gray-600">Método</label>
        <select {...register('paymentMethod')} className="w-full rounded border p-2">
          <option value="pix">PIX</option>
          <option value="bank_transfer">Transferência bancária</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600">Destino</label>
        <input {...register('destination')} className="w-full rounded border p-2" />
        {formState.errors.destination && <p className="text-xs text-red-600">{formState.errors.destination.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className="rounded bg-blue-600 px-4 py-2 text-white">
          Confirmar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Escrever `WalletPage`**

`frontend/src/features/wallet/pages/WalletPage.tsx`:

```tsx
import { useState } from 'react';
import { useWallet, useTransactions } from '../queries';
import { WalletBalanceCard } from '../components/WalletBalanceCard';
import { TransactionList } from '../components/TransactionList';
import { WithdrawDialog } from '../components/WithdrawDialog';

export function WalletPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const wallet = useWallet();
  const transactions = useTransactions(1);

  if (wallet.isLoading || !wallet.data) {
    return <p className="p-6 text-gray-500">Carregando carteira...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Carteira</h1>
        <button onClick={() => setShowWithdraw(true)} className="rounded bg-blue-600 px-4 py-2 text-white">
          Sacar
        </button>
      </div>
      <WalletBalanceCard
        balance={wallet.data.balance}
        pendingBalance={wallet.data.pendingBalance}
        currency={wallet.data.currency}
      />
      <section>
        <h2 className="mb-2 text-lg font-medium">Movimentações</h2>
        <TransactionList transactions={transactions.data?.items ?? []} />
      </section>
      {showWithdraw && <WithdrawDialog onClose={() => setShowWithdraw(false)} />}
    </div>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Expected: PASS.

- [ ] **Step 8: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/wallet/components frontend/src/features/wallet/pages frontend/src/features/wallet/wallet.test.tsx
git commit -m "feat(wallet): adiciona pagina de carteira e saque no frontend"
```

---

## Self-Review (checklist do autor)

**Cobertura da spec (§3 Carteira/pagamento, §8 gateway simulado, §9 riscos):**
- `wallets`, `wallet_transactions` → módulo `wallet` (Tasks 1-3). ✅
- `payments`, `platform_fees` → módulos `payment` + `fees` (Tasks 4-7). ✅
- `refunds` → módulo `refunds` (Tasks 8-9). ✅
- `withdrawals` (com `payment_method` ENUM) → módulo `withdrawals` (Tasks 10-11). ✅
- Feature frontend `wallet` (Tasks 12-13). ✅
- Gateway externo simulado (§8): captura de método externo sem débito de carteira; `process` de saque é mock. ✅

**Riscos §9 endereçados:**
- DECIMAL como string: todo acesso a `balance`/`amount`/`total_amount` passa por `Number()`; persistência via `.toFixed(2)`. Testes asseguram tipo `number` nas respostas. ✅
- ENUM `withdrawals.payment_method`: `withdrawalMethodEnum = z.enum(['pix','bank_transfer'])` casa com a coluna. ✅

**Consistência de tipos:** `WalletService.credit/debit(userId, amount, TransactionRef)` usado igual por `payment`, `refunds`, `withdrawals`. `FeesService.computeFee/recordFee/findByPayment` consistentes entre `payment` e `refunds`. `ProfessionalProfile.user_id` resolvido igual em `payment` e `refunds`.

**Dependência de factory:** `createContract` em `@/test/factories` é assumido pelos testes de integração das Tasks 7/9. Nota explícita instrui o implementador a criá-lo seguindo o padrão da fase 5 caso ainda não exista, sem divergir de assinatura.

---

## Execution Handoff

Plano completo e salvo em `docs/superpowers/plans/plan_phase10_wallet_payment.md`. Ordem de execução: Tasks 1→13 em sequência (dependências: `wallet` → `fees` → `payment` → `refunds` → `withdrawals` → frontend). Uma task só começa com a anterior verde (typecheck + lint + testes).

**Sub-skill de execução:** superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans.
