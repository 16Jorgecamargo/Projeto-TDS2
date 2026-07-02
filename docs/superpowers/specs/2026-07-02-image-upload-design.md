# Upload de Imagens — Design

## Contexto

Pré-requisito para a Fase 2 do redesign de frontend (Dashboard Cliente + Demandas + Busca + Perfil Público), que precisa exibir/coletar fotos de demanda, portfólio e avatar. Investigação confirmou:

- `Demand.images`, `ProgressUpdate.images`, `PortfolioImage.imageUrl` e `User.avatarUrl` já existem no backend, mas todos validam `z.string().url()` — hoje só aceitam URL de imagem já hospedada em outro lugar. Nenhum já vem populado (frontend manda `images: []` sempre).
- Não existe nenhuma infraestrutura de upload no backend: sem `@fastify/multipart`, sem `@fastify/static`, sem rota de arquivo, sem volume Docker pra isso, sem histórico de tentativa anterior (`git log --grep=upload` vazio).

Diferente do resto do redesign (regra "não altere o backend" do `docs/redesign.md`), este é um projeto próprio, autorizado explicitamente pelo usuário para desbloquear a Fase 2. Escopo: backend (endpoint novo) + frontend (componente reutilizável).

## Decisão de arquitetura: endpoint genérico, consumidores inalterados

Um único endpoint de upload devolve uma URL. Os 4 campos que já existem (`Demand.images[].url`, `ProgressUpdate.images[]`, `PortfolioImage.imageUrl`, `User.avatarUrl`) continuam validando `z.string().url()` exatamente como hoje — **zero mudança de schema/DTO nesses quatro pontos**. O frontend simplesmente passa a ter uma URL real pra colocar neles, em vez de deixá-los vazios. Isso mantém o upload como uma peça isolada, testável e reutilizável, sem acoplar a nenhum dos 4 domínios.

## Storage: disco local via volume Docker

Decisão do usuário: começar com disco local (não S3/MinIO). Arquivo salvo em `UPLOAD_DIR` dentro do container, servido de volta via `@fastify/static`. Um volume Docker novo (`uploads_data`) garante persistência entre restarts do container, seguindo o mesmo padrão já usado por `mysql_data`/`redis_data` no `docker-compose.yml`.

## Backend

### Dependências novas
- `@fastify/multipart` — parse de upload multipart/form-data
- `@fastify/static` — serve os arquivos salvos de volta como URLs públicas

### Config (`backend/src/config/index.ts`, mesmo padrão Zod-validado existente)
```ts
UPLOAD_DIR: z.string().min(1).default('./uploads'),
UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
UPLOAD_ALLOWED_MIME: z.string().default('image/jpeg,image/png,image/webp'),
```
Exposto via `env.UPLOAD_DIR` / `env.UPLOAD_MAX_SIZE_MB` / `env.UPLOAD_ALLOWED_MIME` como todo o resto (proxy em `env.ts`, sem mudar esse arquivo).

### Módulo `backend/src/modules/upload/` (mesmo layout do módulo `social`)
- `upload.routes.ts` — registra `POST /uploads/images` com `onRequest: [app.authenticate]` (autenticado, qualquer papel)
- `upload.controller.ts` — classe fina delegando pro service
- `upload.service.ts` — lógica: lê o stream multipart, valida mime real do arquivo (via magic bytes, não só a extensão/header declarado pelo cliente) e tamanho (`UPLOAD_MAX_SIZE_MB`), gera nome de arquivo `crypto.randomUUID() + extensão`, grava em `UPLOAD_DIR`, retorna a URL pública
- `upload.schemas.ts` — resposta: `{ url: string; filename: string; size: number }`, erro 400 se mime/tamanho inválido, 413 se excede limite

### Registro no app (`backend/src/app.ts`, mesmo padrão sequencial de `await app.register(...)`)
```ts
await app.register(multipart, { limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 } });
await app.register(fastifyStatic, { root: path.resolve(env.UPLOAD_DIR), prefix: '/uploads/' });
// ...
await app.register(uploadRoutes, { prefix: '/api' });
```

### `docker-compose.yml`
Adiciona ao serviço `app`:
```yaml
volumes:
  - uploads_data:/app/uploads
```
E ao mapa `volumes:` de nível raiz: `uploads_data:` (named volume, mesmo padrão de `mysql_data`).

### Segurança
- Autenticação obrigatória (reusa `app.authenticate` já existente).
- Validação de mime type pelos magic bytes do arquivo (não confia no `Content-Type` declarado pelo cliente).
- Tamanho máximo aplicado tanto no limite do plugin multipart (`limits.fileSize`) quanto checado no service (defesa em profundidade).
- Nome de arquivo gerado sempre por UUID — nunca usa o nome original do cliente (evita path traversal / colisão / injeção via nome de arquivo).
- Rate limiting já existente (`@fastify/rate-limit` global) cobre o endpoint automaticamente, sem configuração extra.

## Frontend

### Componente `ImageUpload` (`frontend/src/components/ui/ImageUpload.tsx`)
Reutilizável em qualquer feature que precise anexar imagem. Props: `onUploaded: (url: string) => void`, `label?: string`. Comportamento: input de arquivo (ou drag-and-drop), preview local antes de enviar, `POST` via `FormData` pro endpoint, estado de loading/erro usando os primitivos já existentes (`Skeleton` durante upload, `Toast` em caso de erro de rede/validação). Consome tokens de `frontend/DESIGN.md` (mesma disciplina da Fase 1 — sem cor hardcoded).

### Consumidores (cada um chama `ImageUpload` e insere a URL retornada no campo que já existe)
- `PublishDemandPage`/`DemandForm` — adiciona campo de fotos ao formulário de demanda (`demandFormSchema` ganha `images?: string[]`, opcional)
- `ProgressUpdateForm` (tela de contrato) — anexa fotos ao registrar progresso
- `PortfolioManager` (dashboard profissional) — anexa imagens a um item de portfólio
- `ProfileForm` (dashboard profissional) e configurações de conta (cliente) — upload de avatar, popula `User.avatarUrl`

Esses 4 pontos de consumo pertencem às fases que os redesenham (Fase 2 pra demanda, Fase 3 pra portfólio/perfil profissional, Fase 4 pra progresso de contrato) — este projeto entrega só o endpoint + o componente `ImageUpload` genérico, pronto pra ser plugado por elas.

## Fora de escopo

- Redimensionamento/otimização de imagem no servidor (thumbnails, compressão) — pode ser adicionado depois sem quebrar o contrato da API.
- Múltiplos arquivos por requisição — um arquivo por chamada; upload de várias fotos é várias chamadas sequenciais do componente.
- Storage externo (S3/MinIO) — decisão explícita de começar local; migração futura só trocaria a implementação interna do `upload.service.ts`, mantendo o contrato de resposta (`{url, filename, size}`) igual.
- Wiring dos 4 consumidores nas telas — cada um entra na spec/plano da fase que redesenha aquela tela.

## Migração incremental

1. Adiciona deps + config + volume Docker — build/deploy continuam passando sem uso ainda.
2. Cria módulo `upload/` isolado, registra rota — testável sozinho via Postman/teste automatizado, sem nenhum consumidor ainda.
3. Cria `ImageUpload` no frontend, sem consumidor ainda — testável isolado (Storybook-like, ou só teste unitário).
4. Fases seguintes (2, 3, 4) plugam `ImageUpload` nas telas que precisam, cada uma no seu próprio plano.
