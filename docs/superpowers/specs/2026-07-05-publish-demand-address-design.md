# Publicar Demanda: endereço completo, visibilidade condicional e limpeza do form

## Contexto

Tela "Publicar Demanda" (`frontend/src/features/demands/components/DemandForm.tsx`) precisa de ajustes de UX (categoria pesquisável, remover orçamento, botão roxo, galeria de fotos com preview/deletar) e de um novo requisito de negócio: a demanda precisa de endereço completo, mas esse endereço só deve ser revelado por completo ao profissional depois que ele tiver orçamento aceito (contrato criado). Cidade e UF ficam públicos desde a publicação, para o profissional decidir se orça.

Hoje `ServiceDemand.address_id` existe mas nunca é populado por nenhum fluxo real (grep confirma: só aparece em migration, entity, seed com `null`, e no `demand.service.ts`/`demand.schemas.ts` como campo solto nunca setado por request real). Não existe endpoint público para resolver um `addressId` de terceiro, e o módulo `address` é escopado ao dono (`user_id`). Não existe form de endereço no frontend hoje.

## Modelo de dados (backend)

- Migration nova em `backend/src/infra/database/migrations/`:
  - Remove FK `FK_a6299af0f0b71046f7492e61599` e coluna `address_id` de `service_demands`.
  - Adiciona colunas em `service_demands`: `street varchar(255)`, `number varchar(20)`, `complement varchar(255) NULL`, `district varchar(128)`, `city varchar(128)`, `state char(2)`, `zip_code varchar(9)` — mesmo shape usado em `Address`, mas sem FK (é uma cópia própria da demanda, não vínculo com endereço do usuário).
  - `budget_min`/`budget_max` já são `nullable: true` no banco — sem mudança de coluna.
- `backend/src/infra/database/entities/service-demand.entity.ts`: remove `address_id`/`address` (relation com `Address`), adiciona as 7 colunas novas como campos da entidade (`complement` opcional/nullable, resto obrigatório).

## Schemas (backend)

`backend/src/modules/demand/demand.schemas.ts`:

- `createDemandSchema`: remove `addressId`; adiciona `street`, `number`, `complement` (nullable, default null), `district`, `city`, `state` (`length(2)`), `zipCode` — todos obrigatórios exceto `complement`. `budgetMin`/`budgetMax` viram `.optional()` (mantém `.refine` de `budgetMax >= budgetMin` só quando ambos presentes).
- `updateDemandSchema`: mesmos campos de endereço como opcionais (para edição futura, fora do escopo desta tela mas mantém consistência de tipo).
- `demandResponseSchema`: substitui `addressId` por `city`, `state` (sempre presentes) + `street`, `number`, `complement`, `district`, `zipCode` como **opcionais/nullable** — presentes só quando o backend decide revelar (ver regra de visibilidade abaixo); ausentes (`undefined`/`null`) caso contrário.

## Regra de visibilidade (backend)

Em `backend/src/modules/demand/demand.service.ts`:

- `DemandServiceDeps` ganha `contracts: Repository<Contract>` (mesmo padrão de DI usado em `contract.service.ts`, sem container central — wiring manual em `demand.routes.ts` via `app.dataSource.getRepository(Contract)`).
- `toResponse` passa a receber um `actor: { userId: string; professionalId: string | null }` opcional. Regra:
  - `city`/`state`: sempre inclusos.
  - Campos de endereço completo (`street`, `number`, `complement`, `district`, `zipCode`): inclusos apenas se `actor.userId === demand.client_id` (dono) OU existe `Contract` com `demand_id = demand.id`, `professional_id = actor.professionalId`, `status IN ('active','completed')` (mesma semântica de `assertActorIsParticipant` do `contract.service.ts`).
  - Sem `actor` (endpoint anônimo, se existir) ou sem contrato/posse: só `city`/`state`.
- `list()` e `getById()` passam a aceitar/repassar o `actor` resolvido pelo controller.
- `DemandController` (já resolve `professionalProfiles` hoje para outro fim) resolve `professionalId` via `resolveOptionalProfileId(req.user!.id)` (mesmo helper já existente em `contract.controller.ts`, replicar) e monta o `actor` antes de chamar o service.

## Frontend — `DemandForm.tsx`

- **Categoria**: troca `<select>` nativo por um combobox pesquisável novo: `frontend/src/components/ui/SearchableSelect.tsx`. Input de texto que filtra uma lista de `{ value, label }`, abre lista tipo `role="listbox"` (mesmo padrão do `SearchBar.tsx` da landing, extraído para componente reutilizável). Usado para Categoria (dados de `useCategories()`) e para UF.
- **Remove** os dois campos de orçamento (mínimo/máximo) e o `budgetMin`/`budgetMax` do `defaultValues`/payload enviado.
- **Adiciona campos de endereço**: rua, número, complemento (opcional), bairro — inputs de texto simples seguindo o padrão visual atual do form (mesmas classes/estrutura de label+input já usadas ali). Cidade: input de texto (sem lista mestre de municípios disponível no projeto). UF: `SearchableSelect` com lista estática das 27 UFs (`frontend/src/lib/brazilStates.ts`, novo arquivo: array `{ value: 'SP', label: 'São Paulo' }` etc). CEP: input texto com máscara simples `00000-000` aplicada no `onChange`.
- **Botão "Publicar demanda"**: troca `<button className="bg-slate-900...">` por `<Button variant="primary">` (componente já existente, já usa `bg-primary`/roxo do projeto).
- **Galeria de fotos**: a lista de `images` (URLs já enviadas) vira grid de thumbnails; cada item, no hover, mostra um ícone de olho centralizado (abre o `Modal` já existente em `components/ui/Modal.tsx` com a imagem em tamanho maior) e um ícone de lixeira (canto, remove a URL do array local `images` via `setImages`, sem dialog de confirmação). Upload em si continua usando `ImageUpload` como está.

`frontend/src/features/demands/schemas.ts` (`demandFormSchema`): espelha o schema do backend — remove `budgetMin`/`budgetMax` obrigatórios (viram opcionais ou removidos do form value já que não há mais input), remove `addressId` inexistente, adiciona `street/number/complement/district/city/state/zipCode`.

## Fora de escopo

- Lista de municípios brasileiros (dropdown de cidade com busca real) — não há fonte de dados no projeto; cidade continua texto livre.
- Reuso do endereço salvo do usuário (`address` module) na demanda — decisão explícita do usuário foi não reusar, campos ficam diretos no form da demanda.
- Edição de endereço de demanda já publicada (tela de detalhe/edição) — esta spec cobre só o form de publicação; `updateDemandSchema` ganha os campos por consistência de tipo mas UI de edição não faz parte desta tarefa.
