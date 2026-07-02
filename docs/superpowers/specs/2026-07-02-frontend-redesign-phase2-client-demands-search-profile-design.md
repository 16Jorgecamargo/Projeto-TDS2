# Frontend Redesign — Fase 2: Dashboard Cliente + Demandas + Busca + Perfil Público

## Contexto

Segunda fase do redesign de frontend (`docs/redesign.md`, inventário em `docs/telas.md`), depois da Fase 1 (Design System + Shell/Nav, implementada e mesclada) e do projeto "Upload de Imagens" (implementado e mesclado — endpoint `POST /api/uploads/images` + componente `ImageUpload` reutilizável, prontos pra consumir).

Escopo desta fase: **Dashboard Cliente** (`/`), **Busca de profissionais** (`/search`), **Perfil Público** (`/professionals/:id`), **Demandas** — lista (`/demands`), detalhe (`/demands/:id`), publicação (`/demands/new`).

Restrição inegociável (`docs/redesign.md`): nenhuma regra de negócio, endpoint, DTO, autenticação ou banco muda. Toda melhoria vive exclusivamente em `frontend/src/`. Componentes de UI de baixo nível (Button, Card, Badge, Skeleton, EmptyState, Avatar, Tooltip, Toast, Modal, Drawer, ImageUpload) já existem — esta fase só compõe, não cria primitivos novos.

## Decisões de escopo (investigação prévia)

Três funcionalidades pedidas no `docs/redesign.md` não têm suporte real no backend hoje; decisão tomada por investigação + confirmação do usuário:

- **Comentários em demanda**: não existe endpoint de comentário/thread. Reinterpretado como botão "Conversar" que abre uma sala de chat vinculada à demanda (`useCreateRoom`, já existente) — comunicação passa pelo Chat, não por uma feature nova.
- **Mapa na busca**: `Address.latitude`/`longitude` e `ProfessionalServiceArea.radius_km` existem como colunas no banco mas nenhuma busca geo real está implementada no `search.service.ts` (filtro é só cidade/UF/texto). Fora de escopo — busca continua lista/cards sem mapa até o backend ganhar busca geo real.
- **Dashboard agregado**: não existe endpoint `GET /me/dashboard` nem filtro `status=` em `GET /contracts`. Cada widget do Dashboard Cliente é seu próprio hook TanStack Query, paralelo; contratos ativos/concluídos são filtrados client-side por `Contract.status` sobre a lista completa já retornada por `GET /contracts`.

Duas funcionalidades pedidas têm suporte backend pronto mas zero consumo frontend hoje — entram nesta fase:

- **Favoritos**: `POST/DELETE/GET /favorites` já existem (retornam só `{id, professionalId, createdAt}` — sem nome/foto do profissional, exige hidratação client-side buscando o perfil de cada favorito).
- **Avaliações reais**: `GET /professionals/:id/reviews` já existe, hoje só o agregado (`ratingAverage`/`ratingCount`) é exibido; passa a listar avaliações individuais.

## Dashboard Cliente (`/`)

Substitui a landing page pública atual quando o usuário está autenticado como cliente (a landing pública continua existindo para visitantes — essa troca de comportamento por estado de auth é nova nesta tela, ver "Fora de escopo" abaixo para o que NÃO muda). Composto por widgets independentes, cada um com seu próprio card, `Skeleton` durante `isPending` e `EmptyState` quando vazio:

- **Demandas abertas/em andamento** — `useDemands(mine: true)`, filtro client-side por `status`.
- **Últimos orçamentos** — resumo do total de orçamentos pendentes agregando `useDemandQuotes` das demandas abertas do widget acima.
- **Contratos ativos / concluídos** — `useContracts()`, filtro client-side por `status` (`active` vs `completed`).
- **Próximo agendamento** — extrai `Contract.schedule` (`scheduledDate`, `durationMinutes`, `notes`, `status`) dos contratos ativos, mostra o mais próximo cronologicamente. Se nenhum contrato tiver `schedule` não nulo, widget não aparece (não é `EmptyState`, é ausência — schedule é opcional por contrato).
- **Profissionais favoritos** — `GET /favorites` (lista de `{id, professionalId}`) + uma chamada de perfil público por item para hidratar nome/avatar/nota. Lista curta (poucos favoritos esperados), sem paginação client-side adicional.
- **Notificações recentes** — `useNotifications()`, últimas 5, reaproveita componente/lógica já existente da tela de Notificações.
- **Ações rápidas** — botões fixos: Publicar demanda, Buscar profissional, Ver contratos.

## Busca (`/search`)

Reestruturação em duas colunas: filtros laterais (sticky no desktop, drawer no mobile) + grade de cards.

**Filtros**: texto livre, cidade, UF, categoria (vira seletor aqui, substituindo o grid da landing), badge/toggle "disponível agora" (campo `isAvailable` já retornado pela busca, hoje não filtrável na UI — passa a ser). Nenhum filtro novo exige mudança de backend; todos os campos já existem na resposta ou nos parâmetros aceitos por `GET /search/professionals`.

**Ordenação**: por nota (`ratingAverage`) e por preço (`hourlyRate`), aplicada client-side sobre a página atual de resultados (a API não expõe `sort=`; ordenar apenas a página corrente é a limitação aceita).

**Cards ricos** (substituem o `ProfessionalCard` atual): avatar/iniciais, headline, bio truncada, badge de categoria, badge "disponível agora" quando `isAvailable`, nota em estrelas + contagem, preço/hora ou "Sob consulta", botão de favoritar inline (chama `POST /favorites` ou `DELETE /favorites/:id` conforme estado).

**Estados**: grade de `Skeleton` durante carregamento, `EmptyState` com sugestão de ampliar filtros quando a lista vier vazia.

Mapa fica fora de escopo (ver Decisões de escopo).

## Perfil Público (`/professionals/:id`)

Reestruturação em página de uma coluna com hero, substituindo o layout mínimo atual:

- **Header**: `Avatar` (usa `User.avatarUrl`, populável desde a Fase de Upload; fallback pra iniciais), headline, badges de categoria, nota média em estrelas + contagem, botão **Favoritar** (toggle `POST`/`DELETE /favorites`), botão **Contratar** (leva ao fluxo de publicar demanda com esse profissional pré-selecionado via convite direto, reaproveitando `InviteProfessionalDialog`/fluxo de convite já existente), botão **Chat** (`useCreateRoom`, já existente no módulo de chat).
- **Sobre**: bio completa (hoje já exibida, mantém).
- **Áreas de atendimento**: lista cidade/UF (hoje já exibida, mantém).
- **Portfólio**: galeria de imagens reais — troca a lista de títulos-só atual por grid de `PortfolioImage.imageUrl` (populável desde a Fase de Upload) com título por item.
- **Avaliações**: lista paginada de avaliações individuais via `GET /professionals/:id/reviews` (nota, comentário, data) — substitui a exibição hoje limitada ao agregado numérico.
- **Disponibilidade**: grade semanal simples a partir de `useSlots` (hook já existe, atualmente sem consumidor na UI).

## Demandas — Lista (`/demands`)

Cards com badge de status usando o vocabulário visual da Fase 1 (cores semânticas), faixa de orçamento formatada, contagem de orçamentos recebidos por demanda (requer uma chamada adicional por card ou aceitar que a contagem apareça só no detalhe — decisão de implementação: contagem só aparece no detalhe, lista mostra status e orçamento para não multiplicar chamadas por card). `EmptyState` com CTA "Publicar demanda" quando a lista vier vazia.

## Demandas — Detalhe (`/demands/:id`)

- **Cabeçalho**: título, badge de status, botão "Convidar profissional" (existente, mantém `InviteProfessionalDialog`), botão **"Conversar"** novo — abre/cria sala de chat vinculada à demanda via `useCreateRoom`, navega para `/chat/:roomId`.
- **Descrição + Fotos**: campo de fotos passa a existir no formulário de publicação (ver abaixo) e a galeria aparece aqui via `Demand.images` (já no schema, hoje sempre vazio por falta de UI de upload).
- **Orçamentos**: cada orçamento vira um card rico (profissional, itens do orçamento, total, mensagem, status), botão "Aceitar" nas mesmas condições de hoje (`status === 'pending'` e demanda `open`).
- **Indicadores**: contagem de orçamentos recebidos, tempo desde publicação (`createdAt` já disponível, formatado client-side).

## Demandas — Publicar (`/demands/new`)

Formulário atual (categoria, título, descrição, orçamento min/max) ganha uma seção de fotos usando o componente `ImageUpload` (um arquivo por chamada, conforme o padrão da spec de Upload) — cada upload bem-sucedido adiciona uma URL ao array `images` do payload de `publishDemand`, que hoje é hardcoded como `[]`. Sem virar wizard multi-step — o formulário continua curto o suficiente para não precisar de quebra em etapas (YAGNI).

## Fora de escopo

- Busca com mapa geográfico (sem backend geo real).
- Comentários como feature própria (reinterpretado como link para Chat).
- Endpoint de dashboard agregado no backend (widgets seguem client-side compostos).
- Ordenação de busca por preço/nota via parâmetro de API (fica client-side, só na página atual).
- Qualquer mudança nas telas de Profissional (dashboard profissional, portfólio, disponibilidade) — pertencem à Fase 3.
- Qualquer mudança em Contratos/Carteira — pertencem à Fase 4.
- Upload de avatar do usuário na tela de Configurações — o campo `User.avatarUrl` é referenciado aqui só como leitura no Perfil Público; a UI de upload de avatar em si é escopo da tela de Configurações/Perfil (Fase 3 para profissional, Fase 7 para configurações gerais).

## Migração incremental

1. Dashboard Cliente é tela nova — troca o componente renderizado em `/` quando o usuário autenticado tem papel `client`; visitante não-autenticado continua vendo a `LandingPage` atual sem mudança.
2. Busca, Perfil Público, Demandas (lista/detalhe/publicar) são reescritas incrementalmente tela por tela — cada uma continua funcional isoladamente durante a migração, nenhuma depende de outra estar pronta.
3. Favoritos e Avaliações (novos hooks TanStack Query consumindo endpoints já existentes) podem ser implementados e testados isoladamente antes de serem plugados nas telas.
4. `ImageUpload` já existe (Fase de Upload) — plugar no formulário de demanda é aditivo, não quebra o fluxo de publicação atual (campo de fotos é opcional).
