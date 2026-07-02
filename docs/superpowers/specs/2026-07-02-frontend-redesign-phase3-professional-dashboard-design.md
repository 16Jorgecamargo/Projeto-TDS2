# Fase 3 do Redesign Frontend — Dashboard Profissional

## Contexto

Fase 1 (design system + shell/nav) e Fase 2 (Dashboard Cliente + Demandas + Busca + Perfil Público) já estão implementadas e mescladas na master. `docs/redesign.md` descreve o objetivo geral do redesign (SaaS premium, sem CRUD cru) para todo o app; esta fase cobre especificamente o painel do profissional, hoje o maior buraco estrutural que sobrou.

Hoje `/professional/dashboard` é uma única página (`ProfessionalDashboardPage.tsx`) empilhando 4 formulários de gestão crus (`ProfileForm`, `PortfolioManager`, `AvailabilityManager`, `ServiceAreaManager`), todos usando classes Tailwind cruas (`border`, `text-slate-*`, `bg-slate-900`) em vez dos tokens da Fase 1 (`bg-primary`, `Card`, `Badge`, `EmptyState`, `Skeleton`). Não existe nenhum resumo/indicador — é puro CRUD.

Além disso, `HomeRoute.tsx` só redireciona `role === 'client'` para o dashboard do cliente; o profissional logado cai na `LandingPage` ao acessar `/`, um bug pré-existente que esta fase corrige.

## Escopo

**Dentro do escopo:**
- Dividir a página única em duas: `ProfessionalDashboardPage` (painel de leitura + ações rápidas, novo "home" do profissional) e `ProfessionalProfileEditPage` (os 4 formulários de gestão, restilizados).
- 6 widgets no dashboard, todos alimentados por endpoints já existentes (nenhuma mudança de contrato/DTO, exceto a correção pontual de schema abaixo).
- Restilizar os 4 formulários de gestão com os tokens/componentes da Fase 1 (`Card`, `Badge`, `Skeleton`, `EmptyState`), sem mudar campos, validação ou endpoints.
- Reaproveitar `PortfolioGallery` e `AvailabilityGrid` (componentes read-only já construídos na Fase 2 para o perfil público) como pré-visualização dentro da página de edição.
- Adicionar upload de fotos aos itens de portfólio, usando o componente `ImageUpload` (Fase 2) e o endpoint `POST /portfolio/me/items/:id/images`, hoje existente mas nunca consumido pelo frontend.
- Corrigir `backend/src/modules/portfolio/portfolio.schemas.ts`: `imageUrl` usa `.url()` (exige URL absoluta), mas o endpoint de upload sempre retorna caminho relativo (`/uploads/...`) — mesmo bug já corrigido em `demand.schemas.ts` na Fase 2. Ajustar para aceitar string não-vazia.
- Corrigir `HomeRoute.tsx`: profissional logado passa a cair em `ProfessionalDashboardPage`.
- Nova rota `/professional/profile`, protegida por `<ProtectedRoute />` (qualquer papel logado, mesmo padrão de `/professional/dashboard`).
- Atualizar `navConfig.ts`: item "Portfólio/Perfil" do profissional passa a apontar para `/professional/profile` (hoje aponta incorretamente para `/professional/dashboard`).

**Fora do escopo (sem fonte de dados real no backend, mesmo critério usado na Fase 2 para o widget de pagamentos do cliente):**
- Widget "Novos convites" — não existe endpoint que liste convites pendentes agregados por profissional (só por demanda, via `GET /demands/:id/invitations`), e nenhuma notificação é disparada na criação de um convite.
- Widget "Ranking" — não existe cálculo de ranking entre profissionais no backend.
- Qualquer mudança de endpoint, DTO, regra de negócio, autenticação, sockets ou banco de dados fora da correção pontual de schema acima.

## Arquitetura

### `ProfessionalDashboardPage` (`/professional/dashboard`)

Página nova, somente leitura + ações rápidas, no padrão de `ClientDashboardPage` (grid de widgets independentes, cada um com seu próprio hook TanStack Query, disciplina `Skeleton`/`EmptyState`).

**Widgets:**

1. **`DashboardQuickActions`** — botões "Buscar demandas disponíveis" (`/demands`), "Ver contratos" (`/contracts`), "Editar perfil" (`/professional/profile`).
2. **`DashboardRevenueWidget`** — saldo disponível + saldo pendente (`GET /wallet` → `balance`, `pendingBalance`); receita do mês calculada no cliente somando `amount` das transações com `type === 'credit'` cujo `createdAt` cai no mês corrente (`GET /wallet/transactions`).
3. **`DashboardAgendaWidget`** — lista dos próximos compromissos agendados: contratos do profissional (`GET /contracts`) com `schedule.scheduledDate` no futuro, ordenados por data ascendente; abaixo, resumo textual da disponibilidade semanal cadastrada (`GET /availability/:professionalId/slots`, contagem de slots por dia).
4. **`DashboardActiveContractsWidget`** — contratos com `status === 'active'` (`GET /contracts`), lista com link para o detalhe.
5. **`DashboardReviewsWidget`** — avaliações mais recentes recebidas (`GET /professionals/:id/reviews`, mesmo endpoint já usado em `ReviewList` na Fase 2), reaproveitando o componente `ReviewList` existente.
6. **`DashboardProfileSummaryCard`** — headline, nota média, categorias/badges do próprio perfil (`GET /professionals/me` ou equivalente já usado por `useMyProfile`), com link "Editar perfil" (`/professional/profile`).

Todos os widgets seguem a mesma disciplina da Fase 2: `Skeleton` durante carregamento, `EmptyState` quando vazio, sem lógica de agregação no backend.

### `ProfessionalProfileEditPage` (`/professional/profile`)

Substitui a pilha crua atual. Mantém os mesmos 4 formulários (`ProfileForm`, `PortfolioManager`, `AvailabilityManager`, `ServiceAreaManager`), sem mudança de campos/validação/endpoints, mas:

- Cada seção vira um `Card` com título, usando os tokens de formulário já estabelecidos (mesmo tratamento dado a `DemandForm` na Fase 2: `bg-primary` no botão de ação, inputs com `id`/`htmlFor`, mensagens de erro com `text-accent` ou equivalente).
- Listas (portfólio, disponibilidade, áreas) ganham `EmptyState` quando vazias e `Skeleton` durante carregamento — nenhum dos dois existe hoje.
- `PortfolioGallery` (read-only, já existente) aparece acima do `PortfolioManager`, mostrando exatamente como o portfólio aparece no perfil público.
- `AvailabilityGrid` (read-only, já existente) aparece acima do `AvailabilityManager`, mesma lógica.
- `PortfolioManager` ganha upload de foto por item: botão "Adicionar foto" (usando `ImageUpload`) dentro de cada item da lista, chamando `POST /portfolio/me/items/:id/images`; miniaturas das fotos já enviadas aparecem no próprio item da lista.

### Correção de schema (backend, mínima)

`backend/src/modules/portfolio/portfolio.schemas.ts`: em `portfolioItemResponseSchema.images[].imageUrl` e `portfolioImageSchema.imageUrl`, trocar `.url()` por `.min(1)`, mantendo `.describe()` mas ajustando o exemplo `.openapi()` para um caminho relativo (`/uploads/exemplo.jpg`), no mesmo padrão da correção já aplicada em `demand.schemas.ts` na Fase 2. Sem mudança de campo, tipo ou regra de negócio — só relaxa uma validação que impedia o uso do próprio endpoint de upload já existente.

### Navegação

- `HomeRoute.tsx`: adiciona `role === 'professional' → <ProfessionalDashboardPage />`, corrigindo o fallback incorreto para `LandingPage`.
- `router/index.tsx`: nova rota `{ path: '/professional/profile', element: <ProfessionalProfileEditPage /> }` dentro do grupo `<ProtectedRoute />` (qualquer papel logado), ao lado da rota existente `/professional/dashboard`.
- `navConfig.ts`: item do profissional que hoje é `{ label: 'Portfólio/Perfil', to: '/professional/dashboard', ... }` passa a apontar para `/professional/profile`. `getDashboardItem('professional')` continua apontando para `/professional/dashboard` (dashboard = home, profile edit = tela separada).

## Testes

TDD igual às fases anteriores: cada widget novo e a `ProfessionalProfileEditPage` ganham teste próprio (RED → GREEN), reaproveitando os padrões de mock/fixture já usados nos widgets do `ClientDashboardPage`. A correção de schema do backend ganha verificação via os testes de integração já existentes de `portfolio.routes.test.ts` (rodar antes/depois pra confirmar que nada quebra).

## Riscos e decisões já tomadas

- Widgets "Novos convites" e "Ranking" removidos do escopo por falta de fonte de dados real — decisão confirmada com o usuário durante o brainstorming, mesmo critério do widget de pagamentos removido na Fase 2.
- Upload de foto em portfólio: adição aprovada pelo usuário durante o brainstorming, por já existir o endpoint no backend sem uso e o componente `ImageUpload` já pronto da Fase 2.
