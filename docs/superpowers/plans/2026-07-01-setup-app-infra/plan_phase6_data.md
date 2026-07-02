# Fase 6 — Camada de Dados (Entidades TypeORM + Migrations) Implementation Plan

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`).

**Goal:** Modelar todas as ~50 tabelas MySQL do marketplace como entidades TypeORM 0.3 (decorators + reflect-metadata), gerar e aplicar as migrations em ordem FK-safe, e configurar o `DataSource` central que as fases 7-11 consomem.

**Architecture:** Uma entidade por arquivo em `backend/src/infra/database/entities/<name>.entity.ts`, agrupadas por domínio. `AppDataSource` em `backend/src/infra/database/data-source.ts` carrega entidades e migrations por glob. Cada Task cobre um domínio, gera a migration daquele grupo via `migration:generate`, aplica com `migration:run`, e valida a existência das tabelas com um teste de integração que abre a conexão real. FKs de um grupo só apontam para tabelas de grupos anteriores (ordem de execução respeita dependências).

**Tech Stack:** TypeScript 5.6 strict, TypeORM 0.3.20, mysql2 3.11, reflect-metadata 0.2.2, Vitest 2.1, MySQL 8.

## Global Constraints

Toda task herda estas regras verbatim (do `plan_index.md` §Global Constraints e spec §5):

- Node.js `>=20`. TypeScript `^5.6.2`, **strict: true**.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. (Docs de plano e mensagens de commit em pt-BR.)
- Não trocar libs nem adicionar deps fora das listadas na spec §2.
- ESLint + Prettier passando antes de todo commit.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética (relevante para os consumidores; aqui as colunas monetárias são `decimal`).
- **UNIQUE composto em toda relação N:M.**
- `contracts.cancelled_by` FK **nullable**; `audit_logs.user_id` **nullable**; `notifications.channel` e `withdrawals.payment_method` são **ENUM**.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest / `buildTestApp()`) já existe (fase 5). Migrations aplicadas contra banco de teste real.

### Convenções desta fase (fixas para todas as Tasks)

- PK: `@PrimaryGeneratedColumn('uuid') id!: string;`.
- Timestamps: `@CreateDateColumn() created_at!: Date;` e, quando a entidade é mutável, `@UpdateDateColumn() updated_at!: Date;`.
- Colunas e propriedades em `snake_case` (batem 1:1 com o banco; sem naming strategy externa).
- FK: coluna escalar `@Column('char', { length: 36 }) <name>_id!: string;` **mais** relação `@ManyToOne(() => Target) @JoinColumn({ name: '<name>_id' }) <name>!: Target;`. FK nullable: `@Column('char', { length: 36, nullable: true })` + `@ManyToOne(() => Target, { nullable: true })`.
- Monetário: `@Column('decimal', { precision, scale })`.
- ENUM: `@Column({ type: 'enum', enum: [...] })`.
- UNIQUE composto: `@Unique(['col_a', 'col_b'])` no topo da classe (usando nomes das colunas escalares).
- Índice de FK consultável: `@Index()` na coluna escalar quando a tabela é buscada por ela.
- Migrations geradas (nunca escritas à mão): `npm run migration:generate -- src/infra/database/migrations/<Name>` grava em `backend/src/infra/database/migrations/`.

---

## Interfaces globais produzidas por esta fase

As fases 7-11 importam entidades de `backend/src/infra/database/entities/` e obtêm repositórios via `AppDataSource.getRepository(Entity)`. Nomes de classe exportados (consumidos adiante):

`User, RefreshToken, PasswordResetToken, EmailVerificationToken, PhoneVerificationToken, UserOauthAccount, UserPreference, AccountDeletionRequest, UserConsent, PushDeviceToken, Address, ProfessionalProfile, ProfessionalDocument, ProfessionalExperience, ProfessionalEducation, ProfessionalCertification, ProfessionalServiceArea, AvailabilitySlot, AvailabilityException, PortfolioItem, PortfolioImage, ServiceCategory, ServiceTag, ProfessionalCategory, ProfessionalTag, ServiceDemand, DemandImage, DemandTag, DemandInvitation, Quote, QuoteItem, Wallet, WalletTransaction, Payment, PlatformFee, Refund, Withdrawal, Contract, Schedule, ContractProgressUpdate, ContractProgressImage, ContractDispute, Review, Favorite, Report, UserBlock, ChatRoom, Message, Notification, AuditLog`.

---

## File Structure

- `backend/src/infra/database/data-source.ts` — `AppDataSource` (Task 1).
- `backend/src/infra/database/entities/*.entity.ts` — 50 arquivos, um por tabela.
- `backend/src/infra/database/migrations/*.ts` — geradas, uma por Task.
- `backend/src/infra/database/database.schema.test.ts` — teste incremental de schema (novo `describe` por Task).

Ordem das Tasks (FK-safe): auth → addresses → professional → catalog → demands → quotes → wallet/payment → contracts → social → communication → audit.

> **Nota de dependência circular:** `payments` referencia `contracts` e `contracts` referencia `quotes`. Resolvido gerando `wallet/payment` **depois** de `contracts`. Portanto a ordem real é: Task 7 = contracts, Task 8 = wallet/payment. As FKs de `wallet_transactions.reference_id`/`refunds`/etc. que apontam para pagamento ficam no mesmo grupo. Ver Tasks 7 e 8.

---

### Task 1: Data source + domínio auth/conta (10 tabelas)

**Files:**
- Create: `backend/src/infra/database/data-source.ts`
- Create: `backend/src/infra/database/entities/user.entity.ts`
- Create: `backend/src/infra/database/entities/refresh-token.entity.ts`
- Create: `backend/src/infra/database/entities/password-reset-token.entity.ts`
- Create: `backend/src/infra/database/entities/email-verification-token.entity.ts`
- Create: `backend/src/infra/database/entities/phone-verification-token.entity.ts`
- Create: `backend/src/infra/database/entities/user-oauth-account.entity.ts`
- Create: `backend/src/infra/database/entities/user-preference.entity.ts`
- Create: `backend/src/infra/database/entities/account-deletion-request.entity.ts`
- Create: `backend/src/infra/database/entities/user-consent.entity.ts`
- Create: `backend/src/infra/database/entities/push-device-token.entity.ts`
- Create: `backend/src/infra/database/migrations/` (dir, via migration gerada)
- Test: `backend/src/infra/database/database.schema.test.ts`

**Interfaces:**
- Consumes: `env` de `backend/src/config/env.ts` (fase 1): `{ DB_HOST: string; DB_PORT: number; DB_USER: string; DB_PASSWORD: string; DB_NAME: string }`.
- Produces: `AppDataSource: DataSource` (default para CLI e runtime). Entidades `User`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`, `PhoneVerificationToken`, `UserOauthAccount`, `UserPreference`, `AccountDeletionRequest`, `UserConsent`, `PushDeviceToken`. Campos-chave de `User`: `id`, `email`, `phone`, `password_hash`, `role` (`'client'|'professional'|'admin'`), `full_name`, `cpf`, `status`, `email_verified_at`, `phone_verified_at`.

- [ ] **Step 1: Escrever o data source**

`backend/src/infra/database/data-source.ts`:

```ts
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { env } from '../../config/env';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  logging: false,
  entities: [join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});

export default AppDataSource;
```

- [ ] **Step 2: Escrever a entidade User**

`backend/src/infra/database/entities/user.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 255 })
  email!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 20, nullable: true })
  phone!: string | null;

  @Column('varchar', { length: 255 })
  password_hash!: string;

  @Column({ type: 'enum', enum: ['client', 'professional', 'admin'] })
  role!: 'client' | 'professional' | 'admin';

  @Column('varchar', { length: 255 })
  full_name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 14, nullable: true })
  cpf!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'deleted'], default: 'active' })
  status!: 'active' | 'suspended' | 'deleted';

  @Column('datetime', { nullable: true })
  email_verified_at!: Date | null;

  @Column('datetime', { nullable: true })
  phone_verified_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 3: Escrever as entidades de token**

`backend/src/infra/database/entities/refresh-token.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  token_hash!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  revoked_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/password-reset-token.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  token_hash!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  used_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/email-verification-token.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('email_verification_tokens')
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  token_hash!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  used_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/phone-verification-token.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('phone_verification_tokens')
export class PhoneVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 10 })
  code!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  used_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 4: Escrever oauth, preferences, deletion, consent, push token**

`backend/src/infra/database/entities/user-oauth-account.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_oauth_accounts')
@Unique(['provider', 'provider_account_id'])
export class UserOauthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['google', 'facebook', 'apple'] })
  provider!: 'google' | 'facebook' | 'apple';

  @Column('varchar', { length: 255 })
  provider_account_id!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/user-preference.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 10, default: 'pt-BR' })
  language!: string;

  @Column('varchar', { length: 64, default: 'America/Sao_Paulo' })
  timezone!: string;

  @Column('boolean', { default: true })
  email_notifications!: boolean;

  @Column('boolean', { default: true })
  push_notifications!: boolean;

  @Column('boolean', { default: false })
  sms_notifications!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/account-deletion-request.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('account_deletion_requests')
export class AccountDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column('datetime')
  requested_at!: Date;

  @Column('datetime')
  scheduled_purge_at!: Date;

  @Column({ type: 'enum', enum: ['pending', 'cancelled', 'completed'], default: 'pending' })
  status!: 'pending' | 'cancelled' | 'completed';

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/user-consent.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['terms', 'privacy', 'marketing', 'data_processing'] })
  consent_type!: 'terms' | 'privacy' | 'marketing' | 'data_processing';

  @Column('boolean')
  granted!: boolean;

  @Column('varchar', { length: 32 })
  version!: string;

  @Column('datetime')
  granted_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/push-device-token.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('push_device_tokens')
@Unique(['user_id', 'token'])
export class PushDeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 512 })
  token!: string;

  @Column({ type: 'enum', enum: ['ios', 'android', 'web'] })
  platform!: 'ios' | 'android' | 'web';

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 5: Escrever o teste de schema (falha esperada)**

`backend/src/infra/database/database.schema.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppDataSource } from './data-source';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

async function expectTables(tables: string[]): Promise<void> {
  const runner = AppDataSource.createQueryRunner();
  try {
    for (const table of tables) {
      expect(await runner.hasTable(table), `missing table ${table}`).toBe(true);
    }
  } finally {
    await runner.release();
  }
}

describe('auth schema', () => {
  it('creates auth and account tables', async () => {
    await expectTables([
      'users',
      'refresh_tokens',
      'password_reset_tokens',
      'email_verification_tokens',
      'phone_verification_tokens',
      'user_oauth_accounts',
      'user_preferences',
      'account_deletion_requests',
      'user_consents',
      'push_device_tokens',
    ]);
  });
});
```

- [ ] **Step 6: Rodar o teste e ver falhar**

Run: `cd backend && npm run typecheck && npx vitest run src/infra/database/database.schema.test.ts`
Expected: FAIL — tabelas ainda não existem (`missing table users`).

- [ ] **Step 7: Gerar a migration**

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/AuthAccount`
Expected: cria `backend/src/infra/database/migrations/<timestamp>-AuthAccount.ts` com `CREATE TABLE` para as 10 tabelas.

- [ ] **Step 8: Aplicar a migration**

Run: `cd backend && npm run migration:run`
Expected: log `Migration AuthAccount<timestamp> has been executed successfully`.

- [ ] **Step 9: Rodar o teste e ver passar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/infra/database/data-source.ts backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona data source e entidades de auth e conta"
```

---

### Task 2: Endereços (1 tabela)

**Files:**
- Create: `backend/src/infra/database/entities/address.entity.ts`
- Create: `backend/src/infra/database/migrations/` (migration gerada)
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `User` (Task 1).
- Produces: `Address`. Campos-chave: `id`, `user_id`, `street`, `number`, `district`, `city`, `state`, `zip_code`, `latitude`, `longitude`, `is_primary`.

- [ ] **Step 1: Escrever a entidade Address**

`backend/src/infra/database/entities/address.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 64, nullable: true })
  label!: string | null;

  @Column('varchar', { length: 255 })
  street!: string;

  @Column('varchar', { length: 20 })
  number!: string;

  @Column('varchar', { length: 255, nullable: true })
  complement!: string | null;

  @Column('varchar', { length: 128 })
  district!: string;

  @Column('varchar', { length: 128 })
  city!: string;

  @Column('char', { length: 2 })
  state!: string;

  @Column('varchar', { length: 9 })
  zip_code!: string;

  @Column('char', { length: 2, default: 'BR' })
  country!: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude!: string | null;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude!: string | null;

  @Column('boolean', { default: false })
  is_primary!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Adicionar o describe de teste (falha esperada)**

Adicionar ao fim de `backend/src/infra/database/database.schema.test.ts`:

```ts
describe('address schema', () => {
  it('creates address table', async () => {
    await expectTables(['addresses']);
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "address schema"`
Expected: FAIL — `missing table addresses`.

- [ ] **Step 4: Gerar a migration**

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Addresses`
Expected: cria migration com `CREATE TABLE addresses` + FK para `users`.

- [ ] **Step 5: Aplicar e testar**

Run: `cd backend && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: migration OK e todos os describes PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities/address.entity.ts backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidade de endereco"
```

---

### Task 3: Perfil profissional (10 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/professional-profile.entity.ts`
- Create: `backend/src/infra/database/entities/professional-document.entity.ts`
- Create: `backend/src/infra/database/entities/professional-experience.entity.ts`
- Create: `backend/src/infra/database/entities/professional-education.entity.ts`
- Create: `backend/src/infra/database/entities/professional-certification.entity.ts`
- Create: `backend/src/infra/database/entities/professional-service-area.entity.ts`
- Create: `backend/src/infra/database/entities/availability-slot.entity.ts`
- Create: `backend/src/infra/database/entities/availability-exception.entity.ts`
- Create: `backend/src/infra/database/entities/portfolio-item.entity.ts`
- Create: `backend/src/infra/database/entities/portfolio-image.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `User` (Task 1). `portfolio_items.category_id` referenciará `ServiceCategory` — mas catálogo é Task 4. **Decisão:** `portfolio_items.category_id` fica como coluna `char(36)` nullable **sem FK** nesta Task; a FK é adicionada na Task 4 (que já cria `service_categories`). Ver Task 4 Step de alteração.
- Produces: `ProfessionalProfile` (campos-chave: `id`, `user_id`, `headline`, `hourly_rate`, `rating_average`, `rating_count`, `is_available`, `verified_at`), `ProfessionalDocument`, `ProfessionalExperience`, `ProfessionalEducation`, `ProfessionalCertification`, `ProfessionalServiceArea`, `AvailabilitySlot`, `AvailabilityException`, `PortfolioItem`, `PortfolioImage`.

- [ ] **Step 1: Escrever ProfessionalProfile**

`backend/src/infra/database/entities/professional-profile.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('professional_profiles')
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  headline!: string;

  @Column('text', { nullable: true })
  bio!: string | null;

  @Column('int', { nullable: true })
  years_experience!: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  hourly_rate!: string | null;

  @Column('int', { nullable: true })
  service_radius_km!: number | null;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating_average!: string;

  @Column('int', { default: 0 })
  rating_count!: number;

  @Column('boolean', { default: true })
  is_available!: boolean;

  @Column('datetime', { nullable: true })
  verified_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Escrever document, experience, education, certification**

`backend/src/infra/database/entities/professional-document.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('professional_documents')
export class ProfessionalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column({ type: 'enum', enum: ['rg', 'cpf', 'cnpj', 'proof_of_address', 'certificate'] })
  type!: 'rg' | 'cpf' | 'cnpj' | 'proof_of_address' | 'certificate';

  @Column('varchar', { length: 512 })
  file_url!: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column('datetime', { nullable: true })
  reviewed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/professional-experience.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('professional_experiences')
export class ProfessionalExperience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('varchar', { length: 255, nullable: true })
  company!: string | null;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('date')
  start_date!: string;

  @Column('date', { nullable: true })
  end_date!: string | null;

  @Column('boolean', { default: false })
  is_current!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/professional-education.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('professional_education')
export class ProfessionalEducation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  institution!: string;

  @Column('varchar', { length: 255 })
  degree!: string;

  @Column('varchar', { length: 255, nullable: true })
  field_of_study!: string | null;

  @Column('date', { nullable: true })
  start_date!: string | null;

  @Column('date', { nullable: true })
  end_date!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/professional-certification.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('professional_certifications')
export class ProfessionalCertification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 255 })
  issuer!: string;

  @Column('date', { nullable: true })
  issued_at!: string | null;

  @Column('date', { nullable: true })
  expires_at!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  credential_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Escrever service_areas, availability_slots, availability_exceptions**

`backend/src/infra/database/entities/professional-service-area.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('professional_service_areas')
@Unique(['professional_id', 'city', 'state'])
export class ProfessionalServiceArea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 128 })
  city!: string;

  @Column('char', { length: 2 })
  state!: string;

  @Column('int', { nullable: true })
  radius_km!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/availability-slot.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('availability_slots')
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('tinyint')
  weekday!: number;

  @Column('time')
  start_time!: string;

  @Column('time')
  end_time!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/availability-exception.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('availability_exceptions')
export class AvailabilityException {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('date')
  date!: string;

  @Column('boolean')
  is_available!: boolean;

  @Column('time', { nullable: true })
  start_time!: string | null;

  @Column('time', { nullable: true })
  end_time!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 4: Escrever portfolio_items e portfolio_images**

`backend/src/infra/database/entities/portfolio-item.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('char', { length: 36, nullable: true })
  category_id!: string | null;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('date', { nullable: true })
  completed_at!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/portfolio-image.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioItem } from './portfolio-item.entity';

@Entity('portfolio_images')
export class PortfolioImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  portfolio_item_id!: string;

  @ManyToOne(() => PortfolioItem)
  @JoinColumn({ name: 'portfolio_item_id' })
  portfolio_item!: PortfolioItem;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @Column('int', { default: 0 })
  position!: number;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 5: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('professional schema', () => {
  it('creates professional profile tables', async () => {
    await expectTables([
      'professional_profiles',
      'professional_documents',
      'professional_experiences',
      'professional_education',
      'professional_certifications',
      'professional_service_areas',
      'availability_slots',
      'availability_exceptions',
      'portfolio_items',
      'portfolio_images',
    ]);
  });
});
```

- [ ] **Step 6: Rodar teste, ver falhar; gerar; aplicar; testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "professional schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/ProfessionalProfile && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: migration criada, aplicada, todos os describes PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de perfil profissional"
```

---

### Task 4: Catálogo (4 tabelas) + FK de portfolio

**Files:**
- Create: `backend/src/infra/database/entities/service-category.entity.ts`
- Create: `backend/src/infra/database/entities/service-tag.entity.ts`
- Create: `backend/src/infra/database/entities/professional-category.entity.ts`
- Create: `backend/src/infra/database/entities/professional-tag.entity.ts`
- Modify: `backend/src/infra/database/entities/portfolio-item.entity.ts` (adicionar relação FK para `service_categories`)
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `ProfessionalProfile` (Task 3), `PortfolioItem` (Task 3).
- Produces: `ServiceCategory` (campos-chave: `id`, `parent_id`, `name`, `slug`, `is_active`), `ServiceTag` (`id`, `name`, `slug`), `ProfessionalCategory` (N:M UNIQUE `professional_id`+`category_id`), `ProfessionalTag` (N:M UNIQUE `professional_id`+`tag_id`).

- [ ] **Step 1: Escrever service_categories (auto-referência) e service_tags**

`backend/src/infra/database/entities/service-category.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, nullable: true })
  parent_id!: string | null;

  @ManyToOne(() => ServiceCategory, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: ServiceCategory | null;

  @Column('varchar', { length: 128 })
  name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 160 })
  slug!: string;

  @Column('varchar', { length: 128, nullable: true })
  icon!: string | null;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/service-tag.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('service_tags')
export class ServiceTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 128 })
  name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 160 })
  slug!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 2: Escrever as N:M professional_categories e professional_tags**

`backend/src/infra/database/entities/professional-category.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';
import { ServiceCategory } from './service-category.entity';

@Entity('professional_categories')
@Unique(['professional_id', 'category_id'])
export class ProfessionalCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Index()
  @Column('char', { length: 36 })
  category_id!: string;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/professional-tag.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';
import { ServiceTag } from './service-tag.entity';

@Entity('professional_tags')
@Unique(['professional_id', 'tag_id'])
export class ProfessionalTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Index()
  @Column('char', { length: 36 })
  tag_id!: string;

  @ManyToOne(() => ServiceTag)
  @JoinColumn({ name: 'tag_id' })
  tag!: ServiceTag;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Adicionar a FK de portfolio_items para service_categories**

Editar `backend/src/infra/database/entities/portfolio-item.entity.ts`. Adicionar import e relação. Trocar o bloco da coluna `category_id`:

De:
```ts
  @Column('char', { length: 36, nullable: true })
  category_id!: string | null;
```

Para:
```ts
  @Column('char', { length: 36, nullable: true })
  category_id!: string | null;

  @ManyToOne(() => ServiceCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory | null;
```

E adicionar ao import statement do arquivo:
```ts
import { ServiceCategory } from './service-category.entity';
```

(garantir que `ManyToOne` e `JoinColumn` já estão importados de `typeorm` — já estão no arquivo).

- [ ] **Step 4: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('catalog schema', () => {
  it('creates catalog tables', async () => {
    await expectTables([
      'service_categories',
      'service_tags',
      'professional_categories',
      'professional_tags',
    ]);
  });
});
```

- [ ] **Step 5: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "catalog schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Catalog && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: migration inclui as 4 tabelas + `ADD CONSTRAINT` FK de `portfolio_items.category_id`; todos os describes PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de catalogo e fk de portfolio"
```

---

### Task 5: Demandas (4 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/service-demand.entity.ts`
- Create: `backend/src/infra/database/entities/demand-image.entity.ts`
- Create: `backend/src/infra/database/entities/demand-tag.entity.ts`
- Create: `backend/src/infra/database/entities/demand-invitation.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `User` (Task 1), `Address` (Task 2), `ServiceCategory`/`ServiceTag` (Task 4), `ProfessionalProfile` (Task 3).
- Produces: `ServiceDemand` (campos-chave: `id`, `client_id`, `category_id`, `title`, `description`, `budget_min`, `budget_max`, `status`, `address_id`, `preferred_date`), `DemandImage`, `DemandTag` (N:M UNIQUE `demand_id`+`tag_id`), `DemandInvitation` (UNIQUE `demand_id`+`professional_id`).

- [ ] **Step 1: Escrever ServiceDemand**

`backend/src/infra/database/entities/service-demand.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ServiceCategory } from './service-category.entity';
import { Address } from './address.entity';

@Entity('service_demands')
export class ServiceDemand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  category_id!: string;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory;

  @Column('char', { length: 36, nullable: true })
  address_id!: string | null;

  @ManyToOne(() => Address, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: Address | null;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_min!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_max!: string | null;

  @Column({ type: 'enum', enum: ['open', 'in_progress', 'closed', 'cancelled'], default: 'open' })
  status!: 'open' | 'in_progress' | 'closed' | 'cancelled';

  @Column('date', { nullable: true })
  preferred_date!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Escrever demand_images, demand_tags, demand_invitations**

`backend/src/infra/database/entities/demand-image.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity';

@Entity('demand_images')
export class DemandImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @Column('int', { default: 0 })
  position!: number;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/demand-tag.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity';
import { ServiceTag } from './service-tag.entity';

@Entity('demand_tags')
@Unique(['demand_id', 'tag_id'])
export class DemandTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  tag_id!: string;

  @ManyToOne(() => ServiceTag)
  @JoinColumn({ name: 'tag_id' })
  tag!: ServiceTag;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/demand-invitation.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('demand_invitations')
@Unique(['demand_id', 'professional_id'])
export class DemandInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'], default: 'pending' })
  status!: 'pending' | 'accepted' | 'declined';

  @Column('datetime')
  invited_at!: Date;

  @Column('datetime', { nullable: true })
  responded_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('demand schema', () => {
  it('creates demand tables', async () => {
    await expectTables(['service_demands', 'demand_images', 'demand_tags', 'demand_invitations']);
  });
});
```

- [ ] **Step 4: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "demand schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Demands && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: PASS em todos os describes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de demandas"
```

---

### Task 6: Orçamentos (2 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/quote.entity.ts`
- Create: `backend/src/infra/database/entities/quote-item.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `ServiceDemand` (Task 5), `ProfessionalProfile` (Task 3).
- Produces: `Quote` (campos-chave: `id`, `demand_id`, `professional_id`, `total_amount`, `estimated_days`, `status`, `valid_until`), `QuoteItem` (`id`, `quote_id`, `description`, `quantity`, `unit_price`).

- [ ] **Step 1: Escrever Quote**

`backend/src/infra/database/entities/quote.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('text', { nullable: true })
  message!: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount!: string;

  @Column('int', { nullable: true })
  estimated_days!: number | null;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected' | 'withdrawn';

  @Column('datetime', { nullable: true })
  valid_until!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Escrever QuoteItem**

`backend/src/infra/database/entities/quote-item.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quote } from './quote.entity';

@Entity('quote_items')
export class QuoteItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  quote_id!: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote!: Quote;

  @Column('varchar', { length: 255 })
  description!: string;

  @Column('int', { default: 1 })
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_price!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('quote schema', () => {
  it('creates quote tables', async () => {
    await expectTables(['quotes', 'quote_items']);
  });
});
```

- [ ] **Step 4: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "quote schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Quotes && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de orcamentos"
```

---

### Task 7: Contratos (5 tabelas)

> Gerado **antes** de wallet/payment porque `payments.contract_id` referencia `contracts`.

**Files:**
- Create: `backend/src/infra/database/entities/contract.entity.ts`
- Create: `backend/src/infra/database/entities/schedule.entity.ts`
- Create: `backend/src/infra/database/entities/contract-progress-update.entity.ts`
- Create: `backend/src/infra/database/entities/contract-progress-image.entity.ts`
- Create: `backend/src/infra/database/entities/contract-dispute.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `ServiceDemand` (Task 5), `Quote` (Task 6), `User` (Task 1), `ProfessionalProfile` (Task 3).
- Produces: `Contract` (campos-chave: `id`, `demand_id`, `quote_id`, `client_id`, `professional_id`, `total_amount`, `status`, `started_at`, `completed_at`, `cancelled_at`, `cancelled_by` **nullable**, `cancellation_reason`), `Schedule`, `ContractProgressUpdate`, `ContractProgressImage`, `ContractDispute`.

- [ ] **Step 1: Escrever Contract (cancelled_by FK nullable)**

`backend/src/infra/database/entities/contract.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity';
import { Quote } from './quote.entity';
import { User } from './user.entity';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  quote_id!: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote!: Quote;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('decimal', { precision: 12, scale: 2 })
  total_amount!: string;

  @Column({ type: 'enum', enum: ['active', 'completed', 'cancelled', 'disputed'], default: 'active' })
  status!: 'active' | 'completed' | 'cancelled' | 'disputed';

  @Column('datetime', { nullable: true })
  started_at!: Date | null;

  @Column('datetime', { nullable: true })
  completed_at!: Date | null;

  @Column('datetime', { nullable: true })
  cancelled_at!: Date | null;

  @Column('char', { length: 36, nullable: true })
  cancelled_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  cancelled_by_user!: User | null;

  @Column('text', { nullable: true })
  cancellation_reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Escrever schedules e progress updates/images**

`backend/src/infra/database/entities/schedule.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('datetime')
  scheduled_date!: Date;

  @Column('int', { nullable: true })
  duration_minutes!: number | null;

  @Column({ type: 'enum', enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' })
  status!: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

  @Column('text', { nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/contract-progress-update.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from './user.entity';

@Entity('contract_progress_updates')
export class ContractProgressUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  author_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column('text')
  description!: string;

  @Column('int', { nullable: true })
  percentage!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/contract-progress-image.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractProgressUpdate } from './contract-progress-update.entity';

@Entity('contract_progress_images')
export class ContractProgressImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  progress_update_id!: string;

  @ManyToOne(() => ContractProgressUpdate)
  @JoinColumn({ name: 'progress_update_id' })
  progress_update!: ContractProgressUpdate;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Escrever contract_disputes**

`backend/src/infra/database/entities/contract-dispute.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from './user.entity';

@Entity('contract_disputes')
export class ContractDispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  opened_by!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  opener!: User;

  @Column('text')
  reason!: string;

  @Column({ type: 'enum', enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open' })
  status!: 'open' | 'under_review' | 'resolved' | 'rejected';

  @Column('text', { nullable: true })
  resolution!: string | null;

  @Column('char', { length: 36, nullable: true })
  resolved_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver!: User | null;

  @Column('datetime', { nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 4: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('contract schema', () => {
  it('creates contract tables', async () => {
    await expectTables([
      'contracts',
      'schedules',
      'contract_progress_updates',
      'contract_progress_images',
      'contract_disputes',
    ]);
  });
});
```

- [ ] **Step 5: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "contract schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Contracts && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: `contracts.cancelled_by` gerado como coluna nullable com FK nullable; todos os describes PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de contratos"
```

---

### Task 8: Carteira e pagamento (6 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/wallet.entity.ts`
- Create: `backend/src/infra/database/entities/wallet-transaction.entity.ts`
- Create: `backend/src/infra/database/entities/payment.entity.ts`
- Create: `backend/src/infra/database/entities/platform-fee.entity.ts`
- Create: `backend/src/infra/database/entities/refund.entity.ts`
- Create: `backend/src/infra/database/entities/withdrawal.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `User` (Task 1), `Contract` (Task 7).
- Produces: `Wallet` (campos-chave: `id`, `user_id`, `balance`, `pending_balance`, `currency`), `WalletTransaction` (`id`, `wallet_id`, `type`, `amount`, `balance_after`, `reference_type`, `reference_id`), `Payment` (`id`, `contract_id`, `payer_id`, `amount`, `status`, `method`, `paid_at`), `PlatformFee` (`id`, `payment_id`, `percentage`, `amount`), `Refund` (`id`, `payment_id`, `amount`, `status`), `Withdrawal` (`id`, `wallet_id`, `amount`, `payment_method` **ENUM**, `status`, `destination`). Nota: colunas monetárias `decimal` chegam como string — consumidores usam `Number()`.

- [ ] **Step 1: Escrever wallets e wallet_transactions**

`backend/src/infra/database/entities/wallet.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  pending_balance!: string;

  @Column('char', { length: 3, default: 'BRL' })
  currency!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/wallet-transaction.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  wallet_id!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: ['credit', 'debit', 'hold', 'release'] })
  type!: 'credit' | 'debit' | 'hold' | 'release';

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  balance_after!: string;

  @Column({
    type: 'enum',
    enum: ['payment', 'withdrawal', 'refund', 'fee', 'adjustment'],
    nullable: true,
  })
  reference_type!: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment' | null;

  @Column('char', { length: 36, nullable: true })
  reference_id!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  description!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 2: Escrever payments e platform_fees**

`backend/src/infra/database/entities/payment.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from './user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Index()
  @Column('char', { length: 36 })
  payer_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'payer_id' })
  payer!: User;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'pending',
  })
  status!: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

  @Column({ type: 'enum', enum: ['wallet', 'credit_card', 'pix', 'boleto'] })
  method!: 'wallet' | 'credit_card' | 'pix' | 'boleto';

  @Column('varchar', { length: 255, nullable: true })
  external_reference!: string | null;

  @Column('datetime', { nullable: true })
  paid_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/platform-fee.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity('platform_fees')
export class PlatformFee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  payment_id!: string;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column('decimal', { precision: 5, scale: 2 })
  percentage!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Escrever refunds e withdrawals (payment_method ENUM)**

`backend/src/infra/database/entities/refund.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  payment_id!: string;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed'], default: 'pending' })
  status!: 'pending' | 'completed' | 'failed';

  @Column('datetime', { nullable: true })
  processed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/withdrawal.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  wallet_id!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: ['pix', 'bank_transfer'] })
  payment_method!: 'pix' | 'bank_transfer';

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('varchar', { length: 255 })
  destination!: string;

  @Column('datetime', { nullable: true })
  processed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 4: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('wallet schema', () => {
  it('creates wallet and payment tables', async () => {
    await expectTables([
      'wallets',
      'wallet_transactions',
      'payments',
      'platform_fees',
      'refunds',
      'withdrawals',
    ]);
  });
});
```

- [ ] **Step 5: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "wallet schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/WalletPayment && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: `withdrawals.payment_method` gerado como `enum`; todos os describes PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de carteira e pagamento"
```

---

### Task 9: Social (4 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/review.entity.ts`
- Create: `backend/src/infra/database/entities/favorite.entity.ts`
- Create: `backend/src/infra/database/entities/report.entity.ts`
- Create: `backend/src/infra/database/entities/user-block.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `Contract` (Task 7), `User` (Task 1), `ProfessionalProfile` (Task 3).
- Produces: `Review` (campos-chave: `id`, `contract_id`, `reviewer_id`, `reviewee_id`, `rating`, `comment`, `response`; UNIQUE `contract_id`+`reviewer_id`), `Favorite` (N:M UNIQUE `user_id`+`professional_id`), `Report` (`id`, `reporter_id`, `target_type`, `target_id`, `reason`, `status`), `UserBlock` (N:M UNIQUE `blocker_id`+`blocked_id`).

- [ ] **Step 1: Escrever reviews (UNIQUE contract_id+reviewer_id)**

`backend/src/infra/database/entities/review.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from './user.entity';

@Entity('reviews')
@Unique(['contract_id', 'reviewer_id'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  reviewer_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @Index()
  @Column('char', { length: 36 })
  reviewee_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewee_id' })
  reviewee!: User;

  @Column('int')
  rating!: number;

  @Column('text', { nullable: true })
  comment!: string | null;

  @Column('text', { nullable: true })
  response!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

- [ ] **Step 2: Escrever favorites e user_blocks (N:M)**

`backend/src/infra/database/entities/favorite.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity('favorites')
@Unique(['user_id', 'professional_id'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @CreateDateColumn()
  created_at!: Date;
}
```

`backend/src/infra/database/entities/user-block.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_blocks')
@Unique(['blocker_id', 'blocked_id'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  blocker_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocker_id' })
  blocker!: User;

  @Index()
  @Column('char', { length: 36 })
  blocked_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_id' })
  blocked!: User;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Escrever reports**

`backend/src/infra/database/entities/report.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  reporter_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @Column({ type: 'enum', enum: ['user', 'demand', 'review', 'message'] })
  target_type!: 'user' | 'demand' | 'review' | 'message';

  @Column('char', { length: 36 })
  target_id!: string;

  @Column({ type: 'enum', enum: ['spam', 'abuse', 'fraud', 'inappropriate', 'other'] })
  reason!: 'spam' | 'abuse' | 'fraud' | 'inappropriate' | 'other';

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ['pending', 'reviewed', 'dismissed', 'actioned'], default: 'pending' })
  status!: 'pending' | 'reviewed' | 'dismissed' | 'actioned';

  @Column('char', { length: 36, nullable: true })
  reviewed_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: User | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 4: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('social schema', () => {
  it('creates social tables', async () => {
    await expectTables(['reviews', 'favorites', 'reports', 'user_blocks']);
  });
});
```

- [ ] **Step 5: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "social schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Social && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades sociais"
```

---

### Task 10: Comunicação (3 tabelas)

**Files:**
- Create: `backend/src/infra/database/entities/chat-room.entity.ts`
- Create: `backend/src/infra/database/entities/message.entity.ts`
- Create: `backend/src/infra/database/entities/notification.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe)

**Interfaces:**
- Consumes: `Contract` (Task 7), `User` (Task 1).
- Produces: `ChatRoom` (campos-chave: `id`, `contract_id` nullable, `client_id`, `professional_id`, `last_message_at`), `Message` (`id`, `room_id`, `sender_id`, `content`, `read_at`), `Notification` (`id`, `user_id`, `channel` **ENUM**, `type`, `title`, `body`, `data`, `read_at`, `sent_at`).

- [ ] **Step 1: Escrever chat_rooms e messages**

`backend/src/infra/database/entities/chat-room.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from './user.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, nullable: true })
  contract_id!: string | null;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract | null;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'professional_id' })
  professional!: User;

  @Column('datetime', { nullable: true })
  last_message_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

`backend/src/infra/database/entities/message.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  room_id!: string;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'room_id' })
  room!: ChatRoom;

  @Column('char', { length: 36 })
  sender_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column('text')
  content!: string;

  @Column('datetime', { nullable: true })
  read_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 2: Escrever notifications (channel ENUM)**

`backend/src/infra/database/entities/notification.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['push', 'in_app', 'email'] })
  channel!: 'push' | 'in_app' | 'email';

  @Column('varchar', { length: 64 })
  type!: string;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  body!: string | null;

  @Column('json', { nullable: true })
  data!: unknown | null;

  @Column('datetime', { nullable: true })
  read_at!: Date | null;

  @Column('datetime', { nullable: true })
  sent_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 3: Adicionar describe de teste (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
describe('communication schema', () => {
  it('creates communication tables', async () => {
    await expectTables(['chat_rooms', 'messages', 'notifications']);
  });
});
```

- [ ] **Step 4: Rodar teste, gerar, aplicar, testar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "communication schema"`
Expected: FAIL.

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/Communication && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: `notifications.channel` gerado como `enum`; todos os describes PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidades de comunicacao"
```

---

### Task 11: Auditoria (1 tabela) + verificação final das 50 tabelas

**Files:**
- Create: `backend/src/infra/database/entities/audit-log.entity.ts`
- Test: `backend/src/infra/database/database.schema.test.ts` (novo describe + assert de contagem total)

**Interfaces:**
- Consumes: `User` (Task 1) — FK **nullable**.
- Produces: `AuditLog` (campos-chave: `id`, `user_id` **nullable**, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `metadata`).

- [ ] **Step 1: Escrever audit_logs (user_id FK nullable)**

`backend/src/infra/database/entities/audit-log.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36, nullable: true })
  user_id!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column('varchar', { length: 128 })
  action!: string;

  @Column('varchar', { length: 64, nullable: true })
  entity_type!: string | null;

  @Column('char', { length: 36, nullable: true })
  entity_id!: string | null;

  @Column('varchar', { length: 64, nullable: true })
  ip_address!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  user_agent!: string | null;

  @Column('json', { nullable: true })
  metadata!: unknown | null;

  @CreateDateColumn()
  created_at!: Date;
}
```

- [ ] **Step 2: Adicionar describe de auditoria + verificação total (falha esperada)**

Adicionar ao fim de `database.schema.test.ts`:

```ts
const ALL_TABLES = [
  'users',
  'refresh_tokens',
  'password_reset_tokens',
  'email_verification_tokens',
  'phone_verification_tokens',
  'user_oauth_accounts',
  'user_preferences',
  'account_deletion_requests',
  'user_consents',
  'push_device_tokens',
  'addresses',
  'professional_profiles',
  'professional_documents',
  'professional_experiences',
  'professional_education',
  'professional_certifications',
  'professional_service_areas',
  'availability_slots',
  'availability_exceptions',
  'portfolio_items',
  'portfolio_images',
  'service_categories',
  'service_tags',
  'professional_categories',
  'professional_tags',
  'service_demands',
  'demand_images',
  'demand_tags',
  'demand_invitations',
  'quotes',
  'quote_items',
  'contracts',
  'schedules',
  'contract_progress_updates',
  'contract_progress_images',
  'contract_disputes',
  'wallets',
  'wallet_transactions',
  'payments',
  'platform_fees',
  'refunds',
  'withdrawals',
  'reviews',
  'favorites',
  'reports',
  'user_blocks',
  'chat_rooms',
  'messages',
  'notifications',
  'audit_logs',
];

describe('audit schema', () => {
  it('creates audit_logs table', async () => {
    await expectTables(['audit_logs']);
  });
});

describe('full schema', () => {
  it('has exactly 50 domain tables', () => {
    expect(ALL_TABLES).toHaveLength(50);
  });

  it('creates all 50 domain tables', async () => {
    await expectTables(ALL_TABLES);
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd backend && npx vitest run src/infra/database/database.schema.test.ts -t "audit schema"`
Expected: FAIL — `missing table audit_logs`.

- [ ] **Step 4: Gerar, aplicar, e rodar a suite inteira**

Run: `cd backend && npm run migration:generate -- src/infra/database/migrations/AuditLogs && npm run migration:run && npx vitest run src/infra/database/database.schema.test.ts`
Expected: `audit_logs.user_id` gerado como coluna nullable com FK nullable; `full schema` confirma 50 tabelas; TODOS os describes PASS.

- [ ] **Step 5: Rodar typecheck + lint final**

Run: `cd backend && npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infra/database/entities backend/src/infra/database/migrations backend/src/infra/database/database.schema.test.ts
git commit -m "feat(data): adiciona entidade de auditoria e verificacao das 50 tabelas"
```

---

## Self-Review

**1. Cobertura da spec §3 (50 tabelas):** contagem por grupo — auth/conta 10, endereço 1, perfil profissional 10, catálogo 4, demandas 4, orçamentos 2, carteira/pagamento 6, contratos 5, social 4, comunicação 3, auditoria 1 = **50**. O `describe('full schema')` da Task 11 valida `ALL_TABLES.length === 50` e a existência de cada uma.

**2. Regras de dados da spec §3:**
- UNIQUE composto em N:M — `user_oauth_accounts(provider, provider_account_id)`, `push_device_tokens(user_id, token)`, `professional_service_areas(professional_id, city, state)`, `professional_categories(professional_id, category_id)`, `professional_tags(professional_id, tag_id)`, `demand_tags(demand_id, tag_id)`, `demand_invitations(demand_id, professional_id)`, `reviews(contract_id, reviewer_id)`, `favorites(user_id, professional_id)`, `user_blocks(blocker_id, blocked_id)`. ✓
- `contracts.cancelled_by` FK nullable — Task 7 Step 1. ✓
- `audit_logs.user_id` nullable — Task 11 Step 1. ✓
- `notifications.channel` ENUM — Task 10 Step 2. ✓
- `withdrawals.payment_method` ENUM — Task 8 Step 3. ✓
- DECIMAL como string — colunas monetárias `decimal` tipadas como `string` no TS; nota nos Interfaces das Tasks 2 e 8 lembra o consumidor de usar `Number()`. ✓

**3. Consistência de tipos/nomes:** nomes de classe em Interfaces batem com os `@Entity` e com a lista de Interfaces globais. FK escalar `char(36)` + relação `@JoinColumn` em todas. `portfolio_items.category_id` criado sem FK na Task 3 e recebe a FK na Task 4 (ordem correta, pois `service_categories` só existe na Task 4). Dependência circular contracts↔payments resolvida: contracts (Task 7) antes de payments (Task 8). ✓

**4. Placeholders:** nenhum "TBD"/"similar a"/"tratar edge cases". Todo step de código traz o código real completo. Migrations são geradas por comando (não escritas à mão), então não há SQL placeholder. ✓

Plano completo e salvo em `docs/superpowers/plans/plan_phase6_data.md`.
