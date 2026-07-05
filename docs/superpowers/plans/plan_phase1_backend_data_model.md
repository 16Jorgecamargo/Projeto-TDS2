# Fase 1 — Modelo de dados (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ver `plan_index.md` para visão geral e ordem das fases.

**Goal:** Remover a coluna morta `address_id` de `service_demands` e adicionar as colunas de endereço completo (`street, number, complement, district, city, state, zip_code`) direto na tabela, via migration TypeORM.

**Architecture:** Uma migration nova (`up`/`down` com `queryRunner.query` SQL cru, mesmo padrão das migrations existentes) + atualização da entidade `ServiceDemand`.

**Tech Stack:** TypeORM, MySQL.

## Global Constraints

Ver `plan_index.md`. Em especial: colunas novas ficam `NULL` no banco.

---

### Task 1.1: Migration — remover `address_id`, adicionar colunas de endereço

**Files:**
- Create: `backend/src/infra/database/migrations/1782927500000-DemandAddress.ts`
- Modify: `backend/src/infra/database/migrations/index.ts`

**Interfaces:**
- Produces: colunas `street varchar(255) NULL`, `number varchar(20) NULL`, `complement varchar(255) NULL`, `district varchar(128) NULL`, `city varchar(128) NULL`, `state char(2) NULL`, `zip_code varchar(9) NULL` em `service_demands`; remove `address_id` e sua FK `FK_a6299af0f0b71046f7492e61599`.

- [ ] **Step 1: Criar o arquivo de migration**

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class DemandAddress1782927500000 implements MigrationInterface {
    name = 'DemandAddress1782927500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP FOREIGN KEY \`FK_a6299af0f0b71046f7492e61599\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`address_id\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`street\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`number\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`complement\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`district\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`city\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`state\` char(2) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`zip_code\` varchar(9) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`zip_code\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`state\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`city\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`district\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`complement\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`number\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`address_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD CONSTRAINT \`FK_a6299af0f0b71046f7492e61599\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
```

- [ ] **Step 2: Registrar a migration no barrel**

Editar `backend/src/infra/database/migrations/index.ts`, adicionando o import e a entrada no array `migrations`, na ordem cronológica (depois de `UserPreferenceLocation1782927300000`):

```ts
import { AuthAccount1782924908822 } from './1782924908822-AuthAccount.js';
import { Addresses1782925472617 } from './1782925472617-Addresses.js';
import { ProfessionalProfile1782925602537 } from './1782925602537-ProfessionalProfile.js';
import { Catalog1782925794169 } from './1782925794169-Catalog.js';
import { Demands1782926186125 } from './1782926186125-Demands.js';
import { Quotes1782926462764 } from './1782926462764-Quotes.js';
import { Contracts1782926606932 } from './1782926606932-Contracts.js';
import { WalletPayment1782926766952 } from './1782926766952-WalletPayment.js';
import { Social1782926888239 } from './1782926888239-Social.js';
import { Communication1782927016069 } from './1782927016069-Communication.js';
import { AuditLogs1782927168897 } from './1782927168897-AuditLogs.js';
import { UserPreferenceLocation1782927300000 } from './1782927300000-UserPreferenceLocation.js';
import { DemandAddress1782927500000 } from './1782927500000-DemandAddress.js';

export const migrations = [AuthAccount1782924908822, Addresses1782925472617, ProfessionalProfile1782925602537, Catalog1782925794169, Demands1782926186125, Quotes1782926462764, Contracts1782926606932, WalletPayment1782926766952, Social1782926888239, Communication1782927016069, AuditLogs1782927168897, UserPreferenceLocation1782927300000, DemandAddress1782927500000];
```

- [ ] **Step 3: Rodar a migration contra o banco de dev**

```bash
cd backend
npm run migration:run
```

Expected: log do TypeORM mostrando `DemandAddress1782927500000` executada com sucesso, sem erro de FK/coluna. Se o banco de dev não estiver de pé, suba primeiro (`docker compose up -d` ou equivalente do projeto).

- [ ] **Step 4: Commit**

```bash
git add backend/src/infra/database/migrations/1782927500000-DemandAddress.ts backend/src/infra/database/migrations/index.ts
git commit -m "feat: adiciona colunas de endereco na demanda e remove address_id morto"
```

---

### Task 1.2: Atualizar entidade `ServiceDemand`

**Files:**
- Modify: `backend/src/infra/database/entities/service-demand.entity.ts`

**Interfaces:**
- Consumes: nenhuma (entidade TypeORM pura).
- Produces: campos `street: string`, `number: string`, `complement: string | null`, `district: string`, `city: string`, `state: string`, `zip_code: string` na classe `ServiceDemand` — usados pela Fase 2 (`demand.service.ts`).

- [ ] **Step 1: Reescrever a entidade**

Substituir o conteúdo de `backend/src/infra/database/entities/service-demand.entity.ts` inteiro por:

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
import { User } from './user.entity.js';
import { ServiceCategory } from './service-category.entity.js';

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

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_min!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_max!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  street!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  number!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  complement!: string | null;

  @Column('varchar', { length: 128, nullable: true })
  district!: string | null;

  @Column('varchar', { length: 128, nullable: true })
  city!: string | null;

  @Column('char', { length: 2, nullable: true })
  state!: string | null;

  @Column('varchar', { length: 9, nullable: true })
  zip_code!: string | null;

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

- [ ] **Step 2: Checar tipos do backend**

```bash
cd backend
npm run typecheck
```

Expected: erros apontando `demand.service.ts` (ainda usa `address_id`/`demand.addressId`) — esperado, é resolvido na Fase 2. Confirme que o erro é só ali, não na entidade em si.

- [ ] **Step 3: Commit**

```bash
git add backend/src/infra/database/entities/service-demand.entity.ts
git commit -m "feat: adiciona campos de endereco na entidade ServiceDemand"
```
