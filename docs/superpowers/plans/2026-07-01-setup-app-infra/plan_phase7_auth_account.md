# Fase 7 — Auth & Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os módulos backend de identidade e conta (auth, account, user, address) com JWT access+refresh, verificação e reset, LGPD e exclusão com carência, mais as features frontend `auth` e `settings`.

**Architecture:** Cada módulo backend segue `routes/controller/service/schemas` + `service.test` (unit, mocka repos/Redis/BullMQ) + `routes.test` (integração via `buildTestApp()`). Serviços usam repositórios TypeORM das entidades da fase 6. JWT: access curto assinado com `JWT_ACCESS_SECRET`, refresh persistido em `refresh_tokens` com rotação (revoga o antigo ao renovar). Tokens de verificação/reset guardam hash SHA-256, nunca o valor cru. Frontend usa react-hook-form + Zod, `stores/auth` e `lib/http` (interceptor de refresh) da fase 3.

**Tech Stack:** Fastify 5, TypeORM 0.3 + MySQL 8, ioredis, BullMQ, Zod + zod-openapi, jsonwebtoken 9, bcrypt 5, Vitest; React 19 + Vite 6, react-hook-form + @hookform/resolvers, Zod, TanStack Query 5, Zustand 5, axios, Vitest + Testing Library.

## Global Constraints

Toda task herda estas regras verbatim:

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. (Docs de plano e mensagens de commit em pt-BR.)
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada no plano.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

## Contratos consumidos (não redefinir)

Definidos nas fases 3-5, referenciados aqui:

- `buildApp(): FastifyInstance` (fase 3) — registra plugins, swagger, error handler.
- `app.authenticate` (preHandler) → popula `request.user = { id: string; role: 'client'|'professional'|'admin' }`.
- `requireRole(...roles)` — preHandler factory (fase 3).
- `AppError` + subclasses `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError` (fase 4).
- `idParamSchema`, `paginationQuerySchema`, `paginatedResponse(itemSchema)` (fase 4).
- `buildTestApp(): Promise<FastifyInstance>` + factories `createUser` (fase 5).
- Unit helpers `mockRepo<T>()`, `mockRedis()`, `mockQueue()` (fase 5).
- Entidades TypeORM da fase 6: `User`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`, `PhoneVerificationToken`, `UserOauthAccount`, `UserPreference`, `UserConsent`, `AccountDeletionRequest`, `Address`.

## File Structure

```
backend/src/modules/auth/
  auth.schemas.ts        register/login/refresh/verify/reset/oauth Zod
  auth.service.ts        AuthService (hash, tokens, rotation)
  auth.controller.ts     handlers finos
  auth.routes.ts         registro + schema inline
  auth.service.test.ts   unit
  auth.routes.test.ts    integração
backend/src/modules/user/    (user.*)  perfil básico
backend/src/modules/address/ (address.*) CRUD
backend/src/modules/account/ (account.*) preferences/consents/deletion
backend/src/shared/security/token.ts   assinatura/verificação JWT + hash de token
frontend/src/features/auth/    api.ts queries.ts schemas.ts pages/ components/ auth.test.tsx
frontend/src/features/settings/ api.ts queries.ts schemas.ts pages/ components/ settings.test.tsx
```

---

### Task 1: Utilitário de tokens (JWT + hash de token opaco)

**Files:**
- Create: `backend/src/shared/security/token.ts`
- Test: `backend/src/shared/security/token.test.ts`

**Interfaces:**
- Consumes: env `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` (fase 1 config).
- Produces:
  - `signAccessToken(payload: { sub: string; role: Role }): string`
  - `verifyAccessToken(token: string): { sub: string; role: Role }`
  - `generateOpaqueToken(): { raw: string; hash: string }`
  - `hashToken(raw: string): string`
  - `type Role = 'client' | 'professional' | 'admin'`

- [ ] **Step 1: Escrever teste falhando**

```ts
import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
} from './token';

describe('token utils', () => {
  it('assina e verifica access token com sub e role', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'client' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('client');
  });

  it('rejeita token invalido', () => {
    expect(() => verifyAccessToken('garbage')).toThrow();
  });

  it('gera token opaco cujo hash bate com hashToken', () => {
    const { raw, hash } = generateOpaqueToken();
    expect(raw).toHaveLength(64);
    expect(hashToken(raw)).toBe(hash);
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/shared/security/token.test.ts`
Expected: FAIL — `Cannot find module './token'`.

- [ ] **Step 3: Implementar**

```ts
import { randomBytes, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

export type Role = 'client' | 'professional' | 'admin';

interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessTtl,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.jwtAccessSecret);
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('invalid token payload');
  }
  return { sub: decoded.sub as string, role: (decoded as { role: Role }).role };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/shared/security/token.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/security/token.ts backend/src/shared/security/token.test.ts
git commit -m "feat(auth): adiciona utilitario de tokens jwt e opacos"
```

---

### Task 2: AuthService — registro e login

**Files:**
- Create: `backend/src/modules/auth/auth.schemas.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Test: `backend/src/modules/auth/auth.service.test.ts`

**Interfaces:**
- Consumes: `signAccessToken`, `generateOpaqueToken`, `hashToken` (Task 1); entidades `User`, `RefreshToken`; `bcrypt`; `ConflictError`, `UnauthorizedError`.
- Produces:
  - `class AuthService` construída com `{ users: Repository<User>; refreshTokens: Repository<RefreshToken> }`
  - `register(input: RegisterInput): Promise<AuthResult>`
  - `login(input: LoginInput): Promise<AuthResult>`
  - `type AuthResult = { accessToken: string; refreshToken: string; user: PublicUser }`
  - `type PublicUser = { id: string; email: string; name: string; role: Role }`

- [ ] **Step 1: Escrever schemas**

Create `backend/src/modules/auth/auth.schemas.ts`:

```ts
import { z } from 'zod';

export const roleSchema = z
  .enum(['client', 'professional'])
  .describe('Perfil do usuario no cadastro')
  .openapi({ example: 'client' });

export const registerSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .describe('Nome completo')
    .openapi({ example: 'Maria Silva' }),
  email: z
    .string()
    .email()
    .describe('E-mail unico')
    .openapi({ example: 'maria@example.com' }),
  phone: z
    .string()
    .min(10)
    .max(20)
    .describe('Telefone com DDD')
    .openapi({ example: '+5551999998888' }),
  password: z
    .string()
    .min(8)
    .max(72)
    .describe('Senha (min 8 caracteres)')
    .openapi({ example: 'S3nh@Forte' }),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  password: z.string().min(8).max(72).describe('Senha').openapi({ example: 'S3nh@Forte' }),
});

export const publicUserSchema = z.object({
  id: z.string().uuid().describe('ID do usuario').openapi({ example: '11111111-1111-1111-1111-111111111111' }),
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  name: z.string().describe('Nome').openapi({ example: 'Maria Silva' }),
  role: z
    .enum(['client', 'professional', 'admin'])
    .describe('Perfil')
    .openapi({ example: 'client' }),
});

export const authResultSchema = z.object({
  accessToken: z.string().describe('JWT de acesso').openapi({ example: 'eyJ...' }),
  refreshToken: z.string().describe('Refresh token opaco').openapi({ example: 'a1b2...' }),
  user: publicUserSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Create `backend/src/modules/auth/auth.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { mockRepo } from '../../test/mocks';
import type { User } from '../../infra/database/entities/user.entity';
import type { RefreshToken } from '../../infra/database/entities/refresh-token.entity';

describe('AuthService register/login', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    service = new AuthService({ users, refreshTokens });
  });

  it('registra usuario com senha hasheada e retorna tokens', async () => {
    users.findOne.mockResolvedValue(null);
    users.create.mockImplementation((v) => v as User);
    users.save.mockImplementation(async (v) => ({ ...v, id: 'user-1' }) as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.register({
      name: 'Maria',
      email: 'maria@example.com',
      phone: '+5551999998888',
      password: 'S3nh@Forte',
      role: 'client',
    });

    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.passwordHash).not.toBe('S3nh@Forte');
    await expect(bcrypt.compare('S3nh@Forte', saved.passwordHash)).resolves.toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('maria@example.com');
  });

  it('rejeita registro com e-mail existente', async () => {
    users.findOne.mockResolvedValue({ id: 'x' } as User);
    await expect(
      service.register({
        name: 'Maria',
        email: 'maria@example.com',
        phone: '+5551999998888',
        password: 'S3nh@Forte',
        role: 'client',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('faz login com credenciais validas', async () => {
    const passwordHash = await bcrypt.hash('S3nh@Forte', 10);
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'maria@example.com',
      name: 'Maria',
      role: 'client',
      passwordHash,
    } as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.login({ email: 'maria@example.com', password: 'S3nh@Forte' });
    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBeTruthy();
  });

  it('rejeita login com senha errada', async () => {
    const passwordHash = await bcrypt.hash('S3nh@Forte', 10);
    users.findOne.mockResolvedValue({ id: 'user-1', passwordHash, role: 'client' } as User);
    await expect(
      service.login({ email: 'maria@example.com', password: 'errada' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: FAIL — `Cannot find module './auth.service'`.

- [ ] **Step 4: Implementar AuthService (register/login)**

Create `backend/src/modules/auth/auth.service.ts`:

```ts
import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity';
import { RefreshToken } from '../../infra/database/entities/refresh-token.entity';
import {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
} from '../../shared/security/token';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import { config } from '../../config/env';
import type { RegisterInput, LoginInput, AuthResult, PublicUser } from './auth.schemas';

interface AuthDeps {
  users: Repository<User>;
  refreshTokens: Repository<RefreshToken>;
}

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.deps.users.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('E-mail ja cadastrado');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const entity = this.deps.users.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
    });
    const user = await this.deps.users.save(entity);
    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.deps.users.findOne({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Credenciais invalidas');
    }
    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Credenciais invalidas');
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const { raw, hash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + config.refreshTtlMs);
    const record = this.deps.refreshTokens.create({
      user: { id: user.id } as User,
      tokenHash: hash,
      expiresAt,
    });
    await this.deps.refreshTokens.save(record);
    return { accessToken, refreshToken: raw, user: this.toPublic(user) };
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/auth.schemas.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.service.test.ts
git commit -m "feat(auth): implementa registro e login com bcrypt e emissao de tokens"
```

---

### Task 3: AuthService — refresh rotation e logout

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.schemas.ts`
- Modify: `backend/src/modules/auth/auth.service.test.ts`

**Interfaces:**
- Produces:
  - `refresh(rawToken: string): Promise<AuthResult>` — valida, revoga o antigo, emite novo par.
  - `logout(rawToken: string): Promise<void>` — revoga o refresh atual.

- [ ] **Step 1: Adicionar schema de refresh**

Add to `auth.schemas.ts`:

```ts
export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1)
    .describe('Refresh token opaco emitido no login')
    .openapi({ example: 'a1b2c3...' }),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Add to `auth.service.test.ts`:

```ts
import { hashToken } from '../../shared/security/token';

describe('AuthService refresh/logout', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    service = new AuthService({ users, refreshTokens });
  });

  it('rotaciona refresh: revoga antigo e emite novo', async () => {
    const raw = 'rawtoken';
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      tokenHash: hashToken(raw),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    } as unknown as RefreshToken);
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' } as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.refresh(raw);

    const oldSaved = refreshTokens.save.mock.calls.find(
      (c) => (c[0] as RefreshToken).id === 'rt-1',
    );
    expect((oldSaved?.[0] as RefreshToken).revokedAt).toBeInstanceOf(Date);
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(raw);
  });

  it('rejeita refresh revogado', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      tokenHash: hashToken('x'),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    } as unknown as RefreshToken);
    await expect(service.refresh('x')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejeita refresh expirado', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      tokenHash: hashToken('x'),
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    } as unknown as RefreshToken);
    await expect(service.refresh('x')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('logout revoga o token atual', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      tokenHash: hashToken('x'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    } as unknown as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    await service.logout('x');
    const saved = refreshTokens.save.mock.calls[0][0] as RefreshToken;
    expect(saved.revokedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: FAIL — `service.refresh is not a function`.

- [ ] **Step 4: Implementar refresh/logout**

Add methods to `AuthService`:

```ts
  async refresh(rawToken: string): Promise<AuthResult> {
    const record = await this.findValidRefresh(rawToken);
    record.revokedAt = new Date();
    await this.deps.refreshTokens.save(record);
    const user =
      record.user ?? (await this.deps.users.findOne({ where: { id: record.user.id } }));
    if (!user) {
      throw new UnauthorizedError('Sessao invalida');
    }
    return this.issueTokens(user);
  }

  async logout(rawToken: string): Promise<void> {
    const record = await this.findValidRefresh(rawToken);
    record.revokedAt = new Date();
    await this.deps.refreshTokens.save(record);
  }

  private async findValidRefresh(rawToken: string): Promise<RefreshToken> {
    const record = await this.deps.refreshTokens.findOne({
      where: { tokenHash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Sessao invalida');
    }
    return record;
  }
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat(auth): adiciona rotacao de refresh token e logout"
```

---

### Task 4: AuthService — verificação de e-mail/telefone e reset de senha

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.schemas.ts`
- Modify: `backend/src/modules/auth/auth.service.test.ts`

**Interfaces:**
- Consumes: entidades `EmailVerificationToken`, `PhoneVerificationToken`, `PasswordResetToken`; `mockQueue()` para fila de e-mail; `NotFoundError`, `BadRequestError`.
- Produces (novos deps no construtor):
  - `AuthDeps` ganha `emailTokens`, `phoneTokens`, `resetTokens: Repository<...>` e `mailQueue: { add(name: string, data: unknown): Promise<unknown> }`.
  - `requestEmailVerification(userId: string): Promise<void>`
  - `confirmEmailVerification(rawToken: string): Promise<void>`
  - `requestPasswordReset(email: string): Promise<void>`
  - `resetPassword(rawToken: string, newPassword: string): Promise<void>`

- [ ] **Step 1: Adicionar schemas**

Add to `auth.schemas.ts`:

```ts
export const requestPasswordResetSchema = z.object({
  email: z.string().email().describe('E-mail da conta').openapi({ example: 'maria@example.com' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).describe('Token de reset recebido por e-mail').openapi({ example: 'a1b2...' }),
  password: z.string().min(8).max(72).describe('Nova senha').openapi({ example: 'N0v@Senha' }),
});

export const confirmVerificationSchema = z.object({
  token: z.string().min(1).describe('Token de verificacao').openapi({ example: 'a1b2...' }),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmVerificationInput = z.infer<typeof confirmVerificationSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Add to `auth.service.test.ts`:

```ts
import type { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity';
import type { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity';

describe('AuthService verificacao e reset', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let emailTokens: ReturnType<typeof mockRepo<EmailVerificationToken>>;
  let resetTokens: ReturnType<typeof mockRepo<PasswordResetToken>>;
  let mailQueue: { add: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    emailTokens = mockRepo<EmailVerificationToken>();
    resetTokens = mockRepo<PasswordResetToken>();
    mailQueue = { add: vi.fn().mockResolvedValue(undefined) };
    service = new AuthService({
      users,
      refreshTokens,
      emailTokens,
      phoneTokens: mockRepo(),
      resetTokens,
      mailQueue,
    });
  });

  it('cria token de verificacao de e-mail e enfileira envio', async () => {
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'm@e.com' } as User);
    emailTokens.create.mockImplementation((v) => v as EmailVerificationToken);
    emailTokens.save.mockImplementation(async (v) => v as EmailVerificationToken);

    await service.requestEmailVerification('user-1');

    expect(emailTokens.save).toHaveBeenCalled();
    expect(mailQueue.add).toHaveBeenCalledWith('email-verification', expect.objectContaining({ email: 'm@e.com' }));
  });

  it('confirma verificacao e marca e-mail como verificado', async () => {
    const raw = 'verifytoken';
    emailTokens.findOne.mockResolvedValue({
      id: 'ev-1',
      tokenHash: hashToken(raw),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1' },
    } as unknown as EmailVerificationToken);
    emailTokens.save.mockImplementation(async (v) => v as EmailVerificationToken);
    users.update.mockResolvedValue({ affected: 1 } as never);

    await service.confirmEmailVerification(raw);

    expect(users.update).toHaveBeenCalledWith('user-1', { emailVerifiedAt: expect.any(Date) });
  });

  it('rejeita confirmacao com token consumido', async () => {
    emailTokens.findOne.mockResolvedValue({
      tokenHash: hashToken('x'),
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    } as unknown as EmailVerificationToken);
    await expect(service.confirmEmailVerification('x')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('nao vaza existencia da conta no requestPasswordReset', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.requestPasswordReset('naoexiste@e.com')).resolves.toBeUndefined();
    expect(resetTokens.save).not.toHaveBeenCalled();
    expect(mailQueue.add).not.toHaveBeenCalled();
  });

  it('reseta senha, revoga token e invalida refresh tokens', async () => {
    const raw = 'resettoken';
    resetTokens.findOne.mockResolvedValue({
      id: 'pr-1',
      tokenHash: hashToken(raw),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'user-1' },
    } as unknown as PasswordResetToken);
    resetTokens.save.mockImplementation(async (v) => v as PasswordResetToken);
    users.update.mockResolvedValue({ affected: 1 } as never);
    refreshTokens.update.mockResolvedValue({ affected: 2 } as never);

    await service.resetPassword(raw, 'N0v@Senha');

    const updateArg = users.update.mock.calls[0][1] as { passwordHash: string };
    await expect(bcrypt.compare('N0v@Senha', updateArg.passwordHash)).resolves.toBe(true);
    expect(refreshTokens.update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: FAIL — `service.requestEmailVerification is not a function`.

- [ ] **Step 4: Implementar (atualizar deps + métodos)**

Update `AuthDeps` and add methods in `auth.service.ts`:

```ts
import { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity';
import { PhoneVerificationToken } from '../../infra/database/entities/phone-verification-token.entity';
import { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity';
import { NotFoundError, BadRequestError } from '../../shared/errors';

interface MailQueue {
  add(name: string, data: unknown): Promise<unknown>;
}

interface AuthDeps {
  users: Repository<User>;
  refreshTokens: Repository<RefreshToken>;
  emailTokens: Repository<EmailVerificationToken>;
  phoneTokens: Repository<PhoneVerificationToken>;
  resetTokens: Repository<PasswordResetToken>;
  mailQueue: MailQueue;
}

const TOKEN_TTL_MS = 1000 * 60 * 60;
```

```ts
  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.deps.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    const { raw, hash } = generateOpaqueToken();
    const record = this.deps.emailTokens.create({
      user: { id: userId } as User,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });
    await this.deps.emailTokens.save(record);
    await this.deps.mailQueue.add('email-verification', { email: user.email, token: raw });
  }

  async confirmEmailVerification(rawToken: string): Promise<void> {
    const record = await this.deps.emailTokens.findOne({
      where: { tokenHash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Token invalido ou expirado');
    }
    record.consumedAt = new Date();
    await this.deps.emailTokens.save(record);
    await this.deps.users.update(record.user.id, { emailVerifiedAt: new Date() });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.deps.users.findOne({ where: { email } });
    if (!user) {
      return;
    }
    const { raw, hash } = generateOpaqueToken();
    const record = this.deps.resetTokens.create({
      user: { id: user.id } as User,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });
    await this.deps.resetTokens.save(record);
    await this.deps.mailQueue.add('password-reset', { email: user.email, token: raw });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.deps.resetTokens.findOne({
      where: { tokenHash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Token invalido ou expirado');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    record.consumedAt = new Date();
    await this.deps.resetTokens.save(record);
    await this.deps.users.update(record.user.id, { passwordHash });
    await this.deps.refreshTokens.update(
      { user: { id: record.user.id } },
      { revokedAt: new Date() },
    );
  }
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: PASS (13 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat(auth): adiciona verificacao de email e fluxo de reset de senha"
```

---

### Task 5: AuthService — vínculo de contas OAuth

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.schemas.ts`
- Modify: `backend/src/modules/auth/auth.service.test.ts`

**Interfaces:**
- Consumes: entidade `UserOauthAccount`.
- Produces:
  - `AuthDeps` ganha `oauthAccounts: Repository<UserOauthAccount>`.
  - `linkOrLoginOauth(input: OauthInput): Promise<AuthResult>` — se provider+providerUserId existe, loga; senão cria usuário e vincula.
  - `type OauthProvider = 'google' | 'facebook' | 'apple'`

- [ ] **Step 1: Adicionar schema**

Add to `auth.schemas.ts`:

```ts
export const oauthSchema = z.object({
  provider: z
    .enum(['google', 'facebook', 'apple'])
    .describe('Provedor OAuth')
    .openapi({ example: 'google' }),
  providerUserId: z.string().min(1).describe('ID do usuario no provedor').openapi({ example: '109384...' }),
  email: z.string().email().describe('E-mail retornado pelo provedor').openapi({ example: 'maria@gmail.com' }),
  name: z.string().min(1).describe('Nome retornado pelo provedor').openapi({ example: 'Maria Silva' }),
});

export type OauthInput = z.infer<typeof oauthSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Add to `auth.service.test.ts`:

```ts
import type { UserOauthAccount } from '../../infra/database/entities/user-oauth-account.entity';

describe('AuthService oauth', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let oauthAccounts: ReturnType<typeof mockRepo<UserOauthAccount>>;
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    oauthAccounts = mockRepo<UserOauthAccount>();
    service = new AuthService({
      users,
      refreshTokens,
      emailTokens: mockRepo(),
      phoneTokens: mockRepo(),
      resetTokens: mockRepo(),
      mailQueue: { add: vi.fn() },
      oauthAccounts,
    });
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);
  });

  it('loga usuario ja vinculado ao provider', async () => {
    oauthAccounts.findOne.mockResolvedValue({
      id: 'oa-1',
      provider: 'google',
      providerUserId: '123',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    } as unknown as UserOauthAccount);

    const result = await service.linkOrLoginOauth({
      provider: 'google',
      providerUserId: '123',
      email: 'm@e.com',
      name: 'M',
    });

    expect(result.user.id).toBe('user-1');
    expect(users.save).not.toHaveBeenCalled();
  });

  it('cria usuario e vincula quando provider desconhecido', async () => {
    oauthAccounts.findOne.mockResolvedValue(null);
    users.findOne.mockResolvedValue(null);
    users.create.mockImplementation((v) => v as User);
    users.save.mockImplementation(async (v) => ({ ...v, id: 'user-2' }) as User);
    oauthAccounts.create.mockImplementation((v) => v as UserOauthAccount);
    oauthAccounts.save.mockImplementation(async (v) => v as UserOauthAccount);

    const result = await service.linkOrLoginOauth({
      provider: 'google',
      providerUserId: '999',
      email: 'novo@e.com',
      name: 'Novo',
    });

    expect(result.user.id).toBe('user-2');
    expect(oauthAccounts.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: FAIL — `service.linkOrLoginOauth is not a function`.

- [ ] **Step 4: Implementar**

Update deps and add method in `auth.service.ts`:

```ts
import { UserOauthAccount } from '../../infra/database/entities/user-oauth-account.entity';
import type { OauthInput } from './auth.schemas';
```

Add `oauthAccounts: Repository<UserOauthAccount>;` to `AuthDeps`, then:

```ts
  async linkOrLoginOauth(input: OauthInput): Promise<AuthResult> {
    const linked = await this.deps.oauthAccounts.findOne({
      where: { provider: input.provider, providerUserId: input.providerUserId },
      relations: { user: true },
    });
    if (linked) {
      return this.issueTokens(linked.user);
    }
    let user = await this.deps.users.findOne({ where: { email: input.email } });
    if (!user) {
      const randomPassword = generateOpaqueToken().raw;
      const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_ROUNDS);
      user = await this.deps.users.save(
        this.deps.users.create({
          name: input.name,
          email: input.email,
          phone: '',
          passwordHash,
          role: 'client',
          emailVerifiedAt: new Date(),
        }),
      );
    }
    await this.deps.oauthAccounts.save(
      this.deps.oauthAccounts.create({
        user: { id: user.id } as User,
        provider: input.provider,
        providerUserId: input.providerUserId,
      }),
    );
    return this.issueTokens(user);
  }
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/auth/auth.service.test.ts`
Expected: PASS (15 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat(auth): adiciona login e vinculo de contas oauth"
```

---

### Task 6: Rotas de auth + teste de integração

**Files:**
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/auth.routes.ts`
- Test: `backend/src/modules/auth/auth.routes.test.ts`
- Modify: `backend/src/app.ts` (registrar `authRoutes`)

**Interfaces:**
- Consumes: `AuthService` (Tasks 2-5), `buildApp`/`buildTestApp`, `app.authenticate`, `AppRepositories` (fase 6 fornece `dataSource.getRepository`).
- Produces: rotas `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/verify-email`, `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`, `POST /api/auth/oauth`.

- [ ] **Step 1: Escrever controller**

Create `backend/src/modules/auth/auth.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from './auth.service';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ConfirmVerificationInput,
  OauthInput,
} from './auth.schemas';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
    const result = await this.service.register(req.body);
    return reply.status(201).send(result);
  };

  login = async (req: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.login(req.body));
  };

  refresh = async (req: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.refresh(req.body.refreshToken));
  };

  logout = async (req: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
    await this.service.logout(req.body.refreshToken);
    return reply.status(204).send();
  };

  verifyEmail = async (
    req: FastifyRequest<{ Body: ConfirmVerificationInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.confirmEmailVerification(req.body.token);
    return reply.status(204).send();
  };

  forgotPassword = async (
    req: FastifyRequest<{ Body: RequestPasswordResetInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.requestPasswordReset(req.body.email);
    return reply.status(202).send();
  };

  resetPassword = async (
    req: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.resetPassword(req.body.token, req.body.password);
    return reply.status(204).send();
  };

  oauth = async (req: FastifyRequest<{ Body: OauthInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.linkOrLoginOauth(req.body));
  };
}
```

- [ ] **Step 2: Escrever rotas**

Create `backend/src/modules/auth/auth.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../infra/database/entities/user.entity';
import { RefreshToken } from '../../infra/database/entities/refresh-token.entity';
import { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity';
import { PhoneVerificationToken } from '../../infra/database/entities/phone-verification-token.entity';
import { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity';
import { UserOauthAccount } from '../../infra/database/entities/user-oauth-account.entity';
import { mailQueue } from '../../infra/queues';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  confirmVerificationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  oauthSchema,
  authResultSchema,
} from './auth.schemas';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const dataSource = app.getDecorator<DataSource>('dataSource');
  const service = new AuthService({
    users: dataSource.getRepository(User),
    refreshTokens: dataSource.getRepository(RefreshToken),
    emailTokens: dataSource.getRepository(EmailVerificationToken),
    phoneTokens: dataSource.getRepository(PhoneVerificationToken),
    resetTokens: dataSource.getRepository(PasswordResetToken),
    oauthAccounts: dataSource.getRepository(UserOauthAccount),
    mailQueue,
  });
  const controller = new AuthController(service);

  app.post('/auth/register', {
    schema: { tags: ['auth'], summary: 'Registra usuario', body: registerSchema, response: { 201: authResultSchema } },
    handler: controller.register,
  });
  app.post('/auth/login', {
    schema: { tags: ['auth'], summary: 'Autentica usuario', body: loginSchema, response: { 200: authResultSchema } },
    handler: controller.login,
  });
  app.post('/auth/refresh', {
    schema: { tags: ['auth'], summary: 'Rotaciona refresh token', body: refreshSchema, response: { 200: authResultSchema } },
    handler: controller.refresh,
  });
  app.post('/auth/logout', {
    schema: { tags: ['auth'], summary: 'Revoga refresh token', body: refreshSchema, response: { 204: z.void() } },
    handler: controller.logout,
  });
  app.post('/auth/verify-email', {
    schema: { tags: ['auth'], summary: 'Confirma verificacao de e-mail', body: confirmVerificationSchema, response: { 204: z.void() } },
    handler: controller.verifyEmail,
  });
  app.post('/auth/password/forgot', {
    schema: { tags: ['auth'], summary: 'Solicita reset de senha', body: requestPasswordResetSchema, response: { 202: z.void() } },
    handler: controller.forgotPassword,
  });
  app.post('/auth/password/reset', {
    schema: { tags: ['auth'], summary: 'Redefine senha', body: resetPasswordSchema, response: { 204: z.void() } },
    handler: controller.resetPassword,
  });
  app.post('/auth/oauth', {
    schema: { tags: ['auth'], summary: 'Login/vinculo OAuth', body: oauthSchema, response: { 200: authResultSchema } },
    handler: controller.oauth,
  });
}
```

Add `import { z } from 'zod';` at top.

- [ ] **Step 3: Registrar em app.ts**

In `backend/src/app.ts`, inside `buildApp` after existing module registrations:

```ts
import { authRoutes } from './modules/auth/auth.routes';
```

```ts
  await app.register(authRoutes, { prefix: '/api' });
```

- [ ] **Step 4: Escrever teste de integração falhando**

Create `backend/src/modules/auth/auth.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';

describe('auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra e loga um usuario', async () => {
    const email = `user-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Teste', email, phone: '+5551999990000', password: 'S3nh@Forte', role: 'client' },
    });
    expect(register.statusCode).toBe(201);
    expect(register.json().accessToken).toBeTruthy();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'S3nh@Forte' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.email).toBe(email);
  });

  it('rejeita registro duplicado com 409', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const payload = { name: 'Dup', email, phone: '+5551999990001', password: 'S3nh@Forte', role: 'client' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const second = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');
  });

  it('rotaciona refresh e invalida o antigo', async () => {
    const email = `rot-${Date.now()}@example.com`;
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Rot', email, phone: '+5551999990002', password: 'S3nh@Forte', role: 'client' },
    });
    const oldRefresh = register.json().refreshToken as string;

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });
    expect(refreshed.statusCode).toBe(200);

    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
```

- [ ] **Step 5: Rodar e ver falhar/passar**

Run: `cd backend && npx vitest run src/modules/auth/auth.routes.test.ts`
Expected: primeiro FAIL se `authRoutes` não registrado; após step 3, PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/ backend/src/app.ts
git commit -m "feat(auth): expoe rotas de auth com testes de integracao"
```

---

### Task 7: Módulo user — perfil básico

**Files:**
- Create: `backend/src/modules/user/user.schemas.ts`
- Create: `backend/src/modules/user/user.service.ts`
- Create: `backend/src/modules/user/user.controller.ts`
- Create: `backend/src/modules/user/user.routes.ts`
- Test: `backend/src/modules/user/user.service.test.ts`
- Test: `backend/src/modules/user/user.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `User` repo, `app.authenticate`, `NotFoundError`, `publicUserSchema` (reexport de auth).
- Produces:
  - `class UserService { getProfile(id): Promise<UserProfile>; updateProfile(id, input): Promise<UserProfile> }`
  - `type UserProfile = { id; email; name; phone; role; emailVerifiedAt: string | null; avatarUrl: string | null }`
  - Rotas `GET /api/users/me`, `PATCH /api/users/me`.

- [ ] **Step 1: Escrever schemas**

Create `backend/src/modules/user/user.schemas.ts`:

```ts
import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '11111111-1111-1111-1111-111111111111' }),
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  name: z.string().describe('Nome').openapi({ example: 'Maria Silva' }),
  phone: z.string().describe('Telefone').openapi({ example: '+5551999998888' }),
  role: z.enum(['client', 'professional', 'admin']).describe('Perfil').openapi({ example: 'client' }),
  emailVerifiedAt: z.string().datetime().nullable().describe('Data de verificacao do e-mail').openapi({ example: null }),
  avatarUrl: z.string().url().nullable().describe('URL do avatar').openapi({ example: null }),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).describe('Nome').openapi({ example: 'Maria S.' }),
    phone: z.string().min(10).max(20).describe('Telefone').openapi({ example: '+5551999997777' }),
    avatarUrl: z.string().url().describe('URL do avatar').openapi({ example: 'https://cdn/x.png' }),
  })
  .partial();

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Create `backend/src/modules/user/user.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from './user.service';
import { mockRepo } from '../../test/mocks';
import type { User } from '../../infra/database/entities/user.entity';

describe('UserService', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let service: UserService;

  beforeEach(() => {
    users = mockRepo<User>();
    service = new UserService({ users });
  });

  it('retorna perfil serializando datas', async () => {
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'm@e.com',
      name: 'M',
      phone: '+5551',
      role: 'client',
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      avatarUrl: null,
    } as User);

    const profile = await service.getProfile('user-1');
    expect(profile.emailVerifiedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('lanca 404 quando usuario ausente', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.getProfile('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('atualiza somente campos enviados', async () => {
    users.findOne
      .mockResolvedValueOnce({ id: 'user-1', name: 'Old', phone: 'p', email: 'e', role: 'client', emailVerifiedAt: null, avatarUrl: null } as User)
      .mockResolvedValueOnce({ id: 'user-1', name: 'New', phone: 'p', email: 'e', role: 'client', emailVerifiedAt: null, avatarUrl: null } as User);
    users.update.mockResolvedValue({ affected: 1 } as never);

    const profile = await service.updateProfile('user-1', { name: 'New' });
    expect(users.update).toHaveBeenCalledWith('user-1', { name: 'New' });
    expect(profile.name).toBe('New');
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/user/user.service.test.ts`
Expected: FAIL — `Cannot find module './user.service'`.

- [ ] **Step 4: Implementar service**

Create `backend/src/modules/user/user.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity';
import { NotFoundError } from '../../shared/errors';
import type { UserProfile, UpdateProfileInput } from './user.schemas';

interface UserDeps {
  users: Repository<User>;
}

export class UserService {
  constructor(private readonly deps: UserDeps) {}

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.deps.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    return this.toProfile(user);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.deps.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(patch).length > 0) {
      await this.deps.users.update(id, patch);
    }
    return this.getProfile(id);
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/user/user.service.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Escrever controller + rotas**

Create `backend/src/modules/user/user.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserService } from './user.service';
import type { UpdateProfileInput } from './user.schemas';

export class UserController {
  constructor(private readonly service: UserService) {}

  me = async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.service.getProfile(req.user.id));
  };

  update = async (req: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.updateProfile(req.user.id, req.body));
  };
}
```

Create `backend/src/modules/user/user.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../../infra/database/entities/user.entity';
import { userProfileSchema, updateProfileSchema } from './user.schemas';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const dataSource = app.getDecorator<DataSource>('dataSource');
  const service = new UserService({ users: dataSource.getRepository(User) });
  const controller = new UserController(service);

  app.get('/users/me', {
    onRequest: [app.authenticate],
    schema: { tags: ['user'], summary: 'Perfil atual', response: { 200: userProfileSchema } },
    handler: controller.me,
  });
  app.patch('/users/me', {
    onRequest: [app.authenticate],
    schema: { tags: ['user'], summary: 'Atualiza perfil', body: updateProfileSchema, response: { 200: userProfileSchema } },
    handler: controller.update,
  });
}
```

Register in `app.ts`:

```ts
import { userRoutes } from './modules/user/user.routes';
```
```ts
  await app.register(userRoutes, { prefix: '/api' });
```

- [ ] **Step 7: Escrever teste de integração**

Create `backend/src/modules/user/user.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';

async function registerUser(app: FastifyInstance) {
  const email = `me-${Date.now()}-${Math.random()}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Me', email, phone: '+5551999990003', password: 'S3nh@Forte', role: 'client' },
  });
  return res.json().accessToken as string;
}

describe('user routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('exige autenticacao no /users/me', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it('retorna e atualiza o perfil autenticado', async () => {
    const token = await registerUser(app);
    const me = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Novo Nome' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Novo Nome');
  });
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/user/`
Expected: PASS (service + routes).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/user/ backend/src/app.ts
git commit -m "feat(user): adiciona modulo de perfil basico"
```

---

### Task 8: Módulo address — CRUD de endereços

**Files:**
- Create: `backend/src/modules/address/address.schemas.ts`
- Create: `backend/src/modules/address/address.service.ts`
- Create: `backend/src/modules/address/address.controller.ts`
- Create: `backend/src/modules/address/address.routes.ts`
- Test: `backend/src/modules/address/address.service.test.ts`
- Test: `backend/src/modules/address/address.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `Address` repo, `app.authenticate`, `idParamSchema`, `NotFoundError`, `ForbiddenError`.
- Produces:
  - `class AddressService` com `list(userId)`, `create(userId, input)`, `update(userId, id, input)`, `remove(userId, id)`, `setDefault(userId, id)`.
  - Rotas `GET/POST /api/addresses`, `PATCH/DELETE /api/addresses/:id`, `POST /api/addresses/:id/default`.

- [ ] **Step 1: Escrever schemas**

Create `backend/src/modules/address/address.schemas.ts`:

```ts
import { z } from 'zod';

export const addressSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '22222222-2222-2222-2222-222222222222' }),
  label: z.string().describe('Rotulo').openapi({ example: 'Casa' }),
  street: z.string().describe('Logradouro').openapi({ example: 'Rua das Flores' }),
  number: z.string().describe('Numero').openapi({ example: '123' }),
  complement: z.string().nullable().describe('Complemento').openapi({ example: 'Apto 4' }),
  district: z.string().describe('Bairro').openapi({ example: 'Centro' }),
  city: z.string().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).describe('UF').openapi({ example: 'RS' }),
  zipCode: z.string().describe('CEP').openapi({ example: '90000-000' }),
  isDefault: z.boolean().describe('Endereco padrao').openapi({ example: true }),
});

export const createAddressSchema = addressSchema.omit({ id: true, isDefault: true }).extend({
  complement: z.string().nullable().default(null).describe('Complemento').openapi({ example: null }),
});

export const updateAddressSchema = createAddressSchema.partial();

export type AddressDto = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Create `backend/src/modules/address/address.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AddressService } from './address.service';
import { mockRepo } from '../../test/mocks';
import type { Address } from '../../infra/database/entities/address.entity';

describe('AddressService', () => {
  let addresses: ReturnType<typeof mockRepo<Address>>;
  let service: AddressService;

  beforeEach(() => {
    addresses = mockRepo<Address>();
    service = new AddressService({ addresses });
  });

  it('cria endereco vinculado ao usuario', async () => {
    addresses.count.mockResolvedValue(0);
    addresses.create.mockImplementation((v) => v as Address);
    addresses.save.mockImplementation(async (v) => ({ ...v, id: 'addr-1' }) as Address);

    const created = await service.create('user-1', {
      label: 'Casa', street: 'Rua', number: '1', complement: null,
      district: 'Centro', city: 'POA', state: 'RS', zipCode: '90000-000',
    });
    const saved = addresses.save.mock.calls[0][0] as Address;
    expect(saved.user).toEqual({ id: 'user-1' });
    expect(saved.isDefault).toBe(true);
    expect(created.id).toBe('addr-1');
  });

  it('impede atualizar endereco de outro usuario', async () => {
    addresses.findOne.mockResolvedValue({ id: 'addr-1', user: { id: 'outro' } } as Address);
    await expect(
      service.update('user-1', 'addr-1', { label: 'X' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('setDefault zera os demais e marca o alvo', async () => {
    addresses.findOne.mockResolvedValue({ id: 'addr-2', user: { id: 'user-1' } } as Address);
    addresses.update.mockResolvedValue({ affected: 1 } as never);

    await service.setDefault('user-1', 'addr-2');
    expect(addresses.update).toHaveBeenCalledWith({ user: { id: 'user-1' } }, { isDefault: false });
    expect(addresses.update).toHaveBeenCalledWith('addr-2', { isDefault: true });
  });

  it('remove lanca 404 quando nao encontrado', async () => {
    addresses.findOne.mockResolvedValue(null);
    await expect(service.remove('user-1', 'x')).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/address/address.service.test.ts`
Expected: FAIL — `Cannot find module './address.service'`.

- [ ] **Step 4: Implementar service**

Create `backend/src/modules/address/address.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { Address } from '../../infra/database/entities/address.entity';
import { User } from '../../infra/database/entities/user.entity';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import type { AddressDto, CreateAddressInput, UpdateAddressInput } from './address.schemas';

interface AddressDeps {
  addresses: Repository<Address>;
}

export class AddressService {
  constructor(private readonly deps: AddressDeps) {}

  async list(userId: string): Promise<AddressDto[]> {
    const rows = await this.deps.addresses.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(userId: string, input: CreateAddressInput): Promise<AddressDto> {
    const count = await this.deps.addresses.count({ where: { user: { id: userId } } });
    const entity = this.deps.addresses.create({
      ...input,
      user: { id: userId } as User,
      isDefault: count === 0,
    });
    const saved = await this.deps.addresses.save(entity);
    return this.toDto(saved);
  }

  async update(userId: string, id: string, input: UpdateAddressInput): Promise<AddressDto> {
    const current = await this.owned(userId, id);
    const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length > 0) {
      await this.deps.addresses.update(id, patch);
    }
    return this.toDto({ ...current, ...patch } as Address);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.deps.addresses.delete(id);
  }

  async setDefault(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.deps.addresses.update({ user: { id: userId } }, { isDefault: false });
    await this.deps.addresses.update(id, { isDefault: true });
  }

  private async owned(userId: string, id: string): Promise<Address> {
    const address = await this.deps.addresses.findOne({ where: { id }, relations: { user: true } });
    if (!address) {
      throw new NotFoundError('Endereco nao encontrado');
    }
    if (address.user.id !== userId) {
      throw new ForbiddenError('Endereco de outro usuario');
    }
    return address;
  }

  private toDto(a: Address): AddressDto {
    return {
      id: a.id,
      label: a.label,
      street: a.street,
      number: a.number,
      complement: a.complement ?? null,
      district: a.district,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
      isDefault: a.isDefault,
    };
  }
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/address/address.service.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Controller + rotas**

Create `backend/src/modules/address/address.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AddressService } from './address.service';
import type { CreateAddressInput, UpdateAddressInput } from './address.schemas';

export class AddressController {
  constructor(private readonly service: AddressService) {}

  list = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.list(req.user.id));

  create = async (req: FastifyRequest<{ Body: CreateAddressInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.create(req.user.id, req.body));

  update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateAddressInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.update(req.user.id, req.params.id, req.body));

  remove = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.remove(req.user.id, req.params.id);
    return reply.status(204).send();
  };

  setDefault = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.setDefault(req.user.id, req.params.id);
    return reply.status(204).send();
  };
}
```

Create `backend/src/modules/address/address.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { Address } from '../../infra/database/entities/address.entity';
import { idParamSchema } from '../../shared/schemas/common';
import { addressSchema, createAddressSchema, updateAddressSchema } from './address.schemas';

export async function addressRoutes(app: FastifyInstance): Promise<void> {
  const dataSource = app.getDecorator<DataSource>('dataSource');
  const service = new AddressService({ addresses: dataSource.getRepository(Address) });
  const controller = new AddressController(service);

  app.get('/addresses', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Lista enderecos', response: { 200: z.array(addressSchema) } },
    handler: controller.list,
  });
  app.post('/addresses', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Cria endereco', body: createAddressSchema, response: { 201: addressSchema } },
    handler: controller.create,
  });
  app.patch('/addresses/:id', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Atualiza endereco', params: idParamSchema, body: updateAddressSchema, response: { 200: addressSchema } },
    handler: controller.update,
  });
  app.delete('/addresses/:id', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Remove endereco', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.remove,
  });
  app.post('/addresses/:id/default', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Define endereco padrao', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.setDefault,
  });
}
```

Register in `app.ts`:

```ts
import { addressRoutes } from './modules/address/address.routes';
```
```ts
  await app.register(addressRoutes, { prefix: '/api' });
```

- [ ] **Step 7: Teste de integração**

Create `backend/src/modules/address/address.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';

async function authHeader(app: FastifyInstance) {
  const email = `addr-${Date.now()}-${Math.random()}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'A', email, phone: '+5551999990004', password: 'S3nh@Forte', role: 'client' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('address routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cria primeiro endereco como padrao e lista', async () => {
    const headers = await authHeader(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/addresses',
      headers,
      payload: { label: 'Casa', street: 'Rua', number: '1', complement: null, district: 'Centro', city: 'POA', state: 'RS', zipCode: '90000-000' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().isDefault).toBe(true);

    const list = await app.inject({ method: 'GET', url: '/api/addresses', headers });
    expect(list.json()).toHaveLength(1);
  });

  it('nao permite acessar endereco sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/addresses' });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/address/`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/address/ backend/src/app.ts
git commit -m "feat(address): adiciona crud de enderecos do usuario"
```

---

### Task 9: Módulo account — preferências e consentimentos LGPD

**Files:**
- Create: `backend/src/modules/account/account.schemas.ts`
- Create: `backend/src/modules/account/account.service.ts`
- Create: `backend/src/modules/account/account.controller.ts`
- Create: `backend/src/modules/account/account.routes.ts`
- Test: `backend/src/modules/account/account.service.test.ts`
- Test: `backend/src/modules/account/account.routes.test.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `UserPreference`, `UserConsent` repos; `app.authenticate`.
- Produces:
  - `class AccountService` com `getPreferences(userId)`, `updatePreferences(userId, input)`, `listConsents(userId)`, `recordConsent(userId, input, meta)`.
  - `type ConsentType = 'terms' | 'privacy' | 'marketing'`
  - Rotas `GET/PATCH /api/account/preferences`, `GET/POST /api/account/consents`.

- [ ] **Step 1: Escrever schemas**

Create `backend/src/modules/account/account.schemas.ts`:

```ts
import { z } from 'zod';

export const preferencesSchema = z.object({
  language: z.enum(['pt-BR', 'en-US']).describe('Idioma').openapi({ example: 'pt-BR' }),
  theme: z.enum(['light', 'dark', 'system']).describe('Tema').openapi({ example: 'system' }),
  emailNotifications: z.boolean().describe('Notificacoes por e-mail').openapi({ example: true }),
  pushNotifications: z.boolean().describe('Notificacoes push').openapi({ example: true }),
});

export const updatePreferencesSchema = preferencesSchema.partial();

export const consentTypeSchema = z
  .enum(['terms', 'privacy', 'marketing'])
  .describe('Tipo de consentimento LGPD')
  .openapi({ example: 'privacy' });

export const recordConsentSchema = z.object({
  type: consentTypeSchema,
  granted: z.boolean().describe('Consentimento concedido?').openapi({ example: true }),
  version: z.string().describe('Versao do documento aceito').openapi({ example: '2026-07-01' }),
});

export const consentSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '33333333-3333-3333-3333-333333333333' }),
  type: consentTypeSchema,
  granted: z.boolean().describe('Concedido').openapi({ example: true }),
  version: z.string().describe('Versao').openapi({ example: '2026-07-01' }),
  ipAddress: z.string().nullable().describe('IP de origem').openapi({ example: '187.1.1.1' }),
  createdAt: z.string().datetime().describe('Data do registro').openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export type PreferencesDto = z.infer<typeof preferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
export type ConsentDto = z.infer<typeof consentSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Create `backend/src/modules/account/account.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountService } from './account.service';
import { mockRepo } from '../../test/mocks';
import type { UserPreference } from '../../infra/database/entities/user-preference.entity';
import type { UserConsent } from '../../infra/database/entities/user-consent.entity';

describe('AccountService', () => {
  let preferences: ReturnType<typeof mockRepo<UserPreference>>;
  let consents: ReturnType<typeof mockRepo<UserConsent>>;
  let service: AccountService;

  beforeEach(() => {
    preferences = mockRepo<UserPreference>();
    consents = mockRepo<UserConsent>();
    service = new AccountService({ preferences, consents });
  });

  it('cria preferencias padrao quando inexistentes', async () => {
    preferences.findOne.mockResolvedValue(null);
    preferences.create.mockImplementation((v) => v as UserPreference);
    preferences.save.mockImplementation(async (v) => v as UserPreference);

    const prefs = await service.getPreferences('user-1');
    expect(prefs.language).toBe('pt-BR');
    expect(preferences.save).toHaveBeenCalled();
  });

  it('registra consentimento com ip e versao (rastreado)', async () => {
    consents.create.mockImplementation((v) => v as UserConsent);
    consents.save.mockImplementation(async (v) => ({ ...v, id: 'c-1', createdAt: new Date() }) as UserConsent);

    const consent = await service.recordConsent(
      'user-1',
      { type: 'marketing', granted: true, version: '2026-07-01' },
      { ipAddress: '187.1.1.1' },
    );
    const saved = consents.save.mock.calls[0][0] as UserConsent;
    expect(saved.ipAddress).toBe('187.1.1.1');
    expect(saved.user).toEqual({ id: 'user-1' });
    expect(consent.type).toBe('marketing');
  });

  it('atualiza somente preferencias enviadas', async () => {
    preferences.findOne.mockResolvedValue({
      user: { id: 'user-1' }, language: 'pt-BR', theme: 'system', emailNotifications: true, pushNotifications: true,
    } as UserPreference);
    preferences.save.mockImplementation(async (v) => v as UserPreference);

    const prefs = await service.updatePreferences('user-1', { theme: 'dark' });
    expect(prefs.theme).toBe('dark');
    expect(prefs.language).toBe('pt-BR');
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/account/account.service.test.ts`
Expected: FAIL — `Cannot find module './account.service'`.

- [ ] **Step 4: Implementar service**

Create `backend/src/modules/account/account.service.ts`:

```ts
import type { Repository } from 'typeorm';
import { UserPreference } from '../../infra/database/entities/user-preference.entity';
import { UserConsent } from '../../infra/database/entities/user-consent.entity';
import { User } from '../../infra/database/entities/user.entity';
import type {
  PreferencesDto,
  UpdatePreferencesInput,
  RecordConsentInput,
  ConsentDto,
} from './account.schemas';

interface AccountDeps {
  preferences: Repository<UserPreference>;
  consents: Repository<UserConsent>;
}

interface ConsentMeta {
  ipAddress: string | null;
}

const DEFAULT_PREFERENCES = {
  language: 'pt-BR' as const,
  theme: 'system' as const,
  emailNotifications: true,
  pushNotifications: true,
};

export class AccountService {
  constructor(private readonly deps: AccountDeps) {}

  async getPreferences(userId: string): Promise<PreferencesDto> {
    let prefs = await this.deps.preferences.findOne({ where: { user: { id: userId } } });
    if (!prefs) {
      prefs = await this.deps.preferences.save(
        this.deps.preferences.create({ user: { id: userId } as User, ...DEFAULT_PREFERENCES }),
      );
    }
    return this.toPrefsDto(prefs);
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<PreferencesDto> {
    const prefs = await this.deps.preferences.findOne({ where: { user: { id: userId } } });
    const base = prefs ?? this.deps.preferences.create({ user: { id: userId } as User, ...DEFAULT_PREFERENCES });
    const merged = Object.assign(base, Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ));
    const saved = await this.deps.preferences.save(merged);
    return this.toPrefsDto(saved);
  }

  async listConsents(userId: string): Promise<ConsentDto[]> {
    const rows = await this.deps.consents.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((c) => this.toConsentDto(c));
  }

  async recordConsent(
    userId: string,
    input: RecordConsentInput,
    meta: ConsentMeta,
  ): Promise<ConsentDto> {
    const entity = this.deps.consents.create({
      user: { id: userId } as User,
      type: input.type,
      granted: input.granted,
      version: input.version,
      ipAddress: meta.ipAddress,
    });
    const saved = await this.deps.consents.save(entity);
    return this.toConsentDto(saved);
  }

  private toPrefsDto(p: UserPreference): PreferencesDto {
    return {
      language: p.language,
      theme: p.theme,
      emailNotifications: p.emailNotifications,
      pushNotifications: p.pushNotifications,
    };
  }

  private toConsentDto(c: UserConsent): ConsentDto {
    return {
      id: c.id,
      type: c.type,
      granted: c.granted,
      version: c.version,
      ipAddress: c.ipAddress ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd backend && npx vitest run src/modules/account/account.service.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Controller + rotas**

Create `backend/src/modules/account/account.controller.ts`:

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AccountService } from './account.service';
import type { UpdatePreferencesInput, RecordConsentInput } from './account.schemas';

export class AccountController {
  constructor(private readonly service: AccountService) {}

  getPreferences = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.getPreferences(req.user.id));

  updatePreferences = async (
    req: FastifyRequest<{ Body: UpdatePreferencesInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.updatePreferences(req.user.id, req.body));

  listConsents = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listConsents(req.user.id));

  recordConsent = async (
    req: FastifyRequest<{ Body: RecordConsentInput }>,
    reply: FastifyReply,
  ) =>
    reply
      .status(201)
      .send(await this.service.recordConsent(req.user.id, req.body, { ipAddress: req.ip ?? null }));
}
```

Create `backend/src/modules/account/account.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { UserPreference } from '../../infra/database/entities/user-preference.entity';
import { UserConsent } from '../../infra/database/entities/user-consent.entity';
import {
  preferencesSchema,
  updatePreferencesSchema,
  consentSchema,
  recordConsentSchema,
} from './account.schemas';

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  const dataSource = app.getDecorator<DataSource>('dataSource');
  const service = new AccountService({
    preferences: dataSource.getRepository(UserPreference),
    consents: dataSource.getRepository(UserConsent),
  });
  const controller = new AccountController(service);

  app.get('/account/preferences', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Preferencias', response: { 200: preferencesSchema } },
    handler: controller.getPreferences,
  });
  app.patch('/account/preferences', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Atualiza preferencias', body: updatePreferencesSchema, response: { 200: preferencesSchema } },
    handler: controller.updatePreferences,
  });
  app.get('/account/consents', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Historico de consentimentos', response: { 200: z.array(consentSchema) } },
    handler: controller.listConsents,
  });
  app.post('/account/consents', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Registra consentimento LGPD', body: recordConsentSchema, response: { 201: consentSchema } },
    handler: controller.recordConsent,
  });
}
```

Register in `app.ts`:

```ts
import { accountRoutes } from './modules/account/account.routes';
```
```ts
  await app.register(accountRoutes, { prefix: '/api' });
```

- [ ] **Step 7: Teste de integração**

Create `backend/src/modules/account/account.routes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../test/build-test-app';

async function authHeader(app: FastifyInstance) {
  const email = `acc-${Date.now()}-${Math.random()}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'C', email, phone: '+5551999990005', password: 'S3nh@Forte', role: 'client' },
  });
  return { authorization: `Bearer ${res.json().accessToken}` };
}

describe('account routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('retorna preferencias padrao e atualiza', async () => {
    const headers = await authHeader(app);
    const prefs = await app.inject({ method: 'GET', url: '/api/account/preferences', headers });
    expect(prefs.json().language).toBe('pt-BR');

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/account/preferences',
      headers,
      payload: { theme: 'dark' },
    });
    expect(updated.json().theme).toBe('dark');
  });

  it('registra e lista consentimento LGPD', async () => {
    const headers = await authHeader(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/account/consents',
      headers,
      payload: { type: 'privacy', granted: true, version: '2026-07-01' },
    });
    expect(created.statusCode).toBe(201);
    const list = await app.inject({ method: 'GET', url: '/api/account/consents', headers });
    expect(list.json()[0].type).toBe('privacy');
  });
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/account/`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/account/ backend/src/app.ts
git commit -m "feat(account): adiciona preferencias e consentimentos lgpd rastreados"
```

---

### Task 10: account — exclusão de conta com período de carência

**Files:**
- Modify: `backend/src/modules/account/account.schemas.ts`
- Modify: `backend/src/modules/account/account.service.ts`
- Modify: `backend/src/modules/account/account.controller.ts`
- Modify: `backend/src/modules/account/account.routes.ts`
- Modify: `backend/src/modules/account/account.service.test.ts`
- Modify: `backend/src/modules/account/account.routes.test.ts`

**Interfaces:**
- Consumes: `AccountDeletionRequest` repo.
- Produces:
  - `AccountDeps` ganha `deletionRequests: Repository<AccountDeletionRequest>`.
  - `requestDeletion(userId): Promise<DeletionRequestDto>` — cria com `scheduledFor = now + GRACE_DAYS`, rejeita se já pendente.
  - `cancelDeletion(userId): Promise<void>` — marca pendente como cancelada.
  - `getDeletionStatus(userId): Promise<DeletionRequestDto | null>`.
  - Rotas `POST /api/account/deletion`, `DELETE /api/account/deletion`, `GET /api/account/deletion`.

- [ ] **Step 1: Adicionar schemas**

Add to `account.schemas.ts`:

```ts
export const deletionStatusSchema = z
  .enum(['pending', 'cancelled', 'completed'])
  .describe('Status da solicitacao de exclusao')
  .openapi({ example: 'pending' });

export const deletionRequestSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '44444444-4444-4444-4444-444444444444' }),
  status: deletionStatusSchema,
  requestedAt: z.string().datetime().describe('Data da solicitacao').openapi({ example: '2026-07-01T12:00:00.000Z' }),
  scheduledFor: z.string().datetime().describe('Data efetiva da exclusao').openapi({ example: '2026-07-31T12:00:00.000Z' }),
});

export type DeletionRequestDto = z.infer<typeof deletionRequestSchema>;
```

- [ ] **Step 2: Escrever teste falhando**

Add to `account.service.test.ts`:

```ts
import type { AccountDeletionRequest } from '../../infra/database/entities/account-deletion-request.entity';

describe('AccountService exclusao com carencia', () => {
  let preferences: ReturnType<typeof mockRepo<UserPreference>>;
  let consents: ReturnType<typeof mockRepo<UserConsent>>;
  let deletionRequests: ReturnType<typeof mockRepo<AccountDeletionRequest>>;
  let service: AccountService;

  beforeEach(() => {
    preferences = mockRepo<UserPreference>();
    consents = mockRepo<UserConsent>();
    deletionRequests = mockRepo<AccountDeletionRequest>();
    service = new AccountService({ preferences, consents, deletionRequests });
  });

  it('cria solicitacao com data agendada no futuro (carencia)', async () => {
    deletionRequests.findOne.mockResolvedValue(null);
    deletionRequests.create.mockImplementation((v) => v as AccountDeletionRequest);
    deletionRequests.save.mockImplementation(async (v) => ({ ...v, id: 'd-1', requestedAt: new Date() }) as AccountDeletionRequest);

    const req = await service.requestDeletion('user-1');
    const saved = deletionRequests.save.mock.calls[0][0] as AccountDeletionRequest;
    expect(saved.status).toBe('pending');
    expect(saved.scheduledFor.getTime()).toBeGreaterThan(Date.now());
    expect(req.status).toBe('pending');
  });

  it('rejeita segunda solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue({ id: 'd-1', status: 'pending' } as AccountDeletionRequest);
    await expect(service.requestDeletion('user-1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('cancela solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue({ id: 'd-1', status: 'pending' } as AccountDeletionRequest);
    deletionRequests.save.mockImplementation(async (v) => v as AccountDeletionRequest);

    await service.cancelDeletion('user-1');
    const saved = deletionRequests.save.mock.calls[0][0] as AccountDeletionRequest;
    expect(saved.status).toBe('cancelled');
  });

  it('cancel lanca 404 sem solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue(null);
    await expect(service.cancelDeletion('user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/modules/account/account.service.test.ts`
Expected: FAIL — `service.requestDeletion is not a function`.

- [ ] **Step 4: Implementar**

Update `account.service.ts` deps and add methods:

```ts
import { AccountDeletionRequest } from '../../infra/database/entities/account-deletion-request.entity';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type { DeletionRequestDto } from './account.schemas';
```

Add `deletionRequests: Repository<AccountDeletionRequest>;` to `AccountDeps`, then:

```ts
  private readonly graceDays = 30;

  async requestDeletion(userId: string): Promise<DeletionRequestDto> {
    const pending = await this.deps.deletionRequests.findOne({
      where: { user: { id: userId }, status: 'pending' },
    });
    if (pending) {
      throw new ConflictError('Ja existe uma solicitacao de exclusao pendente');
    }
    const scheduledFor = new Date(Date.now() + this.graceDays * 24 * 60 * 60 * 1000);
    const saved = await this.deps.deletionRequests.save(
      this.deps.deletionRequests.create({
        user: { id: userId } as User,
        status: 'pending',
        scheduledFor,
      }),
    );
    return this.toDeletionDto(saved);
  }

  async cancelDeletion(userId: string): Promise<void> {
    const pending = await this.deps.deletionRequests.findOne({
      where: { user: { id: userId }, status: 'pending' },
    });
    if (!pending) {
      throw new NotFoundError('Nenhuma solicitacao de exclusao pendente');
    }
    pending.status = 'cancelled';
    await this.deps.deletionRequests.save(pending);
  }

  async getDeletionStatus(userId: string): Promise<DeletionRequestDto | null> {
    const pending = await this.deps.deletionRequests.findOne({
      where: { user: { id: userId }, status: 'pending' },
    });
    return pending ? this.toDeletionDto(pending) : null;
  }

  private toDeletionDto(d: AccountDeletionRequest): DeletionRequestDto {
    return {
      id: d.id,
      status: d.status,
      requestedAt: d.requestedAt.toISOString(),
      scheduledFor: d.scheduledFor.toISOString(),
    };
  }
```

- [ ] **Step 5: Adicionar controller + rotas**

Add to `account.controller.ts`:

```ts
  requestDeletion = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.status(201).send(await this.service.requestDeletion(req.user.id));

  cancelDeletion = async (req: FastifyRequest, reply: FastifyReply) => {
    await this.service.cancelDeletion(req.user.id);
    return reply.status(204).send();
  };

  deletionStatus = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.getDeletionStatus(req.user.id));
```

Add to `account.routes.ts` (import `deletionRequestSchema`, and `AccountDeletionRequest`; add repo to service deps):

```ts
import { AccountDeletionRequest } from '../../infra/database/entities/account-deletion-request.entity';
import { deletionRequestSchema } from './account.schemas';
```

Update service construction to include:

```ts
    deletionRequests: dataSource.getRepository(AccountDeletionRequest),
```

Add routes:

```ts
  app.post('/account/deletion', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Solicita exclusao de conta', response: { 201: deletionRequestSchema } },
    handler: controller.requestDeletion,
  });
  app.delete('/account/deletion', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Cancela exclusao de conta', response: { 204: z.void() } },
    handler: controller.cancelDeletion,
  });
  app.get('/account/deletion', {
    onRequest: [app.authenticate],
    schema: { tags: ['account'], summary: 'Status da exclusao', response: { 200: deletionRequestSchema.nullable() } },
    handler: controller.deletionStatus,
  });
```

- [ ] **Step 6: Teste de integração**

Add to `account.routes.test.ts`:

```ts
  it('solicita, consulta e cancela exclusao de conta', async () => {
    const headers = await authHeader(app);
    const created = await app.inject({ method: 'POST', url: '/api/account/deletion', headers });
    expect(created.statusCode).toBe(201);
    expect(created.json().status).toBe('pending');
    expect(new Date(created.json().scheduledFor).getTime()).toBeGreaterThan(Date.now());

    const status = await app.inject({ method: 'GET', url: '/api/account/deletion', headers });
    expect(status.json().status).toBe('pending');

    const cancelled = await app.inject({ method: 'DELETE', url: '/api/account/deletion', headers });
    expect(cancelled.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/api/account/deletion', headers });
    expect(after.json()).toBeNull();
  });

  it('rejeita segunda solicitacao pendente com 409', async () => {
    const headers = await authHeader(app);
    await app.inject({ method: 'POST', url: '/api/account/deletion', headers });
    const second = await app.inject({ method: 'POST', url: '/api/account/deletion', headers });
    expect(second.statusCode).toBe(409);
  });
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd backend && npx vitest run src/modules/account/`
Expected: PASS (todos).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/account/
git commit -m "feat(account): adiciona exclusao de conta com periodo de carencia"
```

---

### Task 11: Frontend feature auth — schemas, api e store integration

**Files:**
- Create: `frontend/src/features/auth/schemas.ts`
- Create: `frontend/src/features/auth/api.ts`
- Create: `frontend/src/features/auth/queries.ts`
- Test: `frontend/src/features/auth/auth.test.tsx`

**Interfaces:**
- Consumes: `lib/http` (axios, fase 3), `stores/auth` (`setAuth`, `clear`, fase 3), `@tanstack/react-query`.
- Produces:
  - `loginSchema`, `registerSchema`, `resetPasswordSchema` (Zod, para react-hook-form).
  - `authApi = { login, register, refresh, logout, forgotPassword, resetPassword, verifyEmail }`.
  - `useLogin()`, `useRegister()` mutations que gravam em `stores/auth`.

- [ ] **Step 1: Escrever schemas**

Create `frontend/src/features/auth/schemas.ts`:

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Informe o nome'),
    email: z.string().email('E-mail invalido'),
    phone: z.string().min(10, 'Telefone invalido'),
    password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(8),
    role: z.enum(['client', 'professional']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail invalido'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 2: Escrever api**

Create `frontend/src/features/auth/api.ts`:

```ts
import { http } from '../../lib/http';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: 'client' | 'professional' | 'admin' };
}

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<AuthResult> {
    const { data } = await http.post<AuthResult>('/auth/login', payload);
    return data;
  },
  async register(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'client' | 'professional';
  }): Promise<AuthResult> {
    const { data } = await http.post<AuthResult>('/auth/register', payload);
    return data;
  },
  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refreshToken });
  },
  async forgotPassword(email: string): Promise<void> {
    await http.post('/auth/password/forgot', { email });
  },
  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await http.post('/auth/password/reset', payload);
  },
  async verifyEmail(token: string): Promise<void> {
    await http.post('/auth/verify-email', { token });
  },
};
```

- [ ] **Step 3: Escrever queries**

Create `frontend/src/features/auth/queries.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from '../../stores/auth';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setAuth({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => {
      setAuth({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
```

- [ ] **Step 4: Escrever teste falhando**

Create `frontend/src/features/auth/auth.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin } from './queries';
import { authApi } from './api';
import { useAuthStore } from '../../stores/auth';

vi.mock('./api', () => ({
  authApi: { login: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLogin', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.clearAllMocks();
  });

  it('grava usuario e token no store apos login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'm@e.com', password: 'S3nh@Forte' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('acc');
    expect(useAuthStore.getState().user?.id).toBe('user-1');
  });
});
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/auth/auth.test.tsx`
Expected: PASS (após criar arquivos). Se `stores/auth` não expor `refreshToken`, ajustar store da fase 3 para persistir refresh token.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/
git commit -m "feat(auth-web): adiciona schemas, api e mutations de autenticacao"
```

---

### Task 12: Frontend feature auth — páginas login/registro/verificação/reset

**Files:**
- Create: `frontend/src/features/auth/components/AuthField.tsx`
- Create: `frontend/src/features/auth/pages/LoginPage.tsx`
- Create: `frontend/src/features/auth/pages/RegisterPage.tsx`
- Create: `frontend/src/features/auth/pages/VerifyEmailPage.tsx`
- Create: `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- Create: `frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- Test: `frontend/src/features/auth/pages/LoginPage.test.tsx`
- Modify: `frontend/src/router/routes.tsx` (adicionar rotas públicas)

**Interfaces:**
- Consumes: `useLogin`, `useRegister`, `useForgotPassword`, `useResetPassword` (Task 11); react-hook-form + `@hookform/resolvers/zod`; `react-router-dom` (`useNavigate`, `useSearchParams`).
- Produces: componentes de página exportados default; rotas `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`.

- [ ] **Step 1: Escrever campo reutilizável**

Create `frontend/src/features/auth/components/AuthField.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, error, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        ref={ref}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
```

- [ ] **Step 2: Escrever LoginPage**

Create `frontend/src/features/auth/pages/LoginPage.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, type LoginForm } from '../schemas';
import { useLogin } from '../queries';
import { AuthField } from '../components/AuthField';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
    navigate('/');
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
      {login.isError ? <p className="text-sm text-red-600">Credenciais invalidas</p> : null}
      <button type="submit" disabled={login.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </button>
      <div className="flex justify-between text-sm">
        <Link to="/register" className="text-slate-600 underline">Criar conta</Link>
        <Link to="/forgot-password" className="text-slate-600 underline">Esqueci a senha</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Escrever RegisterPage**

Create `frontend/src/features/auth/pages/RegisterPage.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { registerSchema, type RegisterForm } from '../schemas';
import { useRegister } from '../queries';
import { AuthField } from '../components/AuthField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'client' } });

  const onSubmit = handleSubmit(async (values) => {
    await registerMutation.mutateAsync({
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: values.role,
    });
    navigate('/verify-email');
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <AuthField label="Nome" {...register('name')} error={errors.name?.message} />
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      <AuthField label="Telefone" {...register('phone')} error={errors.phone?.message} />
      <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
      <AuthField label="Confirmar senha" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Perfil</span>
        <select className="rounded-lg border border-slate-300 px-3 py-2" {...register('role')}>
          <option value="client">Cliente</option>
          <option value="professional">Profissional</option>
        </select>
      </label>
      {registerMutation.isError ? <p className="text-sm text-red-600">Nao foi possivel criar a conta</p> : null}
      <button type="submit" disabled={registerMutation.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        {registerMutation.isPending ? 'Enviando...' : 'Cadastrar'}
      </button>
      <Link to="/login" className="text-sm text-slate-600 underline">Ja tenho conta</Link>
    </form>
  );
}
```

- [ ] **Step 4: Escrever VerifyEmailPage / Forgot / Reset**

Create `frontend/src/features/auth/pages/VerifyEmailPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!token) {
      return;
    }
    setStatus('pending');
    authApi
      .verifyEmail(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="mx-auto max-w-sm p-6 text-center">
      <h1 className="text-xl font-semibold">Verificacao de e-mail</h1>
      {!token ? <p>Abra o link enviado ao seu e-mail.</p> : null}
      {status === 'pending' ? <p>Confirmando...</p> : null}
      {status === 'done' ? <p className="text-green-600">E-mail confirmado!</p> : null}
      {status === 'error' ? <p className="text-red-600">Token invalido ou expirado.</p> : null}
      <Link to="/login" className="mt-4 inline-block text-slate-600 underline">Ir para o login</Link>
    </div>
  );
}
```

Create `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';
import { useForgotPassword } from '../queries';
import { AuthField } from '../components/AuthField';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Recuperar senha</h1>
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      {forgot.isSuccess ? <p className="text-sm text-green-600">Se o e-mail existir, enviamos as instrucoes.</p> : null}
      <button type="submit" disabled={forgot.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        Enviar
      </button>
    </form>
  );
}
```

Create `frontend/src/features/auth/pages/ResetPasswordPage.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas';
import { useResetPassword } from '../queries';
import { AuthField } from '../components/AuthField';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get('token') ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await reset.mutateAsync({ token: values.token, password: values.password });
    navigate('/login');
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Nova senha</h1>
      <input type="hidden" {...register('token')} />
      <AuthField label="Nova senha" type="password" {...register('password')} error={errors.password?.message} />
      <AuthField label="Confirmar senha" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      {reset.isError ? <p className="text-sm text-red-600">Token invalido ou expirado</p> : null}
      <button type="submit" disabled={reset.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        Redefinir
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Registrar rotas**

In `frontend/src/router/routes.tsx`, add public routes (lazy import if the file uses lazy; else direct):

```tsx
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
```

Add to the routes array:

```tsx
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
```

- [ ] **Step 6: Escrever teste da LoginPage**

Create `frontend/src/features/auth/pages/LoginPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import { authApi } from '../api';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../api', () => ({ authApi: { login: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.clearAllMocks();
  });

  it('valida e-mail invalido antes de enviar', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nao-email' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('E-mail invalido')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('envia credenciais validas', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ email: 'm@e.com', password: 'S3nh@Forte' }));
  });
});
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/auth/pages/LoginPage.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/auth/ frontend/src/router/routes.tsx
git commit -m "feat(auth-web): adiciona paginas de login, registro, verificacao e reset"
```

---

### Task 13: Frontend feature settings — preferências, consentimentos e exclusão

**Files:**
- Create: `frontend/src/features/settings/schemas.ts`
- Create: `frontend/src/features/settings/api.ts`
- Create: `frontend/src/features/settings/queries.ts`
- Create: `frontend/src/features/settings/pages/SettingsPage.tsx`
- Create: `frontend/src/features/settings/components/PreferencesForm.tsx`
- Create: `frontend/src/features/settings/components/ConsentsPanel.tsx`
- Create: `frontend/src/features/settings/components/DeleteAccountPanel.tsx`
- Test: `frontend/src/features/settings/settings.test.tsx`
- Modify: `frontend/src/router/routes.tsx` (rota protegida `/settings`)

**Interfaces:**
- Consumes: `lib/http`, `@tanstack/react-query`, react-hook-form; `ProtectedRoute` (fase 3).
- Produces:
  - `settingsApi = { getPreferences, updatePreferences, listConsents, recordConsent, requestDeletion, cancelDeletion, getDeletionStatus }`.
  - Hooks `usePreferences`, `useUpdatePreferences`, `useConsents`, `useRecordConsent`, `useDeletionStatus`, `useRequestDeletion`, `useCancelDeletion`.

- [ ] **Step 1: Escrever schemas + api**

Create `frontend/src/features/settings/schemas.ts`:

```ts
import { z } from 'zod';

export const preferencesFormSchema = z.object({
  language: z.enum(['pt-BR', 'en-US']),
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

export type PreferencesForm = z.infer<typeof preferencesFormSchema>;
```

Create `frontend/src/features/settings/api.ts`:

```ts
import { http } from '../../lib/http';

export interface Preferences {
  language: 'pt-BR' | 'en-US';
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface Consent {
  id: string;
  type: 'terms' | 'privacy' | 'marketing';
  granted: boolean;
  version: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface DeletionRequest {
  id: string;
  status: 'pending' | 'cancelled' | 'completed';
  requestedAt: string;
  scheduledFor: string;
}

export const settingsApi = {
  async getPreferences(): Promise<Preferences> {
    const { data } = await http.get<Preferences>('/account/preferences');
    return data;
  },
  async updatePreferences(payload: Partial<Preferences>): Promise<Preferences> {
    const { data } = await http.patch<Preferences>('/account/preferences', payload);
    return data;
  },
  async listConsents(): Promise<Consent[]> {
    const { data } = await http.get<Consent[]>('/account/consents');
    return data;
  },
  async recordConsent(payload: { type: Consent['type']; granted: boolean; version: string }): Promise<Consent> {
    const { data } = await http.post<Consent>('/account/consents', payload);
    return data;
  },
  async requestDeletion(): Promise<DeletionRequest> {
    const { data } = await http.post<DeletionRequest>('/account/deletion');
    return data;
  },
  async cancelDeletion(): Promise<void> {
    await http.delete('/account/deletion');
  },
  async getDeletionStatus(): Promise<DeletionRequest | null> {
    const { data } = await http.get<DeletionRequest | null>('/account/deletion');
    return data;
  },
};
```

- [ ] **Step 2: Escrever queries**

Create `frontend/src/features/settings/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type Preferences } from './api';

const keys = {
  preferences: ['settings', 'preferences'] as const,
  consents: ['settings', 'consents'] as const,
  deletion: ['settings', 'deletion'] as const,
};

export function usePreferences() {
  return useQuery({ queryKey: keys.preferences, queryFn: settingsApi.getPreferences });
}

export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Preferences>) => settingsApi.updatePreferences(payload),
    onSuccess: (data) => client.setQueryData(keys.preferences, data),
  });
}

export function useConsents() {
  return useQuery({ queryKey: keys.consents, queryFn: settingsApi.listConsents });
}

export function useRecordConsent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.recordConsent,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.consents }),
  });
}

export function useDeletionStatus() {
  return useQuery({ queryKey: keys.deletion, queryFn: settingsApi.getDeletionStatus });
}

export function useRequestDeletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.requestDeletion,
    onSuccess: (data) => client.setQueryData(keys.deletion, data),
  });
}

export function useCancelDeletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.cancelDeletion,
    onSuccess: () => client.setQueryData(keys.deletion, null),
  });
}
```

- [ ] **Step 3: Escrever componentes**

Create `frontend/src/features/settings/components/PreferencesForm.tsx`:

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesFormSchema, type PreferencesForm as FormValues } from '../schemas';
import { usePreferences, useUpdatePreferences } from '../queries';

export function PreferencesForm() {
  const { data } = usePreferences();
  const update = useUpdatePreferences();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(preferencesFormSchema),
  });

  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => update.mutate(values));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Preferencias</h2>
      <label className="flex items-center justify-between">
        Idioma
        <select {...register('language')} className="rounded border px-2 py-1">
          <option value="pt-BR">Portugues</option>
          <option value="en-US">English</option>
        </select>
      </label>
      <label className="flex items-center justify-between">
        Tema
        <select {...register('theme')} className="rounded border px-2 py-1">
          <option value="system">Sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('emailNotifications')} /> Notificacoes por e-mail
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('pushNotifications')} /> Notificacoes push
      </label>
      <button type="submit" disabled={update.isPending} className="rounded bg-slate-900 py-2 text-white disabled:opacity-50">
        Salvar
      </button>
    </form>
  );
}
```

Create `frontend/src/features/settings/components/ConsentsPanel.tsx`:

```tsx
import { useConsents, useRecordConsent } from '../queries';

const CONSENT_VERSION = '2026-07-01';

export function ConsentsPanel() {
  const { data } = useConsents();
  const record = useRecordConsent();
  const marketing = data?.find((c) => c.type === 'marketing');
  const granted = marketing?.granted ?? false;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Consentimentos (LGPD)</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={granted}
          onChange={(e) =>
            record.mutate({ type: 'marketing', granted: e.target.checked, version: CONSENT_VERSION })
          }
        />
        Aceito receber comunicacoes de marketing
      </label>
      <ul className="text-xs text-slate-500">
        {data?.map((c) => (
          <li key={c.id}>
            {c.type} — {c.granted ? 'concedido' : 'revogado'} em {new Date(c.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `frontend/src/features/settings/components/DeleteAccountPanel.tsx`:

```tsx
import { useDeletionStatus, useRequestDeletion, useCancelDeletion } from '../queries';

export function DeleteAccountPanel() {
  const { data } = useDeletionStatus();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-red-700">Excluir conta</h2>
      {data ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Exclusao agendada para {new Date(data.scheduledFor).toLocaleDateString()}. Voce pode cancelar durante a carencia.
          </p>
          <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="rounded border py-2">
            Cancelar exclusao
          </button>
        </div>
      ) : (
        <button onClick={() => request.mutate()} disabled={request.isPending} className="rounded bg-red-600 py-2 text-white disabled:opacity-50">
          Solicitar exclusao
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Escrever página + rota**

Create `frontend/src/features/settings/pages/SettingsPage.tsx`:

```tsx
import { PreferencesForm } from '../components/PreferencesForm';
import { ConsentsPanel } from '../components/ConsentsPanel';
import { DeleteAccountPanel } from '../components/DeleteAccountPanel';

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Configuracoes</h1>
      <PreferencesForm />
      <ConsentsPanel />
      <DeleteAccountPanel />
    </div>
  );
}
```

In `frontend/src/router/routes.tsx`:

```tsx
import SettingsPage from '../features/settings/pages/SettingsPage';
import { ProtectedRoute } from './ProtectedRoute';
```

Add route:

```tsx
  { path: '/settings', element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },
```

- [ ] **Step 5: Escrever teste falhando**

Create `frontend/src/features/settings/settings.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DeleteAccountPanel } from './components/DeleteAccountPanel';
import { settingsApi } from './api';

vi.mock('./api', () => ({
  settingsApi: {
    getDeletionStatus: vi.fn(),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('DeleteAccountPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('solicita exclusao quando nao ha pendencia', async () => {
    vi.mocked(settingsApi.getDeletionStatus).mockResolvedValue(null);
    vi.mocked(settingsApi.requestDeletion).mockResolvedValue({
      id: 'd-1', status: 'pending', requestedAt: '2026-07-01T00:00:00.000Z', scheduledFor: '2026-07-31T00:00:00.000Z',
    });

    render(<DeleteAccountPanel />, { wrapper });
    const button = await screen.findByRole('button', { name: /solicitar exclusao/i });
    fireEvent.click(button);
    await waitFor(() => expect(settingsApi.requestDeletion).toHaveBeenCalled());
  });

  it('mostra carencia e permite cancelar quando pendente', async () => {
    vi.mocked(settingsApi.getDeletionStatus).mockResolvedValue({
      id: 'd-1', status: 'pending', requestedAt: '2026-07-01T00:00:00.000Z', scheduledFor: '2026-07-31T00:00:00.000Z',
    });
    render(<DeleteAccountPanel />, { wrapper });
    const cancel = await screen.findByRole('button', { name: /cancelar exclusao/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(settingsApi.cancelDeletion).toHaveBeenCalled());
  });
});
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/features/settings/settings.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/settings/ frontend/src/router/routes.tsx
git commit -m "feat(settings-web): adiciona preferencias, consentimentos e exclusao de conta"
```

---

## Verificação final da fase

- [ ] `cd backend && npm run typecheck && npm run lint && npx vitest run src/modules/auth src/modules/user src/modules/address src/modules/account src/shared/security`
- [ ] `cd frontend && npm run typecheck && npm run lint && npx vitest run src/features/auth src/features/settings`
- [ ] Marcar `- [x] Fase 7 — auth/account` em `plan_index.md`.
