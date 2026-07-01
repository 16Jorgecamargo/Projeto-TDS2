# Fase 6 — Camada de Dados: Relatório de Execução

**Data:** 2026-07-01  
**Branch:** feat/marketplace-implementation  
**Status:** CONCLUÍDA

---

## Commits entregues

```
11b0ebe9 feat(data): adiciona data source e entidades de auth e conta
6cea87ec feat(data): adiciona entidade de endereco
635242de feat(data): adiciona entidades de perfil profissional
bb11ba7d feat(data): adiciona entidades de catalogo e fk de portfolio
a13392c9 feat(data): adiciona entidades de demandas
7f2f76f4 feat(data): adiciona entidades de orcamentos
94a83b3b feat(data): adiciona entidades de contratos
9745aae6 feat(data): adiciona entidades de carteira e pagamento
6c9bc394 feat(data): adiciona entidades sociais
7744832d feat(data): adiciona entidades de comunicacao
03f355b2 feat(data): adiciona entidade de auditoria e verificacao das 50 tabelas
2728713c docs: marca fase 6 concluida no indice
```

---

## Resultados dos testes

### Schema (`cd backend && npx vitest run src/infra/database/database.schema.test.ts`)

```
Test Files  1 passed (1)
Tests       13 passed (13)
```

`full schema` confirma `ALL_TABLES.length === 50` e a existência de cada tabela.

### Suíte backend completa (`cd backend && npm test`)

```
Test Files  18 passed (18)
Tests       60 passed (60)
```

Suites anteriores (fases 1-5): 47 testes — mantidos verdes.  
Nova suite fase 6: `database.schema.test.ts` com 13 describes incrementais.

### Verificação independente no banco

```
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema='marketplace_test' AND table_name<>'migrations';
-> 50
```

`npm run typecheck` e `npm run lint`: sem erros.

---

## Cobertura: 50 tabelas por domínio

| Migration | Domínio | Tabelas |
|-----------|---------|---------|
| AuthAccount | auth/conta | 10 |
| Addresses | endereço | 1 |
| ProfessionalProfile | perfil profissional | 10 |
| Catalog | catálogo (+ FK portfolio) | 4 |
| Demands | demandas | 4 |
| Quotes | orçamentos | 2 |
| Contracts | contratos | 5 |
| WalletPayment | carteira/pagamento | 6 |
| Social | social | 4 |
| Communication | comunicação | 3 |
| AuditLogs | auditoria | 1 |
| **Total** | | **50** |

---

## Regras de dados verificadas (spec §3)

- **UNIQUE composto em N:M** (revisado por migration): `user_oauth_accounts(provider, provider_account_id)`, `push_device_tokens(user_id, token)`, `professional_service_areas(professional_id, city, state)`, `professional_categories(professional_id, category_id)`, `professional_tags(professional_id, tag_id)`, `demand_tags(demand_id, tag_id)`, `demand_invitations(demand_id, professional_id)`, `reviews(contract_id, reviewer_id)`, `favorites(user_id, professional_id)`, `user_blocks(blocker_id, blocked_id)`.
- `contracts.cancelled_by` → `varchar(36) NULL` com FK nullable para `users`.
- `audit_logs.user_id` → `varchar(36) NULL` com FK nullable para `users`; índice composto `(entity_type, entity_id)`.
- `notifications.channel` → `enum('push','in_app','email')`.
- `withdrawals.payment_method` → `enum('pix','bank_transfer')`.
- `portfolio_items.category_id` criado sem FK na migration ProfessionalProfile e recebe FK para `service_categories` na migration Catalog (ordem FK-safe).
- Dependência circular resolvida: `contracts` (Contracts) gerada antes de `payments` (WalletPayment).
- Colunas monetárias `decimal` tipadas como `string` no TS (MySQL2 retorna DECIMAL como string).

---

## Desvios do plano (plano estava desatualizado)

O plano foi escrito antes de a config e a infra de teste serem congeladas. Três correções aplicadas na Task 1 (data source), herdadas por todas as demais:

1. **Chaves de env:** `DATABASE_HOST/PORT/USER/PASSWORD/NAME` (config real via `config/index.ts`), não `DB_*`.
2. **ESM NodeNext:** imports entre entidades/módulos usam extensão `.js`; `__dirname` inexistente → não usado.
3. **Barrels estáticos no lugar de globs** — mudança estrutural relevante (ver abaixo).

---

## Reversão do glob → barrels estáticos

**Problema:** sob Vitest (swc), `AppDataSource.initialize()` carrega entidades/migrations por glob e o TypeORM faz `import()` nativo dos arquivos `.ts`. Esse import não passa pelo transform do swc → `SyntaxError: Invalid or unexpected token` nas anotações de tipo. O `phase5-report` previu que o glob "descobriria automaticamente" as entidades da Fase 6 — isso **não se sustenta sob Vitest** com arquivos `.ts` reais (na Fase 5 as pastas estavam vazias, então o glob nunca importava nada).

**Solução:** barrels estáticos com imports explícitos:
- `backend/src/infra/database/entities/index.ts` — exporta cada classe e o array `entities`.
- `backend/src/infra/database/migrations/index.ts` — importa cada classe de migration e o array `migrations` (em ordem).

`AppDataSource` e `TestDataSource` consomem `entities` e `migrations` desses barrels. Assim os arquivos entram no grafo de módulos e são transformados pelo swc. O CLI `typeorm-ts-node-esm` (migration:generate/run) também funciona com arrays explícitos.

**Impacto na test infra (Fase 5):** `TestDataSource` foi alterado de globs para os barrels — necessário para que `runMigrations()` funcione sob Vitest nas fases 7+. Sem isso, testes de integração que aplicam migrations quebrariam com o mesmo `SyntaxError`.

**Manutenção contínua:** cada nova entidade/migration deve ser adicionada ao respectivo barrel. As fases 7+ que criarem entidades de domínio seguem esse padrão.

---

## Configuração de banco (dev/migração local)

`backend/.env` (gitignored) criado para o CLI de migration e runtime local:

```
DATABASE_HOST=::1
DATABASE_PORT=3306
DATABASE_USER=app
DATABASE_PASSWORD=secret
DATABASE_NAME=marketplace_test
```

Host `::1` (IPv6 loopback) pelo mesmo motivo da Fase 5 (MySQL local Homebrew intercepta `127.0.0.1:3306`). Há três contas `app` no MySQL do container (`%`, `127.0.0.1`, `localhost`) com senhas divergentes; `::1` resolve para a conta que autentica com `secret`. Banco `marketplace_test` criado e com `GRANT ALL` para `app@'%'`.

Requer `docker compose up -d mysql` antes de gerar/aplicar migrations ou rodar a suíte de schema.

---

## Interfaces produzidas (consumidas pelas fases 7-11)

50 classes de entidade exportadas de `backend/src/infra/database/entities/index.ts`. Repositórios obtidos via `AppDataSource.getRepository(Entity)`. Nomes de classe conforme o contrato do `plan_index.md`.
