# Auditoria Completa do Frontend — Projeto-TDS

Documento de auditoria técnica pré-redesign. Cobre visão geral, arquitetura de rotas, fluxos de navegação, inventário completo de telas/componentes/formulários/modais/cards/hooks, fluxos funcionais, mapa de navegação, relações e dependências, e conclusão.

---

# 01 — Visão Geral do Frontend, Arquitetura das Rotas e Fluxos de Navegação

> Documento de síntese. Consolida informações já detalhadas nos 12 arquivos de domínio em `docs/frontend-audit/domains/`. Não contém sugestões de melhoria, redesign ou correção — apenas descrição factual do estado atual do código, conforme documentado nos arquivos de origem.

---

## 1. Visão Geral do Frontend

### 1.1 Stack tecnológica identificada

A partir dos 12 domínios auditados, as seguintes tecnologias/bibliotecas são usadas no frontend:

| Categoria | Biblioteca/Ferramenta | Onde aparece |
|---|---|---|
| Framework de UI | React (com `JSX.Element` como tipo de retorno padrão) | Todo o app |
| Linguagem | TypeScript | Todo o app |
| Roteamento | `react-router-dom` (`createBrowserRouter`, `RouterProvider`, `Outlet`, `Navigate`, `Link`, `useNavigate`, `useParams`, `useSearchParams`) | `router/index.tsx`, todas as features |
| Estado de servidor | `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`) | Praticamente todas as features |
| Estado de cliente/global | `zustand` (stores `auth`, `sidebar`, `commandPalette`, `Toast`) | `stores/`, `components/ui/Toast.tsx` |
| Formulários | `react-hook-form` | auth, demands, contracts, professional (ProfileForm), wallet (WithdrawDialog), reviews (ReviewForm), settings (PreferencesForm) |
| Validação | `zod` + `@hookform/resolvers/zod` | mesmas features acima, mais `notifications` e `admin` (validação de resposta de API) |
| HTTP client | `axios` (instância única `http` em `lib/http.ts`, `baseURL: '/api'`) | Todas as chamadas de API |
| Tempo real | `socket.io-client` | `features/chat/socket.ts` (único uso de WebSocket em todo o frontend) |
| Ícones | `@heroicons/react/24/outline` e `@heroicons/react/24/solid` | Amplamente usado (navegação, badges, ratings, ações) |
| Estilo | Tailwind CSS (com tokens customizados via CSS custom properties em `oklch()`) | Todo o app, via `tailwind.config.js` e `index.css` |
| Fonte | `Manrope`, `Inter`, `system-ui` | `tailwind.config.js` |

Não há uso de: bibliotecas de gráficos (Recharts, Chart.js, Victory — o gráfico de receita da carteira é feito manualmente com `div`s), Context API do React para autenticação/tema (tudo via Zustand), dark mode (só existe um conjunto de valores de cor em `:root`), nem componente `Select` de design system (todos os `<select>` são nativos do HTML).

### 1.2 Estrutura de diretórios

```
frontend/src/
├── components/
│   ├── ui/        → primitivos de design system (Avatar, Badge, Button, Card, Drawer, EmptyState,
│   │                 ImageUpload, Modal, Skeleton, Toast, Tooltip)
│   └── layout/    → casca da aplicação (AppShell, Topbar, Sidebar, MobileNav, CommandPalette, ProfileMenu)
├── router/        → definição de rotas (index.tsx) e guarda de rota (ProtectedRoute.tsx)
├── pages/         → páginas de nível raiz (HomeRoute, Forbidden, NotFound)
├── lib/           → utilitários compartilhados (authStorage, http, navConfig, queryClient, utils)
├── stores/        → stores Zustand (auth, sidebar, commandPalette)
├── features/      → 17 features de domínio, cada uma com api.ts, queries.ts, schemas.ts (quando aplicável),
│                     components/, pages/ (quando aplicável)
├── App.tsx        → componente raiz (dispara bootstrapSession, monta AppShell + Outlet)
└── main.tsx        → entrypoint (StrictMode → QueryClientProvider → RouterProvider)
```

Features identificadas nos 12 domínios: `auth`, `landing`, `demands`, `contracts`, `dashboard` (cliente), `professional-dashboard`, `professional`, `chat`, `wallet`, `notifications`, `reviews`, `favorites`, `settings`, `admin`, `uploads`. (`reviews`, `favorites` e `uploads` não têm `pages/` própria — são consumidas por outras features.)

### 1.3 Convenções observadas transversalmente

- Todo texto visível ao usuário está em português (PT-BR); nomes de arquivos, variáveis e funções em inglês.
- Nenhum arquivo do frontend documentado contém comentários no código-fonte.
- Padrão de camadas repetido em quase toda feature: `api.ts` (tipos + chamadas HTTP cruas via `http`), `queries.ts` (hooks React Query), `schemas.ts` (Zod, quando há formulário ou validação de resposta), `components/`, `pages/`.
- Não há dark mode implementado (apenas um conjunto de tokens de cor em `:root`).
- Não há testes de acessibilidade avançada (focus trap em modais, por exemplo) — o `Modal`/`Drawer` compartilhados não implementam gestão de foco.
- Praticamente nenhuma tela trata explicitamente estado de erro de rede (`isError`) das queries — o padrão dominante é: enquanto carrega, `Skeleton`; sem dado, cai no mesmo branch visual de "vazio" (`EmptyState` ou equivalente), mascarando falhas de API como ausência de conteúdo.
- Não há toasts de confirmação de sucesso/erro na maioria das mutations — a exceção é `ImageUpload` (erro de upload) e `PaymentDialog`/`WithdrawDialog` (mensagens de erro inline, não toast).
- Não há paginação de UI implementada em nenhuma tela apesar de várias APIs já suportarem `page`/`limit`/`total` (demandas, contratos-relacionados, notificações, reviews, favoritos, wallet transactions, admin reports/disputes).

---

## 2. Arquitetura das Rotas

### 2.1 Definição do router

`router/index.tsx` usa `createBrowserRouter` com um nó raiz `{ element: <App /> }` que envolve **todas** as rotas — ou seja, `App` (que monta `AppShell`) é aplicado universalmente, inclusive em rotas públicas como `/login`.

### 2.2 Tabela completa de rotas

| Path | Elemento | Feature de origem | Proteção | Roles permitidos |
|---|---|---|---|---|
| `/` | `HomeRoute` | `pages/` | Pública (decide conteúdo por role internamente) | — |
| `/search` | `SearchPage` | `landing` | Pública | — |
| `/login` | `LoginPage` | `auth` | Pública | — |
| `/register` | `RegisterPage` | `auth` | Pública | — |
| `/verify-email` | `VerifyEmailPage` | `auth` | Pública | — |
| `/forgot-password` | `ForgotPasswordPage` | `auth` | Pública | — |
| `/reset-password` | `ResetPasswordPage` | `auth` | Pública | — |
| `/forbidden` | `Forbidden` | `pages/` | Pública | — |
| `/professionals/:id` | `PublicProfilePage` | `professional` | Pública | — |
| `/settings` | `SettingsPage` | `settings` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/professional/dashboard` | `ProfessionalDashboardPage` | `professional-dashboard` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/professional/profile` | `ProfessionalProfileEditPage` | `professional` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/demands` | `DemandListPage` | `demands` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/demands/:id` | `DemandDetailPage` | `demands` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/contracts` | `ContractListPage` | `contracts` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/contracts/:id` | `ContractDetailPage` | `contracts` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/wallet` | `WalletPage` | `wallet` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/notifications` | `NotificationsPage` | `notifications` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/chat` | `ChatIndexPage` | `chat` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/chat/:roomId` | `ChatPage` | `chat` | `ProtectedRoute` (sem `roles`) | Qualquer autenticado |
| `/demands/new` | `PublishDemandPage` | `demands` | `ProtectedRoute roles={['client']}` | `client` |
| `/admin` | `AdminDashboardPage` | `admin` | `ProtectedRoute roles={['admin']}` | `admin` |
| `*` | `NotFound` | `pages/` | Pública | — |

Observação factual: `ProfessionalDashboardPage` é importado duas vezes — uma para a rota explícita `/professional/dashboard`, outra reaproveitada por `HomeRoute` quando `role === 'professional'` na rota `/`.

Das 22 rotas registradas, **apenas 2 têm restrição de `roles`** (`/demands/new` para `client`, `/admin` para `admin`). Todas as demais rotas autenticadas (`/settings`, `/professional/dashboard`, `/professional/profile`, `/demands`, `/demands/:id`, `/contracts`, `/contracts/:id`, `/wallet`, `/notifications`, `/chat`, `/chat/:roomId`) são acessíveis por qualquer usuário logado independentemente do papel — inclusive `/professional/dashboard` e `/professional/profile`, que na prática só são alcançadas por navegação normal de um profissional (via `navConfig.ts`), mas não têm barreira técnica contra acesso direto por `client`/`admin` via URL.

### 2.3 ProtectedRoute (`router/ProtectedRoute.tsx`)

Lógica de guarda, usada como elemento pai de grupos de rotas:

1. Lê `user` e `isBootstrapping` de `useAuthStore`.
2. Se `isBootstrapping === true` → retorna `null` (nenhum conteúdo, nenhum spinner — evita "flash" de redirecionamento).
3. Se não há `user` → `<Navigate to="/login" replace />`.
4. Se `roles` foi passado e `!roles.includes(user.role)` → `<Navigate to="/forbidden" replace />`.
5. Caso contrário → `<Outlet />`.

### 2.4 Bootstrap de sessão

- `App.tsx`: `useEffect(() => { void bootstrapSession(); }, [])` — dispara uma única vez ao montar a raiz.
- `bootstrapSession()` (`features/auth/bootstrap.ts`): lê `refreshToken` do `localStorage`; se ausente, chama `finishBootstrapping()` e encerra (usuário permanece deslogado); se presente, chama `POST /auth/refresh` — sucesso repopula `user`/`accessToken`/`refreshToken` via `setAuth`; falha chama `clear()`. Em ambos os casos finaliza com `finishBootstrapping()`.
- Enquanto isso ocorre, `ProtectedRoute` bloqueia a renderização de qualquer rota protegida (retorna `null`).
- Persistência: **apenas o `refreshToken`** é salvo em `localStorage` (`authStorage.ts`, chave `auth.refreshToken`). `user` e `accessToken` vivem somente em memória (store Zustand `auth`, sem middleware `persist`) — são perdidos a cada reload até `bootstrapSession()` rodar novamente.
- `lib/http.ts` injeta `Authorization: Bearer <accessToken>` em toda requisição e, em qualquer 401 não retentado, chama `refreshAccessToken()` e reexecuta a requisição original; falha no refresh desloga o usuário (`clear()`).

### 2.5 HomeRoute — roteamento condicional na raiz (`/`)

`pages/HomeRoute.tsx` decide o conteúdo da rota `/` a partir de `useAuthStore((s) => s.user)`, sem qualquer chamada de API ou redirecionamento de URL (a URL permanece `/` em qualquer caso):

- `user?.role === 'client'` → `ClientDashboardPage` (`features/dashboard`)
- `user?.role === 'professional'` → `ProfessionalDashboardPage` (`features/professional-dashboard`)
- Qualquer outro caso (visitante anônimo, `user` ausente, ou `role === 'admin'`) → `LandingPage` (`features/landing`)

Observação factual: não há branch para `role === 'admin'` — um administrador autenticado, ao acessar `/`, vê a mesma `LandingPage` que um visitante anônimo veria. A única rota exclusiva de admin é `/admin`.

---

## 3. Fluxos de Navegação

### 3.1 Casca visual (AppShell) — presente em toda rota

`AppShell` (`components/layout/AppShell.tsx`) é montado uma única vez em `App.tsx`, envolvendo o `<Outlet />` — está presente em **todas** as rotas, públicas e protegidas:

```
<AppShell>
  <Topbar />
  <Sidebar />         (desktop, a partir do breakpoint customizado `nav` = 424px)
  <main>{children}</main>
  <MobileNav />       (mobile, abaixo do breakpoint `nav`)
  <CommandPalette />
  <ToastProvider />
</AppShell>
```

- `Topbar`: sempre visível, contém título fixo "Services Marketplace", `NotificationBell` e `ProfileMenu` (este último retorna `null` se não há usuário logado).
- `Sidebar` / `MobileNav`: ambos retornam `null` se não há `role` (usuário deslogado) — portanto visitantes não veem navegação lateral/inferior, apenas o `Topbar`.
- `CommandPalette`: acionável via `Ctrl+K`/`Cmd+K` em qualquer tela; mostra itens de navegação (filtrados por `role`), resultados de busca de profissionais e de demandas (somente quando há usuário logado com `role`, já que os itens de navegação vêm de `navConfig.ts` por role).

### 3.2 Itens de navegação por papel (`lib/navConfig.ts`)

| Papel | Itens de navegação (nesta ordem) |
|---|---|
| `client` | Minhas demandas (`/demands`) → Contratos (`/contracts`) → Chat (`/chat`) → Carteira (`/wallet`) |
| `professional` | Demandas disponíveis (`/demands`) → Meus contratos (`/contracts`) → Chat (`/chat`) → Perfil (`/professional/profile`) → Carteira (`/wallet`) |
| `admin` | Denúncias (`/admin`) → Disputas (`/admin`) → Usuários (`/admin`) → Contratos (`/contracts`) → Pagamentos/Carteira (`/wallet`) |

Observação: os 3 primeiros itens de `adminNav` apontam todos para o mesmo path `/admin` (diferenciados só por rótulo/ícone — não há sub-rotas distintas para denúncias/disputas/usuários).

Item "Dashboard" é sintético (não faz parte das listas acima), gerado por `getDashboardItem(role)`: `client → '/'`, `professional → '/professional/dashboard'`, `admin → '/admin'`.

Na `Sidebar`/`MobileNav`, a ordem exibida é: Dashboard → (Chat, se existir para o papel) → 2 primeiros itens de `getNavItems(role)` (mobile primary). Na `MobileNav` especificamente: Dashboard → itens primários (2) → botão Buscar (central) → Chat.

### 3.3 Padrão de navegação por tipo de tela

- **Telas de autenticação** (login, register, forgot/reset password, verify-email): isoladas, sem `Sidebar`/`MobileNav` funcionais (usuário ainda não tem `role`), navegação entre si via `<Link>` (ex.: Login ↔ Register ↔ Forgot Password).
- **Dashboards** (`ClientDashboardPage`, `ProfessionalDashboardPage`): tela de entrada por papel, com ações rápidas no topo e grade de widgets que linkam para outras telas (demandas, contratos, perfil, carteira, notificações).
- **Telas de lista** (`DemandListPage`, `ContractListPage`): navegação para detalhe via clique no card/item (`navigate('/xxx/:id')`), sem paginação nem filtro de UI.
- **Telas de detalhe** (`DemandDetailPage`, `ContractDetailPage`, `PublicProfilePage`): agregam sub-blocos/modais e podem originar navegação para chat (`useCreateRoom` → `/chat/:roomId`) ou para publicação de demanda com profissional pré-associado (`/demands/new?professionalId=...`).
- **Chat**: `ChatIndexPage` (`/chat`) é um estado vazio estático (não lista conversas reais); a navegação para uma sala específica (`/chat/:roomId`) sempre parte de fora da feature chat (botão "Conversar"/"Chat" em `QuoteCard`, `ContractDetailPage`, `ProfessionalProfileHeader`).
- **Configurações e Admin**: telas agregadoras de painéis/tabelas sem sub-navegação própria (sem tabs, sem breadcrumbs).

### 3.4 Command Palette como atalho transversal

Disponível globalmente (`Ctrl+K`/`Cmd+K`), permite pular diretamente para: itens de navegação do papel atual, profissionais (via `useSearchProfessionals`, mínimo 2 caracteres) e demandas (filtro local sobre `useDemands`, mínimo 2 caracteres). Cada resultado clicável fecha a paleta e navega (`navigate(path)`).

---

# 02 — Inventário de Telas, Componentes e Layouts

> Documento de síntese. Tabelas consolidadas a partir dos 12 arquivos de domínio. Para descrição completa de cada item (props, estados, hooks, etc.), consultar o arquivo de domínio referenciado na coluna "Domínio".

---

## 4. Inventário Completo das Telas

25 telas identificadas nos 12 domínios (incluindo páginas de fundação fora de `features/`).

| # | Tela | Arquivo | Rota | Proteção | Domínio |
|---|---|---|---|---|---|
| 1 | HomeRoute | `pages/HomeRoute.tsx` | `/` | Pública (roteador condicional) | 00-foundation / 02-landing / 05-dashboard-client |
| 2 | LandingPage | `features/landing/pages/LandingPage.tsx` | `/` (fallback) | Pública | 02-landing |
| 3 | SearchPage | `features/landing/pages/SearchPage.tsx` | `/search` | Pública | 02-landing |
| 4 | LoginPage | `features/auth/pages/LoginPage.tsx` | `/login` | Pública | 01-auth |
| 5 | RegisterPage | `features/auth/pages/RegisterPage.tsx` | `/register` | Pública | 01-auth |
| 6 | ForgotPasswordPage | `features/auth/pages/ForgotPasswordPage.tsx` | `/forgot-password` | Pública | 01-auth |
| 7 | ResetPasswordPage | `features/auth/pages/ResetPasswordPage.tsx` | `/reset-password` | Pública | 01-auth |
| 8 | VerifyEmailPage | `features/auth/pages/VerifyEmailPage.tsx` | `/verify-email` | Pública | 01-auth |
| 9 | Forbidden (403) | `pages/Forbidden.tsx` | `/forbidden` | Pública | 00-foundation |
| 10 | NotFound (404) | `pages/NotFound.tsx` | `*` | Pública | 00-foundation |
| 11 | PublicProfilePage | `features/professional/pages/PublicProfilePage.tsx` | `/professionals/:id` | Pública | 07-professional |
| 12 | ClientDashboardPage | `features/dashboard/pages/ClientDashboardPage.tsx` | `/` (role client) | Protegida (qualquer autenticado) | 05-dashboard-client |
| 13 | ProfessionalDashboardPage | `features/professional-dashboard/pages/ProfessionalDashboardPage.tsx` | `/professional/dashboard` e `/` (role professional) | Protegida (qualquer autenticado) | 06-professional-dashboard |
| 14 | ProfessionalProfileEditPage | `features/professional/pages/ProfessionalProfileEditPage.tsx` | `/professional/profile` | Protegida (qualquer autenticado) | 07-professional |
| 15 | DemandListPage | `features/demands/pages/DemandListPage.tsx` | `/demands` | Protegida (qualquer autenticado) | 03-demands |
| 16 | DemandDetailPage | `features/demands/pages/DemandDetailPage.tsx` | `/demands/:id` | Protegida (qualquer autenticado) | 03-demands |
| 17 | PublishDemandPage | `features/demands/pages/PublishDemandPage.tsx` | `/demands/new` | Protegida (`roles=['client']`) | 03-demands |
| 18 | ContractListPage | `features/contracts/pages/ContractListPage.tsx` | `/contracts` | Protegida (qualquer autenticado) | 04-contracts |
| 19 | ContractDetailPage | `features/contracts/pages/ContractDetailPage.tsx` | `/contracts/:id` | Protegida (qualquer autenticado) | 04-contracts |
| 20 | WalletPage | `features/wallet/pages/WalletPage.tsx` | `/wallet` | Protegida (qualquer autenticado) | 09-wallet |
| 21 | NotificationsPage | `features/notifications/pages/NotificationsPage.tsx` | `/notifications` | Protegida (qualquer autenticado) | 10-notif-reviews-favorites |
| 22 | ChatIndexPage | `features/chat/pages/ChatIndexPage.tsx` | `/chat` | Protegida (qualquer autenticado) | 08-chat |
| 23 | ChatPage | `features/chat/pages/ChatPage.tsx` | `/chat/:roomId` | Protegida (qualquer autenticado) | 08-chat |
| 24 | SettingsPage | `features/settings/pages/SettingsPage.tsx` | `/settings` | Protegida (qualquer autenticado) | 11-settings-admin-uploads |
| 25 | AdminDashboardPage | `features/admin/pages/AdminDashboardPage.tsx` | `/admin` | Protegida (`roles=['admin']`) | 11-settings-admin-uploads |

Observação: nenhuma feature entre as 12 domínios possui uma tela de "Meus favoritos" (`useFavorites` existe mas não tem consumidor de página); `favorites`, `reviews` e `uploads` não têm `pages/` própria — seus componentes são embutidos em telas de outras features (ver seção 11).

---

## 5. Inventário Completo dos Componentes

Tabela consolidada de todos os componentes de feature (não-página) citados nos 12 domínios. Componentes de `components/ui` (primitivos compartilhados) estão detalhados na seção 11; aqui constam os componentes específicos de cada feature.

| Componente | Arquivo | Domínio | Tipo |
|---|---|---|---|
| AuthField | `features/auth/components/AuthField.tsx` | 01-auth | Input de formulário (label + erro), `forwardRef` |
| CategoryGrid | `features/landing/components/CategoryGrid.tsx` | 02-landing | Grid de categorias (usa `useCategories`) |
| SearchBar | `features/landing/components/SearchBar.tsx` | 02-landing | Formulário de busca (RHF + Zod) |
| SearchFilters | `features/landing/components/SearchFilters.tsx` | 02-landing | Formulário de filtros controlado (sem RHF) |
| ProfessionalResults | `features/landing/components/ProfessionalResults.tsx` | 02-landing | Lista de resultados de busca |
| DemandCard | `features/demands/components/DemandCard.tsx` | 03-demands | Card de listagem |
| DemandForm | `features/demands/components/DemandForm.tsx` | 03-demands | Formulário (RHF + Zod) |
| QuoteCard | `features/demands/components/QuoteCard.tsx` | 03-demands | Card de orçamento |
| QuoteForm | `features/demands/components/QuoteForm.tsx` | 03-demands | Formulário (RHF + Zod + `useFieldArray`) |
| InviteProfessionalDialog | `features/demands/components/InviteProfessionalDialog.tsx` | 03-demands | Modal (form próprio, sem RHF) |
| ContractProgress | `features/contracts/components/ContractProgress.tsx` | 04-contracts | Lista somente-leitura |
| ProgressUpdateForm | `features/contracts/components/ProgressUpdateForm.tsx` | 04-contracts | Formulário (RHF + Zod) |
| DisputeDialog | `features/contracts/components/DisputeDialog.tsx` | 04-contracts | Modal + formulário (RHF + Zod) |
| PaymentDialog | `features/contracts/components/PaymentDialog.tsx` | 04-contracts | Modal + formulário (`useState`, sem RHF) |
| DashboardQuickActions (cliente) | `features/dashboard/components/DashboardQuickActions.tsx` | 05-dashboard-client | Barra de botões de navegação |
| DashboardDemandsWidget | `features/dashboard/components/DashboardDemandsWidget.tsx` | 05-dashboard-client | Widget de dados |
| DashboardContractsWidget | `features/dashboard/components/DashboardContractsWidget.tsx` | 05-dashboard-client | Widget de dados |
| DashboardScheduleWidget | `features/dashboard/components/DashboardScheduleWidget.tsx` | 05-dashboard-client | Widget de dados (único que pode retornar `null`) |
| DashboardFavoritesWidget | `features/dashboard/components/DashboardFavoritesWidget.tsx` | 05-dashboard-client | Widget de dados |
| DashboardNotificationsWidget | `features/dashboard/components/DashboardNotificationsWidget.tsx` | 05-dashboard-client | Widget de dados |
| FavoriteProfessionalPreview (interno) | dentro de `DashboardFavoritesWidget.tsx` | 05-dashboard-client | Subcomponente, N+1 queries |
| DashboardQuickActions (profissional) | `features/professional-dashboard/components/DashboardQuickActions.tsx` | 06-professional-dashboard | Barra de botões (nome duplicado, feature distinta) |
| DashboardRevenueWidget | `features/professional-dashboard/components/DashboardRevenueWidget.tsx` | 06-professional-dashboard | Widget de dados |
| DashboardAgendaWidget | `features/professional-dashboard/components/DashboardAgendaWidget.tsx` | 06-professional-dashboard | Widget de dados |
| DashboardActiveContractsWidget | `features/professional-dashboard/components/DashboardActiveContractsWidget.tsx` | 06-professional-dashboard | Widget de dados |
| DashboardProfileSummaryCard | `features/professional-dashboard/components/DashboardProfileSummaryCard.tsx` | 06-professional-dashboard | Widget de dados |
| DashboardReviewsWidget | `features/professional-dashboard/components/DashboardReviewsWidget.tsx` | 06-professional-dashboard | Widget (envolve `ReviewList` de outra feature) |
| ProfileForm | `features/professional/components/ProfileForm.tsx` | 07-professional | Formulário (RHF + Zod) |
| AvailabilityManager | `features/professional/components/AvailabilityManager.tsx` | 07-professional | Mini-formulário + lista (`useState`, sem Zod) |
| AvailabilityGrid | `features/professional/components/AvailabilityGrid.tsx` | 07-professional | Lista somente-leitura |
| PortfolioManager | `features/professional/components/PortfolioManager.tsx` | 07-professional | Mini-formulário + lista + upload |
| PortfolioItemRow (interno) | dentro de `PortfolioManager.tsx` | 07-professional | Subcomponente por item |
| PortfolioGallery | `features/professional/components/PortfolioGallery.tsx` | 07-professional | Lista somente-leitura |
| ServiceAreaManager | `features/professional/components/ServiceAreaManager.tsx` | 07-professional | Mini-formulário + lista (`useState`, sem Zod) |
| ProfessionalCard | `features/professional/components/ProfessionalCard.tsx` | 07-professional | Card de listagem (compartilhado com `landing`) |
| ProfessionalProfileHeader | `features/professional/components/ProfessionalProfileHeader.tsx` | 07-professional | Cabeçalho de perfil público |
| ChatWindow | `features/chat/components/ChatWindow.tsx` | 08-chat | Janela de chat (lista + formulário + socket) |
| WalletBalanceCard | `features/wallet/components/WalletBalanceCard.tsx` | 09-wallet | Card de apresentação |
| WalletRevenueChart | `features/wallet/components/WalletRevenueChart.tsx` | 09-wallet | Gráfico manual (div+CSS) |
| TransactionList | `features/wallet/components/TransactionList.tsx` | 09-wallet | Lista de apresentação |
| WithdrawDialog | `features/wallet/components/WithdrawDialog.tsx` | 09-wallet | Modal + formulário (RHF + Zod) |
| NotificationBell | `features/notifications/components/NotificationBell.tsx` | 10-notif-reviews-favorites | Ícone/link no `Topbar` |
| ReviewForm | `features/reviews/components/ReviewForm.tsx` | 10-notif-reviews-favorites | Formulário (RHF + Zod, seletor de estrelas) |
| ReviewList | `features/reviews/components/ReviewList.tsx` | 10-notif-reviews-favorites | Lista somente-leitura |
| FavoriteButton | `features/favorites/components/FavoriteButton.tsx` | 10-notif-reviews-favorites | Botão de toggle (coração) |
| PreferencesForm | `features/settings/components/PreferencesForm.tsx` | 11-settings-admin-uploads | Formulário (RHF + Zod, sem exibição de erros) |
| ConsentsPanel | `features/settings/components/ConsentsPanel.tsx` | 11-settings-admin-uploads | Painel (checkboxes com mutation on-change) |
| DeleteAccountPanel | `features/settings/components/DeleteAccountPanel.tsx` | 11-settings-admin-uploads | Painel + modal de confirmação |
| ReportsTable | `features/admin/components/ReportsTable.tsx` | 11-settings-admin-uploads | Tabela + modal de ação |
| DisputesTable | `features/admin/components/DisputesTable.tsx` | 11-settings-admin-uploads | Tabela + modal de ação |

Total: 43 componentes de feature (mais subcomponentes internos não exportados: `FavoriteProfessionalPreview`, `PortfolioItemRow`, `ToastCard`).

---

## 6. Inventário dos Layouts

### 6.1 Componentes estruturais de layout (`components/layout/`)

| Componente | Arquivo | Responsabilidade | Onde aparece |
|---|---|---|---|
| AppShell | `components/layout/AppShell.tsx` | Casca visual global (Topbar + Sidebar + main + MobileNav + CommandPalette + ToastProvider) | Todas as rotas (montado 1x em `App.tsx`) |
| Topbar | `components/layout/Topbar.tsx` | Cabeçalho fixo (título + NotificationBell + ProfileMenu) | Todas as rotas |
| Sidebar | `components/layout/Sidebar.tsx` | Navegação lateral desktop, colapsável, dependente de role | Todas as rotas (conteúdo só com usuário logado); visível a partir do breakpoint customizado `nav` (424px) |
| MobileNav | `components/layout/MobileNav.tsx` | Navegação inferior fixa mobile, dependente de role | Todas as rotas; visível abaixo do breakpoint `nav` |
| CommandPalette | `components/layout/CommandPalette.tsx` | Paleta de comandos (Ctrl+K), construída sobre `Modal` | Todas as rotas (ativação por atalho) |
| ProfileMenu | `components/layout/ProfileMenu.tsx` | Dropdown de perfil (Configurações / Sair) | Dentro do `Topbar` |

### 6.2 Padrões de layout por grupo de telas (containers/larguras observados)

| Grupo de telas | Padrão de container | Exemplo |
|---|---|---|
| Autenticação (5 telas) | `mx-auto max-w-sm p-6` + `Card` único | LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage |
| Dashboards (client/professional) | `flex flex-col gap-6 p-6` + cabeçalho com ações rápidas + grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` de widgets `Card` | ClientDashboardPage, ProfessionalDashboardPage |
| Listas simples | `mx-auto max-w-3xl` ou largura total, `flex flex-col gap-3/gap-4 p-6` | DemandListPage, ContractListPage |
| Detalhe de entidade | `mx-auto max-w-3xl flex flex-col gap-4 p-6` | DemandDetailPage, ContractDetailPage, PublicProfilePage |
| Formulário único de criação | `mx-auto max-w-2xl p-6` | PublishDemandPage |
| Configurações | `mx-auto max-w-lg flex flex-col gap-6 p-6`, três painéis empilhados | SettingsPage |
| Admin | `mx-auto max-w-4xl flex flex-col gap-8 p-6`, duas tabelas empilhadas em `Card` | AdminDashboardPage |
| Busca (duas colunas) | `mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row` (filtros + resultados) | SearchPage |
| Chat | `mx-auto flex h-[calc(100vh-4rem-5rem)] max-w-2xl flex-col gap-4 p-6` (altura dinâmica por viewport) | ChatPage |
| Notificações | `mx-auto flex max-w-2xl flex-col gap-4 p-6`, `Card` único como lista com `divide-y` | NotificationsPage |

Nenhuma tela documentada usa `Drawer` (componente existente em `components/ui` mas sem consumidor real) nem grid customizado com `col-span`/`row-span` — todos os grids de widgets usam células uniformes no fluxo automático do CSS Grid.

---

## 4.1 Detalhamento completo por tela e componente (por domínio)

As seções abaixo trazem o detalhamento exaustivo — tela por tela, componente por componente, formulário por formulário, modal por modal — organizado por domínio funcional. Cada capítulo documenta rota, permissões, fluxo do usuário, hierarquia visual, componentes, estados, chamadas de API, hooks e responsividade.

### Capítulo: 00-foundation

## Auditoria Técnica — Fundação / Camada Compartilhada

> Documento de levantamento factual do estado atual do código, para servir de base a um redesign completo. Não contém sugestões, críticas ou propostas de mudança — apenas descrição do que existe.

Escopo: `components/ui/*`, `components/layout/*`, `router/*`, `pages/*`, `lib/*`, `stores/*`, `App.tsx`, `main.tsx`.

---

### Design tokens e infraestrutura visual (contexto para os componentes abaixo)

Arquivo `tailwind.config.js`:

- Breakpoint customizado `nav: '424px'` (min-width). É o breakpoint usado por `Sidebar` (`nav:flex`) e `MobileNav`/`AppShell` (`nav:hidden`, `nav:pb-6`) para alternar entre navegação mobile (bottom bar) e navegação desktop (sidebar lateral). Não são usados os breakpoints padrão do Tailwind (`sm`, `md`, `lg`) para esse propósito — apenas este único breakpoint customizado em 424px.
- Cores nomeadas via CSS custom properties (`bg`, `surface`, `ink`, `muted`, `primary`/`primary-hover`, `accent`/`accent-hover`), definidas em `index.css` usando `oklch()`. Só existe um conjunto de valores em `:root`; não há bloco `@media (prefers-color-scheme: dark)` nem seletor de tema — ou seja, **não há dark mode implementado**, apenas light mode.
- `fontFamily.sans`: `['Manrope', 'Inter', 'system-ui', 'sans-serif']`.
- `borderRadius`: `sm: 6px`, `md: 10px`, `lg: 16px`.
- `boxShadow`: `hover` (usado em `Card interactive`) e `modal` (usado em `Modal`, `Drawer`, `Toast`, `ProfileMenu`).
- `zIndex` nomeado: `dropdown: 20`, `sticky: 30`, `modal-backdrop: 40`, `modal: 50`, `toast: 60`, `tooltip: 70`. Usado via classes `z-dropdown`, `z-sticky`, `z-modal-backdrop`, `z-modal`, `z-toast`, `z-tooltip`.
- `index.css` também remove a scrollbar visualmente em todos os navegadores (`scrollbar-width: none`, `::-webkit-scrollbar { display:none }`) tanto em `html`, `body` quanto em `*`.

---

## Componentes de UI (`components/ui`)

### Avatar (`components/ui/Avatar.tsx`)

- **Responsabilidade**: exibir avatar circular do usuário — imagem (`src`) ou iniciais calculadas a partir do nome.
- **Props** (`AvatarProps`):
  - `name: string` (obrigatório) — usado para `alt`/`aria-label` e para gerar iniciais.
  - `src?: string | null` (opcional) — se presente e truthy, renderiza `<img>`.
  - `size?: 'sm' | 'md' | 'lg'` (opcional, default `'md'`).
  - `className?: string` (opcional) — mesclada via `cn`.
- **Estado interno**: nenhum (função pura de renderização).
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: função interna `initials(name)` (pega primeira letra do primeiro nome + primeira letra do último nome, uppercase); usa `cn` de `lib/utils`.
- **Eventos/callbacks**: nenhum.
- **Variantes visuais**: tamanho via `sizeClasses` — `sm: h-8 w-8 text-xs`, `md: h-10 w-10 text-sm`, `lg: h-14 w-14 text-lg`. Sem imagem: fundo `bg-primary`, texto `text-bg`, `rounded-full`, `font-semibold`.
- **Loading/erro/empty**: não aplicável (sem estado assíncrono próprio).
- **Ícones**: nenhum (usa texto de iniciais, não ícone).
- **Onde é usado**: 3 arquivos em `features` (grep) além de `ProfileMenu.tsx` (layout). Primitivo usado amplamente onde há representação de usuário.
- **Reutilização**: alta. **Complexidade**: baixa.

### Badge (`components/ui/Badge.tsx`)

- **Responsabilidade**: rótulo pequeno arredondado (pill) para indicar status/tag.
- **Props** (`BadgeProps`):
  - `tone?: BadgeTone` (opcional, default `'neutral'`) — `BadgeTone = 'neutral' | 'urgent'`.
  - `children: ReactNode` (obrigatório).
  - `className?: string` (opcional).
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks**: nenhum.
- **Variantes visuais**: `toneClasses` — `neutral: bg-surface text-ink`, `urgent: bg-accent text-bg`. Base: `rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center`.
- **Loading/erro/empty**: não aplicável.
- **Ícones**: nenhum.
- **Onde é usado**: 10 arquivos em `features` (grep). Usado amplamente como primitivo de UI para status de demandas/contratos/etc.
- **Reutilização**: alta. **Complexidade**: baixa.

### Button (`components/ui/Button.tsx`)

- **Responsabilidade**: botão de ação padrão da aplicação, envolve `<button>` nativo.
- **Props** (`ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>`):
  - `variant?: ButtonVariant` (opcional, default `'primary'`) — `'primary' | 'accent' | 'ghost'`.
  - `size?: ButtonSize` (opcional, default `'md'`) — `'sm' | 'md'`.
  - `children: ReactNode` (obrigatório, herdado/redeclarado).
  - Todos os demais atributos HTML nativos de `<button>` (`onClick`, `disabled`, `type`, `aria-*` etc.) são repassados via `...rest`.
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks**: todos os eventos nativos de botão (via spread), nenhum callback próprio declarado.
- **Variantes visuais**:
  - `variantClasses`: `primary: bg-primary text-bg hover:bg-primary-hover`; `accent: bg-accent text-bg hover:bg-accent-hover`; `ghost: bg-transparent text-ink border border-surface hover:bg-surface`.
  - `sizeClasses`: `sm: px-3 py-1.5 text-sm`; `md: px-5 py-2.5 text-base`.
  - Base: `inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors duration-150`, foco visível com outline `primary`, `disabled:cursor-not-allowed disabled:opacity-50`.
- **Loading/erro/empty**: não há prop `loading` nem spinner embutido; estado de desabilitado é o único suportado nativamente via `disabled`.
- **Ícones**: nenhum embutido (ícones, quando presentes, vêm via `children` de quem consome).
- **Onde é usado**: 29 arquivos em `features`/`pages` (grep). Primitivo mais usado da camada de UI.
- **Reutilização**: alta. **Complexidade**: baixa.

### Card (`components/ui/Card.tsx`)

- **Responsabilidade**: contêiner de conteúdo com cantos arredondados e padding padrão; opcionalmente interativo (hover/cursor).
- **Props** (`CardProps extends HTMLAttributes<HTMLDivElement>`):
  - `interactive?: boolean` (opcional, default `false`).
  - `children: ReactNode` (obrigatório).
  - Demais atributos HTML de `<div>` repassados via `...rest`.
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks**: nenhum próprio (herda `onClick` etc. via `...rest` se passado).
- **Variantes visuais**: base `rounded-lg bg-bg p-6`; quando `interactive`, adiciona `cursor-pointer transition-shadow hover:shadow-hover`.
- **Loading/erro/empty**: não aplicável (contêiner genérico).
- **Ícones**: nenhum.
- **Onde é usado**: 29 arquivos em `features`/`pages` (grep). Primitivo estrutural muito usado (listagens, dashboards, formulários).
- **Reutilização**: alta. **Complexidade**: baixa.

### Drawer (`components/ui/Drawer.tsx`)

- **Responsabilidade**: painel lateral deslizante (esquerda ou direita), renderizado via portal, com fechamento por tecla `Escape` ou clique no backdrop.
- **Props** (`DrawerProps`):
  - `open: boolean` (obrigatório) — controla renderização (`return null` quando `false`).
  - `onClose: () => void` (obrigatório).
  - `title: string` (obrigatório) — usado no header e como `aria-label` do dialog.
  - `side?: 'left' | 'right'` (opcional, default `'right'`).
  - `children: ReactNode` (obrigatório).
- **Estado interno**: nenhum estado próprio (`useState`); apenas efeito.
- **Hooks usados**: `useEffect` (adiciona/remove listener de `keydown` para `Escape`, só quando `open`).
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `createPortal` (para `document.body`), `cn`. Botão de fechar interno com texto `×` (não usa ícone de biblioteca).
- **Eventos/callbacks expostos**: `onClose` (chamado por tecla Escape, clique no backdrop, ou clique no botão fechar). `stopPropagation` no clique interno do painel evita fechar ao clicar dentro dele.
- **Variantes visuais**: `side='left'` → `left-0`; `side='right'` (default) → `right-0`. Painel fixo `top-0 h-full w-72` com `shadow-modal`, `bg-bg`, `z-modal` (backdrop em `z-modal-backdrop`, `bg-ink/40`).
- **Loading/erro/empty**: não aplicável (componente de estrutura, conteúdo livre via `children`).
- **Ícones**: nenhum (× textual).
- **Onde é usado**: **nenhum uso encontrado em `features/` ou `pages/`** (grep retornou 0 ocorrências de import). Componente existente na camada de UI mas não consumido em nenhuma tela no momento da auditoria.
- **Reutilização**: alta (primitivo genérico), porém **uso real atual: nenhum**. **Complexidade**: baixa/média (portal + listener de teclado).

### EmptyState (`components/ui/EmptyState.tsx`)

- **Responsabilidade**: bloco visual padrão para estados vazios (sem dados, 404, 403 etc.), com título, descrição opcional e ação opcional.
- **Props** (`EmptyStateProps`):
  - `title: string` (obrigatório).
  - `description?: string` (opcional).
  - `action?: ReactNode` (opcional) — normalmente um link ou botão.
  - `className?: string` (opcional).
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks**: nenhum próprio (delegado ao `action` passado pelo consumidor).
- **Variantes visuais**: layout único — `flex flex-col items-center gap-2 rounded-lg bg-surface px-6 py-12 text-center`; título em `text-lg font-semibold text-ink`; descrição em `text-sm text-muted`; sem variantes de tamanho/tom.
- **Loading/erro/empty**: é o próprio componente de "empty"; não possui variantes internas para loading/erro (cada tela decide o texto).
- **Ícones**: nenhum embutido.
- **Onde é usado**: 25 arquivos em `features` (grep), além de `pages/Forbidden.tsx` e `pages/NotFound.tsx`. Um dos primitivos mais reutilizados.
- **Reutilização**: alta. **Complexidade**: baixa.

### ImageUpload (`components/ui/ImageUpload.tsx`)

- **Responsabilidade**: input de arquivo estilizado (label clicável) para upload de imagem, com preview local via `URL.createObjectURL` e chamada de API de upload.
- **Props** (`ImageUploadProps`):
  - `onUploaded: (result: UploadResult) => void` (obrigatório) — callback disparado com o resultado do upload (`UploadResult` vem de `features/uploads/api`).
  - `label?: string` (opcional, default `'Enviar imagem'`).
  - `className?: string` (opcional).
- **Estado interno** (`useState`):
  - `preview: string | null` — URL local (object URL) da imagem selecionada.
  - `uploading: boolean` — controla exibição do `Skeleton` durante o upload.
- **Refs** (`useRef`): `inputRef` (referência ao `<input type="file">`, usada para resetar `value` após upload); `previewRef` (guarda a última object URL para poder revogá-la e evitar vazamento de memória).
- **Hooks usados**: `useEffect` (cleanup: revoga `previewRef.current` ao desmontar), `useRef` (x2), `useState` (x2).
- **Stores/contextos usados**: `useToast` (de `components/ui/Toast`) — dispara toast de erro (`'Falha ao enviar imagem'`, tom `'error'`) em caso de falha no upload.
- **Filhos/dependências**: `Skeleton` (exibido durante `uploading`), `uploadImage` (de `features/uploads/api`), `useToast`, `cn`.
- **Eventos/callbacks expostos**: `onUploaded` (prop). Internamente: `handleChange` (async) — lê arquivo do `<input>`, revoga preview anterior, cria novo preview, seta `uploading=true`, chama `uploadImage(file)`, em sucesso chama `onUploaded(result)`, em erro dispara toast e limpa preview, `finally` desliga `uploading` e reseta o valor do input.
- **Variantes visuais**: nenhuma prop de variante; único estilo (label com borda `border-surface`, hover `border-primary`). Aceita apenas `image/jpeg,image/png,image/webp` (`ACCEPTED_MIME`).
- **Loading/erro/empty**:
  - Loading: `Skeleton` de `h-24 w-24` com `aria-label="Enviando imagem"` enquanto `uploading`.
  - Erro: toast de erro via `useToast`, preview volta a `null`.
  - Empty (sem imagem selecionada ainda): apenas o label/input visível, sem preview.
- **Ícones**: nenhum.
- **Onde é usado**: 3 arquivos em `features` (grep).
- **Reutilização**: média (acoplado a `features/uploads/api` e a `Toast`/`Skeleton`). **Complexidade**: média.

### Modal (`components/ui/Modal.tsx`)

- **Responsabilidade**: diálogo modal centralizado, renderizado via portal, com fechamento por `Escape`, clique no backdrop ou botão de fechar.
- **Props** (`ModalProps`):
  - `open: boolean` (obrigatório) — controla renderização (`null` quando `false`).
  - `onClose: () => void` (obrigatório).
  - `title: string` (obrigatório).
  - `children: ReactNode` (obrigatório).
  - `className?: string` (opcional) — aplicada ao painel do modal (permite customizar largura etc.).
- **Estado interno**: nenhum `useState`.
- **Hooks usados**: `useEffect` (listener de `keydown` para `Escape`, ativo apenas quando `open`).
- **Stores/contextos**: nenhum direto (mas é reutilizado por `CommandPalette`, que injeta lógica de busca).
- **Filhos/dependências**: `createPortal` (para `document.body`), `cn`.
- **Eventos/callbacks expostos**: `onClose` (Escape, clique no backdrop — nota: neste componente o clique no backdrop **não tem `stopPropagation` no painel interno**, diferente do `Drawer`; o clique é apenas no `<div>` externo com `bg-ink/40` que centraliza via flex, e o painel interno não impede propagação explicitamente, mas como o painel não tem `onClick` de fechar, cliques dentro não fecham por não haver handler no próprio backdrop capturando cliques internos incorretamente — o comportamento efetivo é herdado da estrutura DOM), botão "×" de fechar.
- **Variantes visuais**: painel único `w-full max-w-lg rounded-lg bg-bg p-6 shadow-modal`, customizável via `className`. Backdrop `fixed inset-0 z-modal-backdrop flex items-center justify-center bg-ink/40 p-4`, painel em `z-modal`.
- **Loading/erro/empty**: não aplicável diretamente (conteúdo livre via `children`; estados de loading/erro ficam a cargo do consumidor, como visto em `CommandPalette`).
- **Ícones**: nenhum (× textual).
- **Onde é usado**: 6 arquivos em `features` (`DeleteAccountPanel`, `DisputeDialog`, `PaymentDialog`, `ReportsTable`, `WithdrawDialog`, `DisputesTable`) + `components/layout/CommandPalette.tsx` (que o usa como base do próprio Command Palette, passando `title="Buscar ou navegar"`).
- **Reutilização**: alta. **Complexidade**: baixa/média (portal + teclado).

### Skeleton (`components/ui/Skeleton.tsx`)

- **Responsabilidade**: placeholder de carregamento (retângulo pulsante).
- **Props** (`SkeletonProps`):
  - `className?: string` (opcional) — define dimensões/forma (ex.: `h-24 w-24`, `h-4 w-full`).
  - `'aria-label'?: string` (opcional, default `'Carregando'`) — chave literal com aspas (prop nomeada `aria-label`).
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum.
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks**: nenhum.
- **Variantes visuais**: forma/tamanho totalmente livre via `className`; classe fixa `animate-pulse rounded-md bg-surface motion-reduce:animate-none` (respeita `prefers-reduced-motion`).
- **Loading/erro/empty**: é o próprio indicador de loading (`role="status"`).
- **Ícones**: nenhum.
- **Onde é usado**: 24 arquivos em `features` (grep), além de `ImageUpload.tsx`. Um dos primitivos mais usados para representar carregamento de listas/cards/dados assíncronos.
- **Reutilização**: alta. **Complexidade**: baixa.

### Toast (`components/ui/Toast.tsx`)

- **Responsabilidade**: sistema de notificações efêmeras (toasts) com store Zustand própria, fila de itens, auto-dismiss e renderização via portal fixo no canto inferior direito.
- **Exports**:
  - `ToastTone = 'default' | 'error'`.
  - `ToastItem { id: string; message: string; tone: ToastTone }`.
  - `useToastStore` — store Zustand (`create<ToastState>`) com estado `toasts: ToastItem[]` e ações `push(message, tone?)` (gera `id` via `crypto.randomUUID()`) e `dismiss(id)`.
  - `useToast()` — hook de conveniência que expõe `{ toast: push }` (apenas a ação `push` renomeada).
  - `ToastCard` (interno, não exportado) — renderiza um item individual.
  - `ToastProvider` — componente de efeito colateral que deve ser montado uma vez na árvore (feito em `AppShell`).
- **Estado interno**:
  - Store global (Zustand, fora de componente): `toasts`.
  - `ToastProvider`: `useState` para criar (uma vez, via inicializador de função) um `<div id="toast-viewport">` que é anexado ao `document.body` via `useEffect` e removido no cleanup.
- **Hooks usados**: `useEffect`, `useState` (em `ToastProvider`); `useEffect` em `ToastCard` para agendar `setTimeout` de auto-dismiss (`AUTO_DISMISS_MS = 5000`) e limpar no unmount/mudança de id.
- **Stores/contextos usados**: `useToastStore` (Zustand, definida no próprio arquivo — não separada em `stores/`).
- **Filhos/dependências**: `createPortal`, `cn`.
- **Eventos/callbacks expostos**: `toast(message, tone?)` (via `useToast`) para disparar um toast de qualquer lugar da árvore; botão "×" em cada `ToastCard` chama `dismiss(id)`.
- **Variantes visuais**: tom `'default'` → `bg-ink text-bg`; tom `'error'` → `bg-accent text-bg`. Cada card é `w-80 rounded-md px-4 py-3 shadow-modal`. Container fixo `bottom-4 right-4 z-toast`, com `pointer-events-none` no container e `pointer-events-auto` em cada card (permite clicar apenas nos toasts, não bloquear a página).
- **Loading/erro/empty**: tom `error` cobre casos de falha; não há variante de loading; lista vazia simplesmente não renderiza nenhum card.
- **Ícones**: nenhum (× textual).
- **Onde é usado**: `ToastProvider` é montado uma única vez em `components/layout/AppShell.tsx`. O hook `useToast`/store é consumido apenas por `components/ui/ImageUpload.tsx` no código de produção (grep não encontrou uso em `features/`/`pages/` além deste) — ou seja, o sistema de toast existe na fundação mas hoje só é disparado a partir do fluxo de upload de imagem.
- **Reutilização**: alta (infraestrutura genérica), porém **consumo real atual restrito a `ImageUpload`**. **Complexidade**: média (portal + store global + timers).

### Tooltip (`components/ui/Tooltip.tsx`)

- **Responsabilidade**: exibir rótulo textual flutuante acima do elemento filho, ao passar mouse ou focar via teclado.
- **Props** (`TooltipProps`):
  - `label: string` (obrigatório).
  - `children: ReactNode` (obrigatório).
  - `className?: string` (opcional, aplicado ao wrapper `<span>`).
- **Estado interno** (`useState`): `visible: boolean` (default `false`).
- **Hooks usados**: `useState`, `useId` (gera id único para associar `aria-describedby` ao `id` do tooltip).
- **Stores/contextos**: nenhum.
- **Filhos/dependências**: `cn`.
- **Eventos/callbacks expostos**: nenhum callback externo; internamente reage a `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` para alternar `visible`.
- **Variantes visuais**: única variante — tooltip posicionado `absolute bottom-full left-1/2 -translate-x-1/2`, fundo `bg-ink`, texto `text-bg`, `text-xs font-medium`, `z-tooltip`, `whitespace-nowrap`.
- **Loading/erro/empty**: não aplicável.
- **Ícones**: nenhum.
- **Onde é usado**: **nenhum uso encontrado em `features/`/`pages/`** (grep 0 ocorrências); usado internamente apenas por `components/layout/Sidebar.tsx` (para mostrar o label do item de navegação quando a sidebar está colapsada, e no botão "Buscar"/toggle).
- **Reutilização**: alta (primitivo simples), porém **uso real hoje restrito à camada de layout (Sidebar)**. **Complexidade**: baixa.

---

## Componentes de Layout (`components/layout`)

### AppShell (`components/layout/AppShell.tsx`)

- **Responsabilidade**: casca visual global da aplicação — monta `Topbar`, `Sidebar`, área de conteúdo (`children`), `MobileNav`, `CommandPalette` e `ToastProvider`. É renderizado por `App.tsx` envolvendo o `<Outlet />` do router, ou seja, aparece em **todas as rotas** (públicas e protegidas).
- **Props** (`AppShellProps`): `children: ReactNode` (obrigatório).
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum diretamente (delega tudo aos filhos).
- **Stores/contextos**: nenhum direto (os filhos consomem `auth`, `sidebar`, `commandPalette`).
- **Estrutura DOM**:
  ```
  <div class="flex min-h-screen flex-col bg-bg text-ink">
    <Topbar />
    <div class="flex flex-1">
      <Sidebar />
      <main class="min-w-0 flex-1 px-4 py-6 pb-20 nav:pb-6">{children}</main>
    </div>
    <MobileNav />
    <CommandPalette />
    <ToastProvider />
  </div>
  ```
- **Responsividade**: `pb-20` no `<main>` para telas abaixo do breakpoint `nav` (424px) — abre espaço para a `MobileNav` fixa na parte inferior; a partir de `nav:` vira `pb-6` (sem bottom nav visível, pois `Sidebar` assume `nav:flex` e `MobileNav` fica `nav:hidden`).
- **Dark/light mode**: nenhum tratamento; usa somente as variáveis de cor únicas definidas em `:root`.
- **Onde aparece**: montado uma única vez, em `App.tsx`, envolvendo todas as rotas do `router/index.tsx`.
- **Reutilização**: baixa (é a casca única do app, não é reaproveitado em múltiplos contextos). **Complexidade**: baixa (é apenas composição).

### Topbar (`components/layout/Topbar.tsx`)

- **Responsabilidade**: cabeçalho fixo no topo da aplicação, presente em todas as rotas (dentro do `AppShell`).
- **Props**: nenhuma (componente sem parâmetros).
- **Estado interno**: nenhum.
- **Hooks usados**: nenhum diretamente.
- **Stores/contextos**: nenhum direto (delegado a `ProfileMenu` e `NotificationBell`).
- **Estrutura**: `<header class="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">` contendo:
  1. `<span class="flex-1 text-lg font-bold text-ink">Services Marketplace</span>` (título/branding fixo, sem link nem logo/imagem).
  2. `NotificationBell` (de `features/notifications/components/NotificationBell`) — ícone de sino (`BellIcon` heroicons outline) linkando para `/notifications`, com badge numérico (`bg-accent`) mostrando contagem de notificações não lidas (`notification.readAt` nulo), calculada a partir de `useNotifications()`.
  3. `ProfileMenu`.
- **Responsividade**: não há colapso/adaptação — mesmo layout em qualquer largura; `sticky top-0` mantém fixo ao rolar.
- **Onde aparece**: sempre visível (renderizado dentro de `AppShell`, em todas as rotas), independente de o usuário estar autenticado ou não (mas `ProfileMenu` retorna `null` se não houver `user`).
- **Reutilização**: baixa (singleton de layout). **Complexidade**: baixa.

### Sidebar (`components/layout/Sidebar.tsx`)

- **Responsabilidade**: navegação lateral desktop, com itens dependentes do papel (role) do usuário logado, suporte a colapso e auto-colapso responsivo.
- **Props**: nenhuma.
- **Estado interno**: nenhum `useState` próprio; estado de colapso vem de `useSidebarStore` (Zustand, persistido).
- **Hooks usados**: `useEffect` (registra listener `matchMedia('(max-width: 1023px)')` para sincronizar `collapsed` automaticamente conforme a largura da viewport, chamando `setCollapsed` — nota: essa media query de 1023px é diferente do breakpoint Tailwind customizado `nav` de 424px usado para exibir/ocultar a sidebar).
- **Stores/contextos usados**:
  - `useAuthStore` — lê `user?.role`. Se não há `role` (usuário deslogado), retorna `null` (sidebar não renderiza).
  - `useSidebarStore` — lê `collapsed`, ações `toggle` e `setCollapsed`.
  - `useCommandPaletteStore` — ação `openPalette` (botão "Buscar" na sidebar).
- **Filhos/dependências**: `NavLink` (react-router-dom), `Tooltip` (exibido nos itens quando colapsada), `getMobilePrimaryItems`, `getDashboardItem`, `getChatItem` (de `lib/navConfig`), ícones `ChevronLeftIcon`/`ChevronRightIcon`/`MagnifyingGlassIcon` (heroicons outline), `cn`.
- **Composição de itens de navegação**: `linkItems = [dashboardItem, ...(chatItem ? [chatItem] : []), ...primaryItems]`, onde `primaryItems = getMobilePrimaryItems(role)` (os 2 primeiros itens de `getNavItems(role)`). Função `getPrimaryRouteIndexes` evita marcar como "ativo primário" (`aria-current`) rotas duplicadas (ex.: quando `to` se repete entre itens, como `/admin` aparecendo em mais de um item de `adminNav`).
- **Eventos/callbacks**: `toggle()` (botão de recolher/expandir, na base da sidebar, ícone `ChevronLeftIcon`/`ChevronRightIcon` conforme estado), `openPalette()` (botão "Buscar").
- **Variantes visuais**: `collapsed=true` → largura `w-16`, oculta labels de texto (mostra apenas ícones, com `Tooltip` explicando o item e `aria-label`); `collapsed=false` → largura `w-64`, mostra ícone + label. Item ativo (`isActive && isPrimaryOccurrence`): `bg-surface text-primary`; inativo: `text-muted hover:bg-surface hover:text-ink`.
- **Responsividade**: `hidden ... nav:flex` — só aparece a partir do breakpoint `nav` (424px); abaixo disso fica oculta (tela mostra `MobileNav` no lugar).
- **Loading/erro/empty**: nenhum estado assíncrono; se `role` ausente, retorna `null` (equivalente a "empty"/oculto).
- **Ícones**: `ChevronLeftIcon`, `ChevronRightIcon`, `MagnifyingGlassIcon` (heroicons `/24/outline`), além dos ícones de cada `NavItem` (definidos em `navConfig.ts`).
- **Onde aparece**: montada em `AppShell`, portanto em todas as rotas, mas só renderiza conteúdo quando há usuário autenticado com `role`.
- **Reutilização**: baixa (singleton de layout). **Complexidade**: média (múltiplas stores, matchMedia, lógica de itens condicionais por role).

### MobileNav (`components/layout/MobileNav.tsx`)

- **Responsabilidade**: barra de navegação inferior fixa para mobile (abaixo do breakpoint `nav`), com itens dependentes de role.
- **Props**: nenhuma.
- **Estado interno**: nenhum `useState` próprio.
- **Hooks usados**: nenhum hook de efeito; usa apenas leitura de stores.
- **Stores/contextos usados**: `useAuthStore` (`user?.role`; retorna `null` se ausente), `useCommandPaletteStore` (`openPalette`).
- **Filhos/dependências**: componente interno `NavTab` (renderiza um `NavLink` com ícone `h-7 w-7`), `getMobilePrimaryItems`, `getDashboardItem`, `getChatItem` (de `lib/navConfig`), ícone `MagnifyingGlassIcon` (heroicons outline), `cn`.
- **Composição de itens**: `linkItems = [dashboardItem, ...primaryItems, ...(chatItem ? [chatItem] : [])]` — ordem de exibição na barra: **Dashboard → itens primários (2) → botão Buscar (central, é um `<button>`, não link) → Chat** (chat fica por último, se existir para o role).
- **Eventos/callbacks**: `openPalette()` no botão central de busca.
- **Variantes visuais**: item ativo (`isActive && isPrimaryOccurrence`) → `text-primary`; inativo → `text-muted`. Todos os tabs são `flex-1` (largura igual, distribuídos uniformemente).
- **Responsividade**: `fixed inset-x-0 bottom-0 ... nav:hidden` — visível apenas abaixo do breakpoint `nav` (424px); some a partir dele (`Sidebar` assume).
- **Loading/erro/empty**: sem `role`, retorna `null`.
- **Ícones**: `MagnifyingGlassIcon` (heroicons outline) para o botão de busca; ícones de cada `NavItem` vindos de `navConfig.ts`, renderizados com `h-7 w-7` e `strokeWidth={1.75}`.
- **Onde aparece**: montada em `AppShell`, em todas as rotas; conteúdo condicional a haver `role`.
- **Reutilização**: baixa (singleton de layout). **Complexidade**: baixa/média.

### CommandPalette (`components/layout/CommandPalette.tsx`)

- **Responsabilidade**: paleta de comandos (busca global + navegação rápida), acionável por atalho de teclado, implementada sobre o componente `Modal`.
- **Props**: nenhuma.
- **Estado interno** (`useState`): `query: string` (texto digitado pelo usuário).
- **Hooks usados**:
  - `useEffect` (x3): (1) registra listener global de `keydown` para o atalho `Ctrl+K`/`Cmd+K` (`(event.ctrlKey || event.metaKey) && key === 'k'`) que chama `toggle()` da store; (2) limpa `query` sempre que `open` muda para `false`; (3) hook local `useDebouncedValue` usa seu próprio `useEffect`/`useState` para gerar `debouncedQuery` com `DEBOUNCE_MS = 300`.
  - `useMemo` (x3): `navItems` (itens de navegação do role atual), `navMatches` (filtro local por `label` contendo a query), `demandMatches` (filtro local sobre resultados de demandas já carregados).
  - `useNavigate` (react-router-dom).
- **Stores/contextos usados**:
  - `useCommandPaletteStore` — `open`, `closePalette`, `toggle`.
  - `useAuthStore` — `user?.role` (define quais itens de navegação aparecem).
  - Hooks de dados (TanStack Query, via features): `useSearchProfessionals` (de `features/landing/queries`, habilitado somente quando `open && canSearch`) e `useDemands` (de `features/demands/queries`, mesma condição de habilitação).
- **Regras de busca**: `MIN_SEARCH_LENGTH = 2` — só dispara busca quando o texto (após debounce e trim) tem 2+ caracteres (`canSearch`).
- **Filhos/dependências**: `Modal` (via `title="Buscar ou navegar"`), ícones dos `NavItem` (`<item.icon>` dinâmico), nenhum outro componente de UI.
- **Eventos/callbacks expostos**: nenhum prop externo; internamente `goTo(path)` fecha a paleta (`closePalette()`) e navega (`navigate(path)`), usado em todos os itens clicáveis (navegação, profissionais, demandas).
- **Variantes visuais**: layout único; três seções dentro de um `max-h-96 overflow-y-auto`: "Navegação" (sempre visível, filtrada pela query se houver), "Profissionais" (só quando `canSearch`), "Demandas" (só quando `canSearch`).
- **Loading/erro/empty**:
  - Seção "Profissionais": enquanto `professionalResults.isFetching` → texto "Buscando..."; se dados existem e há itens → lista (até 5, mostrando `professional.headline`); caso contrário → "Nenhum profissional encontrado."
  - Seção "Demandas": filtra localmente por título (case-insensitive) sobre os dados já buscados por `useDemands`, limitado a 5; se vazio → "Nenhuma demanda encontrada." (não há estado de loading explícito nessa seção, apenas ausência de itens até os dados chegarem).
- **Ícones**: ícones dinâmicos dos itens de navegação (`item.icon` — heroicons vindos de `navConfig.ts`).
- **Atalhos de teclado**: `Ctrl+K` / `Cmd+K` (abre/fecha a paleta a qualquer momento, listener global em `window`); `Escape` (herdado do `Modal` subjacente, fecha a paleta).
- **Onde aparece**: montada uma vez em `AppShell` (presente em todas as rotas), mas só é útil/visível quando `open=true` (controlado pela store `commandPalette`), e a busca de navegação só mostra itens quando há `role` (usuário logado).
- **Reutilização**: baixa (funcionalidade única de app). **Complexidade**: alta (múltiplos hooks, debounce, integrações com queries de duas features distintas, composição sobre `Modal`).

### ProfileMenu (`components/layout/ProfileMenu.tsx`)

- **Responsabilidade**: menu suspenso (dropdown) de perfil do usuário logado, com acesso a Configurações e Logout.
- **Props**: nenhuma.
- **Estado interno** (`useState`): `open: boolean` (default `false`) — controla exibição do dropdown.
- **Hooks usados**: `useNavigate` (react-router-dom).
- **Stores/contextos usados**: `useAuthStore` — lê `user` (retorna `null`/não renderiza se ausente) e ação `clear` (logout).
- **Filhos/dependências**: `Avatar` (tamanho `sm`, com `displayName`), ícones `Cog6ToothIcon` e `ArrowRightOnRectangleIcon` (heroicons outline).
- **Eventos/callbacks**: botão avatar alterna `open`; item "Configurações" fecha o menu e navega para `/settings`; item "Sair" (`handleLogout`) chama `clear()` (store auth), fecha o menu e navega para `/login`.
- **Variantes visuais**: mapa `roleLabels` traduz o role para exibição — `client: 'Cliente'`, `professional: 'Profissional'`, `admin: 'Administrador'`. `displayName = user.name ?? roleLabels[user.role]` (usa nome se existir, senão rótulo do papel).
- **Estrutura do dropdown**: `absolute right-0 z-dropdown mt-2 w-56 rounded-md bg-bg py-2 shadow-modal`, com cabeçalho mostrando nome + role, depois dois itens de menu (`role="menuitem"`).
- **Loading/erro/empty**: sem `user`, retorna `null` (equivalente a oculto).
- **Ícones**: `Cog6ToothIcon`, `ArrowRightOnRectangleIcon` (heroicons `/24/outline`).
- **Onde aparece**: dentro de `Topbar` (portanto em todas as rotas, dentro do `AppShell`); conteúdo só aparece com usuário autenticado.
- **Reutilização**: baixa (singleton de layout). **Complexidade**: baixa.

---

## Router

### `router/index.tsx`

Cria o router via `createBrowserRouter`, com um nó raiz `{ element: <App /> }` que envolve **todas** as rotas (ou seja, `AppShell` é aplicado universalmente, mesmo em telas públicas como login).

#### Tabela de rotas

| Path | Elemento | Proteção | Roles permitidos |
|---|---|---|---|
| `/` | `HomeRoute` | Pública | — |
| `/search` | `SearchPage` (features/landing) | Pública | — |
| `/login` | `LoginPage` (features/auth) | Pública | — |
| `/register` | `RegisterPage` (features/auth) | Pública | — |
| `/verify-email` | `VerifyEmailPage` (features/auth) | Pública | — |
| `/forgot-password` | `ForgotPasswordPage` (features/auth) | Pública | — |
| `/reset-password` | `ResetPasswordPage` (features/auth) | Pública | — |
| `/forbidden` | `Forbidden` (pages) | Pública | — |
| `/professionals/:id` | `PublicProfilePage` (features/professional) | Pública | — |
| `/settings` | `SettingsPage` (features/settings) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/professional/dashboard` | `ProfessionalDashboardPage` (features/professional-dashboard) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/professional/profile` | `ProfessionalProfileEditPage` (features/professional) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/demands` | `DemandListPage` (features/demands) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/demands/:id` | `DemandDetailPage` (features/demands) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/contracts` | `ContractListPage` (features/contracts) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/contracts/:id` | `ContractDetailPage` (features/contracts) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/wallet` | `WalletPage` (features/wallet) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/notifications` | `NotificationsPage` (features/notifications) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/chat` | `ChatIndexPage` (features/chat) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/chat/:roomId` | `ChatPage` (features/chat) | `ProtectedRoute` (sem `roles`) | Qualquer usuário logado |
| `/demands/new` | `PublishDemandPage` (features/demands) | `ProtectedRoute roles={['client']}` | `client` |
| `/admin` | `AdminDashboardPage` (features/admin) | `ProtectedRoute roles={['admin']}` | `admin` |
| `*` (qualquer outra) | `NotFound` (pages) | Pública | — |

Observação: `ProfessionalDashboardPage` é importado duas vezes no arquivo (uma para a rota `/professional/dashboard` explícita, e reaproveitado por `HomeRoute` quando `role === 'professional'` na rota `/`).

### ProtectedRoute (`router/ProtectedRoute.tsx`)

- **Responsabilidade**: guarda de rota (route guard) usado como elemento pai de grupos de rotas protegidas, controla acesso conforme autenticação e role.
- **Props** (`ProtectedRouteProps`): `roles?: Role[]` (opcional) — se omitido, qualquer usuário autenticado passa; se fornecido, restringe aos roles listados.
- **Lógica**:
  1. Lê `user` e `isBootstrapping` de `useAuthStore`.
  2. Se `isBootstrapping` é `true` → retorna `null` (não renderiza nada, nem redireciona — evita "flash" de redirecionamento antes do bootstrap de sessão terminar).
  3. Se não há `user` → `<Navigate to="/login" replace />`.
  4. Se `roles` fornecido e `!roles.includes(user.role)` → `<Navigate to="/forbidden" replace />`.
  5. Caso contrário → `<Outlet />` (renderiza rota filha).
- **Hooks usados**: `useAuthStore` (seletor duplo).
- **Dependências**: `Navigate`, `Outlet` (react-router-dom), `Role` (type de `stores/auth`).

---

## Páginas de fundação (`pages/`)

### Forbidden (`pages/Forbidden.tsx`)

- **Responsabilidade**: tela de erro 403 (acesso restrito), exibida quando `ProtectedRoute` nega acesso por role incompatível.
- **Estrutura**: `<div class="flex min-h-screen items-center justify-center p-6">` envolvendo um `EmptyState` com:
  - `title="Acesso restrito"`
  - `description="Você não tem permissão para acessar esta página."`
  - `action`: `<Link to="/">Voltar para o início</Link>` (estilo `text-sm text-primary underline`).
- **Estado/hooks**: nenhum (componente puramente estático).
- **Ícones**: nenhum.
- **Onde é referenciada**: rota `/forbidden` em `router/index.tsx`; alvo de redirecionamento do `ProtectedRoute` quando `roles` não inclui o role do usuário.

### NotFound (`pages/NotFound.tsx`)

- **Responsabilidade**: tela de erro 404, catch-all de rotas não mapeadas (`path: '*'`).
- **Estrutura**: idêntica em forma ao `Forbidden`, mudando apenas o texto:
  - `title="Página não encontrada"`
  - `description="A página que você procura não existe ou foi movida."`
  - `action`: mesmo `Link to="/"` com o mesmo texto/estilo.
- **Estado/hooks**: nenhum.
- **Ícones**: nenhum.
- **Onde é referenciada**: rota `*` (última entrada) em `router/index.tsx`.

### HomeRoute (`pages/HomeRoute.tsx`)

- **Responsabilidade**: componente controlador da rota `/` — decide qual página renderizar de acordo com o role do usuário autenticado (ou visitante).
- **Lógica de decisão** (lida com `useAuthStore((state) => state.user)`):
  - `user?.role === 'client'` → renderiza `ClientDashboardPage` (de `features/dashboard/pages/ClientDashboardPage`).
  - `user?.role === 'professional'` → renderiza `ProfessionalDashboardPage` (de `features/professional-dashboard/pages/ProfessionalDashboardPage`, a mesma página usada na rota explícita `/professional/dashboard`).
  - Nenhum dos casos acima (visitante não autenticado, ou role `admin`, já que `admin` não tem branch específico aqui) → renderiza `LandingPage` (de `features/landing/pages/LandingPage`).
- **Observação factual**: não há branch explícito para `role === 'admin'` dentro de `HomeRoute` — usuários admin, ao acessar `/`, caem no `LandingPage` (mesmo comportamento de visitante não autenticado), já que a única rota exclusiva de admin é `/admin`.
- **Estado/hooks**: apenas leitura da store (`useAuthStore`).
- **Onde é referenciada**: rota `/` em `router/index.tsx`.

---

## `lib/`

### authStorage (`lib/authStorage.ts`)

- **Responsabilidade**: encapsular persistência do refresh token em `localStorage`, com tratamento defensivo de exceções (ex.: localStorage indisponível).
- **Constante**: `REFRESH_TOKEN_KEY = 'auth.refreshToken'`.
- **Funções exportadas**:
  - `getStoredRefreshToken(): string | null` — `localStorage.getItem(...)`, retorna `null` em caso de exceção.
  - `setStoredRefreshToken(token: string): void` — `localStorage.setItem(...)`, silencia exceção (return vazio).
  - `clearStoredRefreshToken(): void` — `localStorage.removeItem(...)`, silencia exceção.
- **O que persiste**: apenas o **refresh token** (string). O `accessToken` e o objeto `user` **não** são persistidos em `localStorage` — vivem somente em memória, na store Zustand `auth` (não persistida via middleware `persist`), portanto são perdidos em um reload de página até o `bootstrapSession()` rodar novamente.
- **Onde é usado**: `stores/auth.ts` (inicialização do estado e ações `setAuth`/`clear`), `lib/http.ts` (leitura para refresh de token), `features/auth/bootstrap.ts` (leitura para decidir se tenta refresh de sessão ao carregar o app).

### http (`lib/http.ts`)

- **Responsabilidade**: cliente HTTP centralizado (Axios) com injeção automática de Bearer token e renovação automática de sessão em erros 401.
- **Instâncias Axios**:
  - `http` — instância principal exportada, `baseURL: '/api'`. Usada por toda a aplicação para chamadas de API.
  - `refreshClient` — instância interna separada (mesma `baseURL: '/api'`), usada exclusivamente para a chamada de refresh, evitando recursão nos interceptors do `http` principal.
- **Função exportada** `refreshAccessToken(): Promise<string>`:
  - Lê refresh token via `getStoredRefreshToken()`; se ausente, lança `Error('No refresh token available')`.
  - `POST /auth/refresh` com `{ refreshToken }`, espera resposta `{ accessToken, refreshToken, user }`.
  - Atualiza a store: `useAuthStore.getState().setAuth(user, accessToken, nextRefreshToken)`.
  - Retorna o novo `accessToken`.
- **Interceptor de request**: injeta `Authorization: Bearer <accessToken>` em toda requisição, lendo `accessToken` direto de `useAuthStore.getState()` (fora de componente React).
- **Interceptor de response** (tratamento de erro):
  - Se `error.response?.status === 401` e a requisição original ainda não foi marcada como `_retried`:
    - Marca `original._retried = true` (evita loop infinito de retry).
    - Tenta `refreshAccessToken()`; se sucesso, reatribui o header `Authorization` na config original e **reexecuta a requisição original** (`http(original)`), retornando essa nova Promise.
    - Se o refresh falhar, chama `useAuthStore.getState().clear()` (desloga o usuário) e rejeita com o erro do refresh.
  - Para qualquer outro status/erro, apenas rejeita normalmente (`Promise.reject(error)`).
- **Onde é usado**: importado amplamente pelas camadas de API de cada feature (`features/*/api.ts`), não documentado individualmente aqui pois está fora do escopo desta auditoria (mas é a base de todas as chamadas HTTP do app).

### navConfig (`lib/navConfig.ts`)

- **Responsabilidade**: fonte única de verdade dos itens de navegação por role, consumida por `Sidebar`, `MobileNav` e `CommandPalette`.
- **Tipo exportado**: `NavItem { label: string; to: string; icon: ComponentType<SVGProps<SVGSVGElement>> }`.
- **Listas de navegação por role** (arrays fixos, na ordem declarada):
  - `clientNav`: `Minhas demandas` (`/demands`, `ClipboardDocumentListIcon`) → `Contratos` (`/contracts`, `DocumentTextIcon`) → `Chat` (`/chat`, `ChatBubbleLeftRightIcon`) → `Carteira` (`/wallet`, `BanknotesIcon`).
  - `professionalNav`: `Demandas disponíveis` (`/demands`, `ClipboardDocumentListIcon`) → `Meus contratos` (`/contracts`, `DocumentTextIcon`) → `Chat` (`/chat`, `ChatBubbleLeftRightIcon`) → `Perfil` (`/professional/profile`, `BriefcaseIcon`) → `Carteira` (`/wallet`, `BanknotesIcon`).
  - `adminNav`: `Denúncias` (`/admin`, `ExclamationTriangleIcon`) → `Disputas` (`/admin`, `ScaleIcon`) → `Usuários` (`/admin`, `UsersIcon`) → `Contratos` (`/contracts`, `DocumentTextIcon`) → `Pagamentos/Carteira` (`/wallet`, `CreditCardIcon`). Nota: os três primeiros itens (`Denúncias`, `Disputas`, `Usuários`) apontam todos para o mesmo path `/admin` (diferenciados apenas por label/ícone, sem sub-rotas distintas hoje).
  - `navByRole: Record<Role, NavItem[]>` mapeia `client`/`professional`/`admin` às listas acima.
  - `dashboardRouteByRole: Record<Role, string>`: `client: '/'`, `professional: '/professional/dashboard'`, `admin: '/admin'`.
  - `MOBILE_PRIMARY_ROUTE_COUNT = 2` — quantidade de itens "primários" extraídos do início de cada lista para exibição na `MobileNav`/topo da `Sidebar`.
- **Funções exportadas**:
  - `getNavItems(role): NavItem[]` — retorna a lista completa do role.
  - `getMobilePrimaryItems(role): NavItem[]` — retorna os 2 primeiros itens de `getNavItems(role)`.
  - `getDashboardItem(role): NavItem` — retorna item sintético `{ label: 'Dashboard', to: dashboardRouteByRole[role], icon: HomeIcon }` (não faz parte das listas `*Nav`, é gerado sob demanda).
  - `getChatItem(role): NavItem | undefined` — busca dentro de `getNavItems(role)` o item cujo `label === 'Chat'` (existe para `client` e `professional`; para `admin` retorna `undefined`, já que `adminNav` não tem item "Chat").
- **Ícones usados neste arquivo**: `HomeIcon`, `ClipboardDocumentListIcon`, `DocumentTextIcon`, `ChatBubbleLeftRightIcon`, `BanknotesIcon`, `BriefcaseIcon`, `UsersIcon`, `ScaleIcon`, `ExclamationTriangleIcon`, `CreditCardIcon` (todos de `@heroicons/react/24/outline`).
- **Onde é usado**: `Sidebar`, `MobileNav`, `CommandPalette` (todos em `components/layout`).

### queryClient (`lib/queryClient.ts`)

- **Responsabilidade**: instância única do `QueryClient` do TanStack Query, usada em `main.tsx` para envolver toda a árvore via `QueryClientProvider`.
- **Configuração** (`defaultOptions.queries`):
  - `retry: 1` (uma tentativa adicional em caso de falha).
  - `refetchOnWindowFocus: false` (não refaz fetch automaticamente ao focar a janela).
  - `staleTime: 30_000` (30 segundos — dados considerados "frescos" por esse período antes de permitir refetch automático).
- Não há configuração customizada para `mutations` (usa defaults do TanStack Query).

### utils (`lib/utils.ts`)

- **Responsabilidade**: funções utilitárias genéricas compartilhadas.
- **Funções exportadas**:
  - `cn(...classes: Array<string | false | null | undefined>): string` — concatena classes truthy com espaço (helper de composição de classes Tailwind condicionais; usado em praticamente todos os componentes de UI/layout documentados acima).
  - `toNumber(value: string | number): number` — retorna o próprio número se já for `number`, senão faz `Number(value)`.
  - `formatCurrency(value: string | number): string` — formata usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` (instância criada uma vez no módulo, reutilizada); usa `toNumber` internamente.
  - `formatDate(value: string | Date): string` — formata usando `Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })` (instância criada uma vez no módulo); aceita `Date` ou string (convertida via `new Date(value)`).

---

## `stores/` (Zustand)

### auth (`stores/auth.ts`)

- **Tipos exportados**:
  - `Role = 'client' | 'professional' | 'admin'`.
  - `AuthUser = { id: string; role: Role; name?: string; email?: string }`.
- **Shape do estado** (`AuthState`):
  - `user: AuthUser | null` (default `null`).
  - `accessToken: string | null` (default `null`).
  - `refreshToken: string | null` (default: inicializado de `getStoredRefreshToken()` — único campo lido de `localStorage` na criação da store).
  - `isBootstrapping: boolean` (default `true`) — sinaliza que a sessão ainda está sendo restaurada/verificada ao carregar o app.
- **Ações**:
  - `setAuth(user, accessToken, refreshToken?)`: se `refreshToken` não for passado, mantém o atual (`get().refreshToken`); se houver um refresh token final (`nextRefreshToken`), persiste via `setStoredRefreshToken`; atualiza `user`, `accessToken`, `refreshToken` no estado.
  - `clear()`: remove refresh token do `localStorage` (`clearStoredRefreshToken`) e reseta `user`, `accessToken`, `refreshToken` para `null` (**não** reseta `isBootstrapping`).
  - `finishBootstrapping()`: seta `isBootstrapping: false`.
- **Persistência**: a store **não** usa o middleware `persist` do Zustand — não há serialização automática do estado inteiro; apenas o `refreshToken` é lido/escrito manualmente em `localStorage` via `authStorage.ts`. Isso significa que a cada reload de página, `user` e `accessToken` iniciam `null` até `bootstrapSession()` (em `features/auth/bootstrap.ts`) rodar, ler o `refreshToken` salvo e (se existir) chamar `authApi.refresh` para repopular `user`/`accessToken`, finalizando com `finishBootstrapping()`.
- **Consumida por**: `ProtectedRoute`, `Sidebar`, `MobileNav`, `ProfileMenu`, `CommandPalette`, `HomeRoute`, `lib/http.ts` (fora de componente, via `getState()`), `features/auth/bootstrap.ts`.

### commandPalette (`stores/commandPalette.ts`)

- **Shape do estado** (`CommandPaletteState`):
  - `open: boolean` (default `false`).
  - `openPalette: () => void` — `set({ open: true })`.
  - `closePalette: () => void` — `set({ open: false })`.
  - `toggle: () => void` — inverte `open`.
- **Persistência**: nenhuma (estado puramente em memória, resetado em cada reload).
- **Consumida por**: `CommandPalette`, `Sidebar` (botão Buscar), `MobileNav` (botão Buscar).

### sidebar (`stores/sidebar.ts`)

- **Shape do estado** (`SidebarState`):
  - `collapsed: boolean` (default `false`).
  - `toggle: () => void` — inverte `collapsed`.
  - `setCollapsed: (collapsed: boolean) => void` — define diretamente (usado pelo auto-colapso via `matchMedia` no `Sidebar`).
- **Persistência**: usa middleware `persist` do Zustand, `{ name: 'sidebar-collapsed' }` — persiste automaticamente em `localStorage` sob a chave `sidebar-collapsed` (serialização padrão do middleware, formato JSON do Zustand `persist`). É a única store, dentre as três documentadas aqui, que usa persistência automática via middleware (as demais, quando persistem algo, fazem manualmente como em `auth`).
- **Consumida por**: `Sidebar` (único consumidor).

---

## `App.tsx` e `main.tsx`

### App (`App.tsx`)

- **Responsabilidade**: componente raiz renderizado pelo router (elemento do nó raiz em `router/index.tsx`), dispara o bootstrap de sessão uma vez e monta `AppShell` envolvendo o `<Outlet />` (onde as rotas filhas são renderizadas).
- **Hooks usados**: `useEffect` (roda uma vez, `[]`, chama `void bootstrapSession()` de `features/auth/bootstrap.ts` — tenta restaurar a sessão a partir do refresh token salvo).
- **Estado/stores**: nenhum diretamente (delegado a `bootstrapSession`, que manipula `useAuthStore` internamente).
- **Estrutura**: `<AppShell><Outlet /></AppShell>`.

### main.tsx

- **Responsabilidade**: ponto de entrada da aplicação (bootstrap do React).
- **Conteúdo**:
  - Busca `#root` no DOM; lança erro (`throw new Error('Root element not found')`) se ausente.
  - Renderiza a árvore envolta em `StrictMode` → `QueryClientProvider` (com `queryClient` de `lib/queryClient.ts`) → `RouterProvider` (com `router` de `router/index.tsx`).
  - Importa `./index.css` (estilos globais/Tailwind).
- **Provedores globais configurados aqui**: TanStack Query (`QueryClientProvider`) e React Router (`RouterProvider`). Não há outro `Context.Provider` custom nesse nível (autenticação, tema etc. são geridos via Zustand, sem Context API).

---

### Tabela resumo

| Nome | Arquivo | Categoria | Reutilizável | Complexidade | Dependências principais |
|---|---|---|---|---|---|
| Avatar | components/ui/Avatar.tsx | UI primitivo | Alta | Baixa | `cn` |
| Badge | components/ui/Badge.tsx | UI primitivo | Alta | Baixa | `cn` |
| Button | components/ui/Button.tsx | UI primitivo | Alta | Baixa | `cn` |
| Card | components/ui/Card.tsx | UI primitivo | Alta | Baixa | `cn` |
| Drawer | components/ui/Drawer.tsx | UI primitivo | Alta (não usado hoje) | Baixa/Média | `createPortal`, `cn` |
| EmptyState | components/ui/EmptyState.tsx | UI primitivo | Alta | Baixa | `cn` |
| ImageUpload | components/ui/ImageUpload.tsx | UI composto | Média | Média | `Skeleton`, `useToast`, `features/uploads/api`, `cn` |
| Modal | components/ui/Modal.tsx | UI primitivo | Alta | Baixa/Média | `createPortal`, `cn` |
| Skeleton | components/ui/Skeleton.tsx | UI primitivo | Alta | Baixa | `cn` |
| Toast (store + provider) | components/ui/Toast.tsx | UI infraestrutura | Alta (uso real restrito) | Média | Zustand, `createPortal`, `cn` |
| Tooltip | components/ui/Tooltip.tsx | UI primitivo | Alta (uso real restrito à Sidebar) | Baixa | `cn` |
| AppShell | components/layout/AppShell.tsx | Layout | Baixa | Baixa | Topbar, Sidebar, MobileNav, CommandPalette, ToastProvider |
| Topbar | components/layout/Topbar.tsx | Layout | Baixa | Baixa | NotificationBell, ProfileMenu |
| Sidebar | components/layout/Sidebar.tsx | Layout | Baixa | Média | auth/sidebar/commandPalette stores, navConfig, Tooltip |
| MobileNav | components/layout/MobileNav.tsx | Layout | Baixa | Baixa/Média | auth/commandPalette stores, navConfig |
| CommandPalette | components/layout/CommandPalette.tsx | Layout | Baixa | Alta | Modal, auth/commandPalette stores, navConfig, queries de landing/demands |
| ProfileMenu | components/layout/ProfileMenu.tsx | Layout | Baixa | Baixa | auth store, Avatar |
| router/index.tsx | router/index.tsx | Roteamento | Baixa (config única) | Média | react-router-dom, App, ProtectedRoute, todas as páginas |
| ProtectedRoute | router/ProtectedRoute.tsx | Roteamento | Alta | Baixa | auth store, react-router-dom |
| Forbidden | pages/Forbidden.tsx | Página | Baixa (página fixa) | Baixa | EmptyState |
| NotFound | pages/NotFound.tsx | Página | Baixa (página fixa) | Baixa | EmptyState |
| HomeRoute | pages/HomeRoute.tsx | Página/roteamento | Baixa | Baixa | auth store, LandingPage, ClientDashboardPage, ProfessionalDashboardPage |
| authStorage | lib/authStorage.ts | Lib | Alta | Baixa | localStorage |
| http | lib/http.ts | Lib | Alta | Média/Alta | axios, auth store, authStorage |
| navConfig | lib/navConfig.ts | Lib | Alta | Baixa | heroicons, auth (Role) |
| queryClient | lib/queryClient.ts | Lib | Alta | Baixa | @tanstack/react-query |
| utils | lib/utils.ts | Lib | Alta | Baixa | Intl API |
| auth store | stores/auth.ts | Store | Alta | Média | Zustand, authStorage |
| commandPalette store | stores/commandPalette.ts | Store | Alta | Baixa | Zustand |
| sidebar store | stores/sidebar.ts | Store | Alta | Baixa | Zustand, persist middleware |
| App | App.tsx | Raiz | Baixa | Baixa | AppShell, bootstrapSession |
| main.tsx | main.tsx | Entry point | Baixa | Baixa | React DOM, QueryClientProvider, RouterProvider |

---

### Capítulo: 01-auth

## Domínio: Auth (Autenticação)

> Documento de auditoria técnica pré-redesign. Descreve o estado atual do código em `frontend/src/features/auth/` e arquivos relacionados (`stores/auth.ts`, `router/ProtectedRoute.tsx`, `App.tsx`, `lib/authStorage.ts`). Não contém sugestões de melhoria — apenas descrição factual do comportamento existente.

### Visão geral da feature

Diretório: `frontend/src/features/auth/`

```
features/auth/
├── api.ts                      # chamadas HTTP cruas ao backend
├── bootstrap.ts                # restauração de sessão no boot do app
├── queries.ts                  # hooks react-query (mutations)
├── schemas.ts                  # schemas zod de validação de formulário
├── auth.test.tsx               # testes de integração (não documentado aqui)
├── components/
│   └── AuthField.tsx           # input de formulário com label + erro
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── ForgotPasswordPage.tsx
    ├── ResetPasswordPage.tsx
    └── VerifyEmailPage.tsx
```

Arquivos correlatos fora da feature, usados por ela:
- `frontend/src/stores/auth.ts` — store Zustand (`useAuthStore`) com `user`, `accessToken`, `refreshToken`, `isBootstrapping`, `setAuth`, `clear`, `finishBootstrapping`.
- `frontend/src/lib/authStorage.ts` — persistência do `refreshToken` em `localStorage` (chave `auth.refreshToken`), com `getStoredRefreshToken`, `setStoredRefreshToken`, `clearStoredRefreshToken`, cada função protegida por `try/catch`.
- `frontend/src/lib/http.ts` — cliente HTTP (axios ou similar) usado por `api.ts` via `http.post`.
- `frontend/src/router/ProtectedRoute.tsx` — guarda de rotas autenticadas.
- `frontend/src/router/index.tsx` — definição de rotas via `createBrowserRouter`.
- `frontend/src/App.tsx` — dispara `bootstrapSession()` no mount.
- `frontend/src/components/ui/Card.tsx` e `frontend/src/components/ui/Button.tsx` — componentes de UI compartilhados usados em todas as telas de auth.

Nenhuma das 5 páginas de auth utiliza o componente `Toast` (`components/ui/Toast.tsx`). Feedback de sucesso/erro é sempre exibido como texto inline dentro do `Card` (parágrafo `<p>`), não como toast/notificação flutuante.

Nenhum arquivo da feature auth contém comentários no código-fonte.

---

### `api.ts` — camada de acesso à API

Caminho: `frontend/src/features/auth/api.ts`

Define tipos e o objeto `authApi` com 8 métodos, todos usando o helper `http` (`http.post`) importado de `../../lib/http`.

#### Tipos exportados

- `PublicUser`: `{ id: string; email: string; name: string; role: Role }` — `Role` importado de `../../stores/auth` (`'client' | 'professional' | 'admin'`).
- `AuthResult`: `{ accessToken: string; refreshToken: string; user: PublicUser }`.

#### Métodos de `authApi`

| Método | Endpoint | Verbo | Payload | Retorno |
|---|---|---|---|---|
| `login(payload)` | `/auth/login` | POST | `{ email: string; password: string }` | `AuthResult` |
| `register(payload)` | `/auth/register` | POST | `{ name, email, phone, password, role: 'client' \| 'professional' }` | `AuthResult` |
| `refresh(refreshToken)` | `/auth/refresh` | POST | `{ refreshToken: string }` | `AuthResult` |
| `logout(refreshToken)` | `/auth/logout` | POST | `{ refreshToken: string }` | `void` |
| `forgotPassword(email)` | `/auth/password/forgot` | POST | `{ email: string }` | `void` |
| `resetPassword(payload)` | `/auth/password/reset` | POST | `{ token: string; password: string }` | `void` |
| `verifyEmail(token)` | `/auth/verify-email` | POST | `{ token: string }` | `void` |
| `skipEmailVerification()` | `/auth/verify-email/skip` | POST | (sem corpo) | `void` |

Observações:
- `register` no schema/payload de `authApi.register` aceita apenas `role: 'client' | 'professional'` — o valor `'admin'` do tipo `Role` nunca é enviado no cadastro (consistente com o formulário, que só oferece essas duas opções).
- `logout` está definido em `api.ts` mas não é chamado por nenhuma das páginas documentadas nesta auditoria (não há botão de logout dentro da feature auth).

---

### `bootstrap.ts` — restauração de sessão no carregamento do app

Caminho: `frontend/src/features/auth/bootstrap.ts`

Função única exportada: `bootstrapSession(): Promise<void>`.

#### Comportamento passo a passo

1. É invocada em `App.tsx`, dentro de um `useEffect(() => { void bootstrapSession(); }, [])` — ou seja, executa uma única vez, na montagem do componente raiz `App`, para todas as rotas (públicas e protegidas), pois `App` envolve toda a árvore de rotas via `<Outlet />`.
2. Lê do store (`useAuthStore.getState()`) as funções `finishBootstrapping`, `setAuth`, `clear`.
3. Lê o refresh token persistido via `getStoredRefreshToken()` (localStorage, chave `auth.refreshToken`).
4. **Se não houver refresh token armazenado**: chama `finishBootstrapping()` imediatamente e retorna — usuário permanece deslogado (`user: null`), sem chamada de rede.
5. **Se houver refresh token**: chama `authApi.refresh(refreshToken)` (POST `/auth/refresh`).
   - Em caso de sucesso: chama `setAuth(result.user, result.accessToken, result.refreshToken)`, restaurando a sessão (usuário fica autenticado, com novo access/refresh token armazenados).
   - Em caso de erro (catch genérico, sem inspecionar o tipo de erro): chama `clear()`, que remove o refresh token do localStorage e zera `user`, `accessToken`, `refreshToken` no store.
   - Em ambos os casos (`finally`): chama `finishBootstrapping()`.

#### Papel de `isBootstrapping` no roteamento

- O store inicia com `isBootstrapping: true`.
- `ProtectedRoute` (`router/ProtectedRoute.tsx`) lê `isBootstrapping`: enquanto `true`, retorna `null` (nada é renderizado — não há spinner/skeleton neste componente, apenas ausência de conteúdo).
- Somente após `finishBootstrapping()` (chamado ao final do bootstrap, com ou sem sucesso) o `ProtectedRoute` decide entre renderizar `<Outlet />`, redirecionar para `/login` (`!user`) ou para `/forbidden` (role não permitida).
- As páginas de auth (login, register, etc.) não são protegidas por `ProtectedRoute` e portanto renderizam independentemente do estado de `isBootstrapping`.

---

### `queries.ts` — hooks de mutation (React Query)

Caminho: `frontend/src/features/auth/queries.ts`

Todos os hooks usam `useMutation` do `@tanstack/react-query`. Nenhum usa `useQuery` (não há dados de auth buscados via GET/cache nesta feature).

| Hook | `mutationFn` | `onSuccess` |
|---|---|---|
| `useLogin()` | `authApi.login` | chama `setAuth(user, accessToken, refreshToken)` do `useAuthStore` |
| `useRegister()` | `authApi.register` | chama `setAuth(user, accessToken, refreshToken)` do `useAuthStore` |
| `useForgotPassword()` | `authApi.forgotPassword` | nenhum (sem `onSuccess`) |
| `useResetPassword()` | `authApi.resetPassword` | nenhum (sem `onSuccess`) |

Não existe `useVerifyEmail()` exportado de `queries.ts` — a verificação de e-mail em `VerifyEmailPage.tsx` chama `authApi.verifyEmail` e `authApi.skipEmailVerification` diretamente (sem passar por react-query), usando `useState`/`useEffect` manuais.

Cada hook retorna o objeto padrão do `useMutation` (`mutate`, `mutateAsync`, `isPending`, `isError`, `isSuccess`, `data`, `error`, etc.), consumido pelas páginas correspondentes.

---

### `schemas.ts` — validação de formulários (Zod)

Caminho: `frontend/src/features/auth/schemas.ts`

Usado em conjunto com `react-hook-form` + `@hookform/resolvers/zod` (`zodResolver`) em todas as páginas de formulário. Todos os formulários usam `noValidate` no `<form>`, delegando toda validação nativa do HTML5 ao Zod/RHF.

#### `loginSchema`

| Campo | Tipo Zod | Regra | Mensagem de erro |
|---|---|---|---|
| `email` | `z.string().email()` | formato de e-mail | `E-mail invalido` |
| `password` | `z.string().min(8)` | mínimo 8 caracteres | `Minimo 8 caracteres` |

Tipo inferido exportado: `LoginForm`.

#### `registerSchema`

Objeto Zod com `.refine()` adicional no nível do objeto.

| Campo | Tipo Zod | Regra | Mensagem de erro |
|---|---|---|---|
| `name` | `z.string().min(2)` | mínimo 2 caracteres | `Informe o nome` |
| `email` | `z.string().email()` | formato de e-mail | `E-mail invalido` |
| `phone` | `z.string().min(10)` | mínimo 10 caracteres (sem regex/máscara de formato) | `Telefone invalido` |
| `password` | `z.string().min(8)` | mínimo 8 caracteres | `Minimo 8 caracteres` |
| `confirmPassword` | `z.string().min(8)` | mínimo 8 caracteres | (mensagem padrão do zod, não customizada nesse campo isoladamente) |
| `role` | `z.enum(['client', 'professional'])` | apenas esses dois valores | (mensagem padrão do zod) |

Refine de objeto: `data.password === data.confirmPassword`, mensagem `As senhas nao conferem`, erro atribuído ao `path: ['confirmPassword']` (aparece embaixo do campo "Confirmar senha").

Tipo inferido exportado: `RegisterForm`.

#### `forgotPasswordSchema`

| Campo | Tipo Zod | Regra | Mensagem de erro |
|---|---|---|---|
| `email` | `z.string().email()` | formato de e-mail | `E-mail invalido` |

Tipo inferido exportado: `ForgotPasswordForm`.

#### `resetPasswordSchema`

| Campo | Tipo Zod | Regra | Mensagem de erro |
|---|---|---|---|
| `token` | `z.string().min(1)` | não vazio | (mensagem padrão do zod) |
| `password` | `z.string().min(8)` | mínimo 8 caracteres | `Minimo 8 caracteres` |
| `confirmPassword` | `z.string().min(8)` | mínimo 8 caracteres | (mensagem padrão do zod) |

Refine de objeto: `data.password === data.confirmPassword`, mensagem `As senhas nao conferem`, erro atribuído ao `path: ['confirmPassword']`.

Tipo inferido exportado: `ResetPasswordForm`.

Nenhum schema valida força de senha além do comprimento mínimo (não há regra de maiúscula/número/símbolo). Nenhuma máscara de input é aplicada a telefone (campo texto livre validado apenas por comprimento mínimo).

---

### Componente `AuthField`

Caminho: `frontend/src/features/auth/components/AuthField.tsx`

Componente de input de formulário compartilhado por **todas** as páginas de auth (Login, Register, ForgotPassword, ResetPassword). Não é usado em `VerifyEmailPage` (que não tem formulário).

#### Assinatura

```ts
interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
```

- É um `forwardRef<HTMLInputElement, AuthFieldProps>`, permitindo o uso direto do padrão `register('campo')` do react-hook-form (que injeta `ref`, `name`, `onChange`, `onBlur`).
- Estende todos os atributos nativos de `<input>` (`type`, `placeholder`, `autoComplete`, etc. podem ser passados via spread `{...props}`), mas nenhuma das páginas passa `placeholder` — todos os campos são exibidos sem texto de exemplo dentro do input, apenas com `label` acima.

#### Estrutura visual (JSX)

```
<label class="flex flex-col gap-1 text-sm">
  <span class="font-medium text-ink">{label}</span>
  <input class="rounded-sm border border-surface px-3 py-2 text-ink focus:border-primary focus:outline-none" {...props} />
  {error && <span class="text-xs text-accent">{error}</span>}
</label>
```

- Label e input são empilhados verticalmente (`flex flex-col gap-1`), com o `<label>` envolvendo todo o conjunto (rótulo + input + erro), o que amplia a área clicável para foco no input.
- Não há variantes de tamanho (`sm`/`md`) nem variantes visuais (não há prop `variant`) — existe apenas uma aparência fixa.
- Não há ícones (nem à esquerda nem à direita do input); não há botão de "mostrar/ocultar senha" nos campos `type="password"`.
- Estado de erro: quando `error` é uma string não vazia, um `<span>` de texto pequeno (`text-xs`) na cor `text-accent` aparece abaixo do input. Quando `error` é `undefined`, nada é renderizado (sem reserva de espaço fixo — o layout pode "pular" quando o erro aparece/desaparece).
- Não há estilo de borda vermelha ou destaque visual no próprio `<input>` quando há erro — apenas a borda padrão (`border-surface`) e o foco (`focus:border-primary`); a única indicação de erro é o texto abaixo.
- O campo em si não expõe `aria-invalid` nem `aria-describedby` vinculando o erro ao input (não há atributos de acessibilidade explícitos além dos nativos herdados via spread).

---

### Tela: Login

- **Arquivo**: `frontend/src/features/auth/pages/LoginPage.tsx`
- **Rota**: `/login` (definida em `router/index.tsx`, filha direta de `<App />`, fora de `ProtectedRoute`)
- **Quem acessa**: qualquer visitante, autenticado ou não (rota pública, sem guarda). Não há redirecionamento automático para fora do `/login` caso o usuário já esteja autenticado.

#### Objetivo

Autenticar um usuário existente via e-mail e senha, obtendo `accessToken`/`refreshToken` e populando `useAuthStore`.

#### Fluxo do usuário

1. Usuário chega em `/login` (link direto, redirecionamento de `ProtectedRoute`, ou navegação manual).
2. Preenche e-mail e senha.
3. Submete o formulário (botão "Entrar" ou tecla Enter dentro do form).
4. Validação client-side (Zod) roda antes do envio; se inválida, mensagens aparecem abaixo dos campos e a submissão HTTP não ocorre.
5. Se válida, `login.mutateAsync(values)` dispara POST `/auth/login`.
6. Enquanto pendente, botão exibe "Entrando..." e fica `disabled`.
7. Sucesso: `setAuth` é chamado (dentro do `onSuccess` do hook `useLogin`), e a página então chama `navigate('/')`, levando o usuário à Home.
8. Erro: mensagem fixa "Credenciais invalidas" aparece acima do botão (não distingue tipos de erro — mesma mensagem para qualquer falha de rede/servidor).
9. Usuário pode alternativamente clicar em "Criar conta" (vai para `/register`) ou "Esqueci a senha" (vai para `/forgot-password`).

#### Hierarquia visual e layout

- Container externo: `<div class="mx-auto max-w-sm p-6">` — centraliza horizontalmente, largura máxima pequena (`max-w-sm`, 24rem), padding de 1.5rem.
- Dentro: um único `Card` (padding interno `p-6`, fundo `bg-bg`, cantos `rounded-lg`).
- Dentro do Card, um `<form>` em coluna (`flex flex-col gap-4`), ordem:
  1. `<h1>` "Entrar" (`text-xl font-semibold`)
  2. `AuthField` E-mail (`type="email"`)
  3. `AuthField` Senha (`type="password"`)
  4. Mensagem de erro condicional (`Credenciais invalidas`)
  5. `Button` de submit ("Entrar" / "Entrando...")
  6. Linha de links secundários em `flex justify-between`: "Criar conta" (esquerda) e "Esqueci a senha" (direita)

Não há cabeçalho de app, logo, imagem ilustrativa ou qualquer elemento fora do Card nesta tela — é uma tela minimalista, apenas o formulário centralizado na viewport.

#### Componentes usados

- Próprios da feature: `AuthField` (x2)
- Compartilhados (`components/ui`): `Card`, `Button`
- Roteamento: `Link` (react-router-dom) x2, `useNavigate`

#### Estados possíveis

| Estado | Gatilho | Efeito visual |
|---|---|---|
| Inicial/vazio | carregamento da página | campos vazios, sem erros, botão "Entrar" habilitado |
| Erro de validação (campo) | submit com e-mail inválido ou senha < 8 chars | texto de erro abaixo do campo (`AuthField error`) |
| Carregando (`login.isPending`) | após submit válido, aguardando resposta | botão desabilitado, texto muda para "Entrando..." |
| Erro de API (`login.isError`) | POST `/auth/login` falha | parágrafo `text-sm text-accent` "Credenciais invalidas" acima do botão |
| Sucesso | POST `/auth/login` resolve | `setAuth` no store + `navigate('/')` (nenhuma tela de sucesso é exibida, há redirecionamento imediato) |

#### API

- `POST /auth/login` — payload `{ email, password }` — via `authApi.login`, chamado pelo hook `useLogin()` (react-query `useMutation`).

#### Hooks utilizados

- `useNavigate()` (react-router-dom)
- `useLogin()` (local, `queries.ts`, encapsula `useMutation`)
- `useForm<LoginForm>({ resolver: zodResolver(loginSchema) })` (react-hook-form)
- Dentro do `useForm`: `register`, `handleSubmit`, `formState: { errors }`

#### Validações (via `loginSchema`)

Ver tabela completa na seção `schemas.ts` acima (`email` formato válido; `password` mínimo 8 caracteres).

#### Navegação / links

- "Criar conta" → `/register`
- "Esqueci a senha" → `/forgot-password`
- Sucesso de login → `navigate('/')` (Home)

#### Toasts

Nenhum. Feedback de erro é texto inline no formulário.

#### Responsividade (classes Tailwind observadas)

- `mx-auto max-w-sm p-6` no container raiz — mesmo padding/largura em qualquer breakpoint (não há classes responsivas `sm:`/`md:`/`lg:` nesta página; o layout é fixo e já compacto o suficiente para mobile por padrão, sem breakpoints adicionais).
- Botão "Entrar" não tem `w-full` explícito nesta página (ao contrário do botão "Ignorar" em VerifyEmailPage); ocupa a largura conforme o `flex` do form pai permite (o `Button` em si é `inline-flex`, então sua largura tende ao conteúdo, a menos que o form force `w-full` via outro mecanismo — não há classe de largura no `<Button>` desta tela).

#### Complexidade e dependências

Baixa complexidade: um único formulário de 2 campos, uma mutation, uma navegação condicional. Dependências: `react-hook-form`, `@hookform/resolvers/zod`, `zod`, `@tanstack/react-query`, `react-router-dom`, store Zustand `useAuthStore` (indireto via `useLogin`).

---

### Tela: Register (Criar conta)

- **Arquivo**: `frontend/src/features/auth/pages/RegisterPage.tsx`
- **Rota**: `/register`
- **Quem acessa**: qualquer visitante (rota pública).

#### Objetivo

Criar uma nova conta de usuário com papel (`role`) `client` ou `professional`, autenticando-o automaticamente em seguida.

#### Fluxo do usuário

1. Usuário chega em `/register` (ex.: clicando em "Criar conta" no Login).
2. Preenche Nome, E-mail, Telefone, Senha, Confirmar senha, e escolhe Perfil (select: Cliente/Profissional, padrão "Cliente").
3. Submete o formulário.
4. Validação Zod client-side roda primeiro (incluindo checagem de senha == confirmação).
5. Se válido, `registerMutation.mutateAsync({ name, email, phone, password, role })` dispara POST `/auth/register` (note: `confirmPassword` é validado no form mas **não enviado** ao backend — é descartado do payload).
6. Durante a chamada, botão mostra "Enviando..." e fica desabilitado.
7. Sucesso: `setAuth` roda dentro do `onSuccess` de `useRegister` (usuário já fica autenticado/logado após o cadastro), e a página chama `navigate('/verify-email')`.
8. Erro: mensagem fixa "Nao foi possivel criar a conta" acima do botão.
9. Link "Já tenho conta" leva a `/login`.

#### Hierarquia visual e layout

- Mesmo padrão de container: `mx-auto max-w-sm p-6` > `Card` > `form flex flex-col gap-4`.
- Ordem interna do formulário:
  1. `<h1>` "Criar conta"
  2. `AuthField` Nome
  3. `AuthField` E-mail (`type="email"`)
  4. `AuthField` Telefone
  5. `AuthField` Senha (`type="password"`)
  6. `AuthField` Confirmar senha (`type="password"`)
  7. Bloco de seleção de Perfil: `<label>` próprio (não usa `AuthField`), contendo `<span>` "Perfil" + `<select>` nativo com opções "Cliente" (`value="client"`) e "Profissional" (`value="professional"`)
  8. Mensagem de erro condicional da mutation
  9. `Button` de submit ("Cadastrar" / "Enviando...")
  10. Link "Já tenho conta"

O seletor de perfil é um `<select>` HTML nativo estilizado manualmente (`rounded-sm border border-surface px-3 py-2 text-ink`), não reutiliza o `AuthField` nem nenhum componente `Select` de `components/ui` (não existe um componente `Select` no diretório `ui/` listado).

#### Componentes usados

- Próprios: `AuthField` (x5)
- Compartilhados: `Card`, `Button`
- Nativo: `<select>` (sem componente wrapper)
- Roteamento: `Link`, `useNavigate`

#### Estados possíveis

| Estado | Gatilho | Efeito visual |
|---|---|---|
| Inicial | carregamento | campos vazios exceto `role` (default `client`, "Cliente" pré-selecionado) |
| Erro de validação por campo | submit inválido | erro abaixo do respectivo `AuthField` (nome, e-mail, telefone, senha, confirmar senha); `role` não tem exibição de erro na página (embora o schema valide o enum) |
| Carregando (`registerMutation.isPending`) | aguardando resposta da API | botão desabilitado, texto "Enviando..." |
| Erro de API (`registerMutation.isError`) | POST `/auth/register` falha | texto "Nao foi possivel criar a conta" |
| Sucesso | POST resolve | `setAuth` + `navigate('/verify-email')` |

#### API

- `POST /auth/register` — payload `{ name, email, phone, password, role }` (sem `confirmPassword`) — via `authApi.register`, através de `useRegister()`.

#### Hooks utilizados

- `useNavigate()`
- `useRegister()` (local)
- `useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'client' } })`
- `register`, `handleSubmit`, `formState: { errors }`

#### Validações (via `registerSchema`)

Ver tabela completa acima. Resumo dos campos do formulário:

| Campo | Obrigatório | Tipo input | Regra |
|---|---|---|---|
| name | sim | text | mínimo 2 caracteres |
| email | sim | email | formato válido |
| phone | sim | text | mínimo 10 caracteres, sem máscara |
| password | sim | password | mínimo 8 caracteres |
| confirmPassword | sim | password | mínimo 8 caracteres + deve ser igual a `password` |
| role | sim (default `client`) | select | enum `client`/`professional` |

#### Navegação / links

- "Já tenho conta" → `/login`
- Sucesso de cadastro → `navigate('/verify-email')`

#### Toasts

Nenhum.

#### Responsividade

Mesmo padrão fixo `mx-auto max-w-sm p-6`, sem classes responsivas adicionais. Formulário com 6 campos empilhados verticalmente (`gap-4`), sem grid de 2 colunas em telas maiores.

#### Complexidade e dependências

Complexidade média (mais campos e uma regra de confirmação de senha via `refine`). Mesmas dependências de bibliotecas da tela de Login, mais o `<select>` nativo para escolha de papel.

---

### Tela: Forgot Password (Recuperar senha)

- **Arquivo**: `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- **Rota**: `/forgot-password`
- **Quem acessa**: qualquer visitante (rota pública), tipicamente chegando pelo link "Esqueci a senha" do Login.

#### Objetivo

Solicitar o envio de instruções/link de redefinição de senha para um e-mail informado.

#### Fluxo do usuário

1. Usuário chega em `/forgot-password`.
2. Informa e-mail.
3. Submete o formulário.
4. Validação Zod (formato de e-mail) roda antes do envio.
5. `forgot.mutate(values.email)` dispara POST `/auth/password/forgot` (nota: usa `mutate`, não `mutateAsync`, e não há `await`/`.then` posterior — é fire-and-forget do ponto de vista do componente, sem navegação após sucesso).
6. Durante a chamada, botão fica desabilitado (não muda de texto — permanece "Enviar", sem estado textual "Enviando...").
7. Em sucesso (`forgot.isSuccess`), aparece mensagem inline: "Se o e-mail existir, enviamos as instrucoes." — mensagem intencionalmente genérica que não confirma nem nega a existência da conta.
8. Não há tratamento visível de erro (`isError`) nesta página — se a mutation falhar, nenhuma mensagem de erro é exibida ao usuário.
9. Não há navegação automática nem link de volta ao login nesta tela.

#### Hierarquia visual e layout

- Container: `mx-auto max-w-sm p-6` > `Card` > `form flex flex-col gap-4`.
- Ordem:
  1. `<h1>` "Recuperar senha"
  2. `AuthField` E-mail (`type="email"`)
  3. Mensagem de sucesso condicional (`text-sm text-primary`)
  4. `Button` "Enviar"

Tela com o formulário mais simples de toda a feature (um único campo). Não possui links de navegação (nem "voltar ao login").

#### Componentes usados

- Próprios: `AuthField` (x1)
- Compartilhados: `Card`, `Button`

#### Estados possíveis

| Estado | Gatilho | Efeito visual |
|---|---|---|
| Inicial | carregamento | campo vazio, sem mensagens |
| Erro de validação | e-mail com formato inválido | erro abaixo do `AuthField` |
| Carregando (`forgot.isPending`) | aguardando resposta | botão desabilitado (texto permanece "Enviar") |
| Sucesso (`forgot.isSuccess`) | POST resolve | mensagem "Se o e-mail existir, enviamos as instrucoes." exibida acima do botão, formulário permanece na tela (campo de e-mail não é limpo nem desabilitado) |
| Erro de API | POST falha | nenhum feedback visual específico (não tratado) |

#### API

- `POST /auth/password/forgot` — payload `{ email }` — via `authApi.forgotPassword`, através de `useForgotPassword()`.

#### Hooks utilizados

- `useForgotPassword()` (local)
- `useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })`
- `register`, `handleSubmit`, `formState: { errors }`

Não usa `useNavigate` (não há redirecionamento nesta página).

#### Validações (via `forgotPasswordSchema`)

| Campo | Obrigatório | Tipo input | Regra | Mensagem de erro |
|---|---|---|---|---|
| email | sim | email | formato válido | `E-mail invalido` |

#### Navegação / links

Nenhum link de navegação presente na página (nem para `/login` nem para `/register`).

#### Toasts

Nenhum (mensagem de sucesso é texto inline permanente no Card).

#### Responsividade

Mesmo padrão `mx-auto max-w-sm p-6` sem breakpoints adicionais.

#### Complexidade e dependências

Baixíssima complexidade: 1 campo, 1 mutation sem `onSuccess` customizado, sem tratamento de erro de API, sem navegação.

---

### Tela: Reset Password (Nova senha)

- **Arquivo**: `frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- **Rota**: `/reset-password` (espera query string `?token=...`)
- **Quem acessa**: qualquer visitante que chegue com um link contendo token de redefinição (enviado por e-mail via fluxo de Forgot Password); rota pública, sem guarda de autenticação.

#### Objetivo

Permitir a definição de uma nova senha a partir de um token de redefinição recebido por e-mail.

#### Fluxo do usuário

1. Usuário abre o link `/reset-password?token=XYZ` a partir do e-mail recebido.
2. `useSearchParams()` extrai `token` da URL.
3. **Se `token` for `null`/ausente**: a página renderiza um `Card` alternativo (early return) somente com título "Nova senha" e mensagem de erro "Link de redefinicao invalido ou incompleto." — sem formulário algum, sem botão, sem link de volta.
4. **Se `token` existir**: formulário é renderizado com o token pré-preenchido em um campo oculto (`<input type="hidden" {...register('token')} />`, valor inicial vindo de `defaultValues: { token: token ?? '' }`).
5. Usuário preenche Nova senha e Confirmar senha.
6. Submete; validação Zod roda (senha mínima 8 chars + confirmação igual + token não vazio).
7. `reset.mutateAsync({ token, password })` dispara POST `/auth/password/reset` (note: `confirmPassword` não é enviado).
8. Durante a chamada, botão mostra-se desabilitado (texto do botão permanece "Redefinir" — não há variante "Redefinindo...").
9. Sucesso: `navigate('/login')` (redireciona diretamente ao login, sem mensagem de sucesso intermediária).
10. Erro (`reset.isError`): mensagem "Token invalido ou expirado" acima do botão.

#### Hierarquia visual e layout

Duas variantes de renderização:

**Sem token** (`Card className="text-center"`):
1. `<h1>` "Nova senha"
2. `<p class="mt-4 text-sm text-accent">` "Link de redefinicao invalido ou incompleto."

**Com token** (`Card` padrão):
1. `<h1>` "Nova senha"
2. `<input type="hidden">` (token, invisível)
3. `AuthField` Nova senha (`type="password"`)
4. `AuthField` Confirmar senha (`type="password"`)
5. Mensagem de erro condicional
6. `Button` "Redefinir"

#### Componentes usados

- Próprios: `AuthField` (x2, apenas no caminho "com token")
- Compartilhados: `Card`, `Button`
- Roteamento: `useSearchParams`, `useNavigate`

#### Estados possíveis

| Estado | Gatilho | Efeito visual |
|---|---|---|
| Token ausente | `params.get('token')` é `null` | Card somente com título + mensagem de link inválido; nenhum formulário exibido |
| Inicial (com token) | carregamento com token válido na URL | campos de senha vazios, campo hidden preenchido com o token |
| Erro de validação | senha < 8 chars ou confirmação diferente | erro abaixo do respectivo `AuthField` |
| Carregando (`reset.isPending`) | aguardando resposta da API | botão desabilitado, texto permanece "Redefinir" |
| Erro de API (`reset.isError`) | POST `/auth/password/reset` falha | texto "Token invalido ou expirado" acima do botão |
| Sucesso | POST resolve | `navigate('/login')` imediato (sem tela de confirmação) |

#### API

- `POST /auth/password/reset` — payload `{ token, password }` — via `authApi.resetPassword`, através de `useResetPassword()`.

#### Hooks utilizados

- `useSearchParams()` (react-router-dom)
- `useNavigate()`
- `useResetPassword()` (local)
- `useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: token ?? '' } })`
- `register`, `handleSubmit`, `formState: { errors }`

#### Validações (via `resetPasswordSchema`)

| Campo | Obrigatório | Tipo input | Regra | Mensagem de erro |
|---|---|---|---|---|
| token | sim (oculto, preenchido via query string) | hidden | não vazio (`min(1)`) | mensagem padrão do zod (não customizada) |
| password | sim | password | mínimo 8 caracteres | `Minimo 8 caracteres` |
| confirmPassword | sim | password | mínimo 8 caracteres + igual a `password` | `As senhas nao conferem` (no refine) |

#### Navegação / links

- Nenhum link visível na tela (nem no estado "sem token" nem no formulário) além do redirecionamento programático pós-sucesso para `/login`.

#### Toasts

Nenhum.

#### Responsividade

Mesmo container `mx-auto max-w-sm p-6`; no estado sem token, o `Card` recebe adicionalmente `className="text-center"` para centralizar o texto.

#### Complexidade e dependências

Complexidade média-baixa; ramificação condicional relevante é a ausência/presença de `token` na URL, que resulta em duas UIs distintas antes mesmo de qualquer interação do usuário.

---

### Tela: Verify Email (Verificação de e-mail)

- **Arquivo**: `frontend/src/features/auth/pages/VerifyEmailPage.tsx`
- **Rota**: `/verify-email` (opcionalmente com query string `?token=...`)
- **Quem acessa**: qualquer visitante; é o destino de navegação automática após um cadastro bem-sucedido (`RegisterPage` chama `navigate('/verify-email')`), ou acessada diretamente via link de confirmação enviado por e-mail (`?token=...`). Rota pública, sem guarda de autenticação.

Esta é a única página da feature auth que **não** contém um formulário controlado por `react-hook-form`/Zod — é orientada a efeitos (`useEffect`) e estado local (`useState`).

#### Objetivo

Confirmar o e-mail do usuário automaticamente ao abrir um link de verificação com token, ou oferecer a opção de pular a verificação (quando não há token na URL).

#### Fluxo do usuário

**Caminho A — chegada sem token** (ex.: logo após cadastro, redirecionado por `RegisterPage`):
1. Página renderiza mensagem "Abra o link enviado ao seu e-mail."
2. Usuário pode clicar em "Ir para o login" (link) ou em "Ignorar por enquanto" (botão).
3. Ao clicar em "Ignorar por enquanto": `handleSkip()` seta `skipping = true`, chama `authApi.skipEmailVerification()` (POST `/auth/verify-email/skip`), e em qualquer caso (`finally`) volta `skipping = false`; se a chamada não lançar exceção, `navigate('/')` leva à Home. Enquanto isso, o botão mostra "Ignorando..." e fica desabilitado.

**Caminho B — chegada com token** (usuário abriu o link do e-mail de verificação):
1. `useEffect` dispara ao montar (e a cada mudança de `token`), guardado por `requestedTokenRef` para não duplicar a chamada com o mesmo token (proteção contra dupla execução em StrictMode/re-render).
2. Estado muda para `'pending'`, mensagem "Confirmando..." é exibida.
3. Chama `authApi.verifyEmail(token)` (POST `/auth/verify-email`).
4. Sucesso: estado vira `'done'`, mensagem "E-mail confirmado!" em `text-primary`.
5. Erro: estado vira `'error'`, mensagem "Token invalido ou expirado." em `text-accent`.
6. Em ambos os casos, link "Ir para o login" permanece visível; o botão "Ignorar por enquanto" **não** é exibido quando há token (só aparece quando `!token`).

#### Hierarquia visual e layout

`Card className="text-center"`, ordem condicional:
1. `<h1>` "Verificacao de e-mail"
2. Se `!token`: parágrafo "Abra o link enviado ao seu e-mail."
3. Se `status === 'pending'`: parágrafo "Confirmando..."
4. Se `status === 'done'`: parágrafo "E-mail confirmado!" (`text-primary`)
5. Se `status === 'error'`: parágrafo "Token invalido ou expirado." (`text-accent`)
6. `Link` "Ir para o login" (sempre visível, `mt-4 inline-block`)
7. Se `!token`: `Button` variant `ghost`, "Ignorar por enquanto" / "Ignorando..." (`mt-4 w-full`)

Nota: os estados 2–5 não são mutuamente exclusivos por construção de código (são `if`s independentes, não um `switch`), mas na prática `status` só é diferente de `'idle'` quando há `token`, e a condição `!token` só é verdadeira quando não há token — logo, na prática, apenas uma das mensagens de status (2 vs 3/4/5) aparece por vez, nunca simultaneamente.

#### Componentes usados

- Compartilhados: `Card`, `Button` (variant `ghost`)
- Roteamento: `Link`, `useSearchParams`, `useNavigate`
- Não usa `AuthField` (não há input nesta tela)

#### Estados possíveis

| Estado (`status`) | Gatilho | Efeito visual |
|---|---|---|
| `idle` (sem token) | chegada sem query `token` | mensagem "Abra o link enviado ao seu e-mail." + botão "Ignorar por enquanto" habilitado |
| `pending` | `useEffect` dispara chamada com token presente | "Confirmando..." |
| `done` | `authApi.verifyEmail` resolve | "E-mail confirmado!" (verde/primary) |
| `error` | `authApi.verifyEmail` rejeita | "Token invalido ou expirado." (accent) |
| `skipping` (local, separado de `status`) | clique em "Ignorar por enquanto" | botão desabilitado, texto "Ignorando..." |

#### API

- `POST /auth/verify-email` — payload `{ token }` — via `authApi.verifyEmail(token)`, chamado diretamente dentro de `useEffect` (sem react-query).
- `POST /auth/verify-email/skip` — sem payload — via `authApi.skipEmailVerification()`, chamado diretamente dentro do handler `handleSkip` (sem react-query).

#### Hooks utilizados

- `useSearchParams()`, `useNavigate()` (react-router-dom)
- `useState<'idle' | 'pending' | 'done' | 'error'>('idle')` — `status`
- `useState(false)` — `skipping`
- `useRef<string | null>(null)` — `requestedTokenRef`, evita reenvio do mesmo token
- `useEffect` com dependência `[token]`

#### Validações

Não há schema Zod nesta página (não há formulário de input de usuário — o único dado, `token`, vem da URL).

#### Navegação / links

- "Ir para o login" → `/login` (sempre visível)
- "Ignorar por enquanto" (botão, apenas sem token) → em caso de sucesso da chamada, `navigate('/')`

#### Toasts

Nenhum.

#### Responsividade

Container padrão `mx-auto max-w-sm p-6`; `Card` com `text-center`; botão "Ignorar por enquanto" com `w-full` (único botão de toda a feature auth com largura total explícita).

#### Complexidade e dependências

Complexidade média por conter lógica imperativa (efeitos, ref de controle de dupla chamada, múltiplos estados booleanos/enumerados) em vez do padrão declarativo react-hook-form + react-query usado nas demais telas. Não depende de `zod`/`react-hook-form`/`@tanstack/react-query`; depende apenas de `react`, `react-router-dom` e `authApi`.

---

### Componentes de UI compartilhados usados na feature (referência)

#### `Card` (`components/ui/Card.tsx`)

- Props: `interactive?: boolean` (default `false`), `className?`, `children`, além de todos os atributos nativos de `div`.
- Classes base: `rounded-lg bg-bg p-6`; se `interactive`, adiciona `cursor-pointer transition-shadow hover:shadow-hover`.
- Nas telas de auth, `interactive` nunca é usado (é sempre um contêiner estático); `className="text-center"` é aplicado em `ResetPasswordPage` (estado sem token) e `VerifyEmailPage`.

#### `Button` (`components/ui/Button.tsx`)

- Props: `variant?: 'primary' | 'accent' | 'ghost'` (default `primary`), `size?: 'sm' | 'md'` (default `md`), `className?`, `children`, além de atributos nativos de `button`.
- Classes de variante: `primary` = `bg-primary text-bg hover:bg-primary-hover`; `accent` = `bg-accent text-bg hover:bg-accent-hover`; `ghost` = `bg-transparent text-ink border border-surface hover:bg-surface`.
- Classes de tamanho: `sm` = `px-3 py-1.5 text-sm`; `md` = `px-5 py-2.5 text-base`.
- Classes sempre aplicadas: `inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors duration-150`, foco visível via `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`, e `disabled:cursor-not-allowed disabled:opacity-50`.
- Nas telas de auth: Login, Register, ForgotPassword e ResetPassword usam a variante padrão (`primary`, implícita, sem prop `variant`). VerifyEmailPage usa explicitamente `variant="ghost"` no botão "Ignorar por enquanto".
- Nenhuma tela de auth passa `size` explicitamente (todas usam o tamanho padrão `md`).

---

### Resumo tabular de todos os formulários

#### Login

| Campo | Tipo | Obrigatório | Placeholder | Máscara | Validação | Mensagem de erro |
|---|---|---|---|---|---|---|
| email | email | sim | — | não | `z.string().email()` | E-mail invalido |
| password | password | sim | — | não | `z.string().min(8)` | Minimo 8 caracteres |

Botão: "Entrar" / "Entrando..." (`disabled` durante `isPending`). Mutation: `useLogin()`.

#### Register

| Campo | Tipo | Obrigatório | Placeholder | Máscara | Validação | Mensagem de erro |
|---|---|---|---|---|---|---|
| name | text | sim | — | não | `z.string().min(2)` | Informe o nome |
| email | email | sim | — | não | `z.string().email()` | E-mail invalido |
| phone | text | sim | — | não | `z.string().min(10)` | Telefone invalido |
| password | password | sim | — | não | `z.string().min(8)` | Minimo 8 caracteres |
| confirmPassword | password | sim | — | não | `z.string().min(8)` + igual a `password` (refine) | As senhas nao conferem |
| role | select | sim (default `client`) | — | n/a | `z.enum(['client','professional'])` | (padrão zod, não exibida na tela) |

Botão: "Cadastrar" / "Enviando...". Mutation: `useRegister()`.

#### Forgot Password

| Campo | Tipo | Obrigatório | Placeholder | Máscara | Validação | Mensagem de erro |
|---|---|---|---|---|---|---|
| email | email | sim | — | não | `z.string().email()` | E-mail invalido |

Botão: "Enviar" (sem texto alternado durante loading). Mutation: `useForgotPassword()`.

#### Reset Password

| Campo | Tipo | Obrigatório | Placeholder | Máscara | Validação | Mensagem de erro |
|---|---|---|---|---|---|---|
| token | hidden | sim | — | não | `z.string().min(1)` | (padrão zod, não exibida na tela) |
| password | password | sim | — | não | `z.string().min(8)` | Minimo 8 caracteres |
| confirmPassword | password | sim | — | não | `z.string().min(8)` + igual a `password` (refine) | As senhas nao conferem |

Botão: "Redefinir" (sem texto alternado durante loading). Mutation: `useResetPassword()`.

---

### Relação com `stores/auth.ts` (contexto, não parte da área auditada em detalhe)

```ts
type Role = 'client' | 'professional' | 'admin';
type AuthUser = { id: string; role: Role; name?: string; email?: string };

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  setAuth: (user, accessToken, refreshToken?) => void;
  clear: () => void;
  finishBootstrapping: () => void;
}
```

- `refreshToken` inicial do store já é lido de `getStoredRefreshToken()` na criação da store (antes mesmo do `bootstrapSession` rodar).
- `setAuth` só persiste (`setStoredRefreshToken`) um novo refresh token se um for passado ou se já existir um no estado atual (`nextRefreshToken = refreshToken ?? get().refreshToken`).
- `clear()` remove o token do localStorage e zera todos os campos de usuário/tokens, mas não altera `isBootstrapping`.
- Consumida pelas páginas de auth apenas indiretamente, através dos hooks `useLogin`/`useRegister` (que chamam `setAuth`) e do `bootstrapSession` (que chama `setAuth`/`clear`/`finishBootstrapping`).

### Relação com `ProtectedRoute.tsx` (contexto)

```ts
interface ProtectedRouteProps { roles?: Role[]; }
```

- Durante `isBootstrapping === true`: renderiza `null`.
- Sem `user`: `<Navigate to="/login" replace />`.
- Com `user` mas fora de `roles` (quando a prop é passada): `<Navigate to="/forbidden" replace />`.
- Caso contrário: `<Outlet />`.
- Nenhuma das páginas de auth documentadas aqui está dentro de um bloco `ProtectedRoute` em `router/index.tsx`; todas as 5 rotas (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`) são filhas diretas de `<App />`, junto de `/`, `/search`, `/forbidden` e `/professionals/:id`.

---

### Capítulo: 02-landing

## Auditoria Frontend — Domínio: Landing (Home + Busca)

Diretório da feature: `frontend/src/features/landing/`

Arquivos auditados:
- `features/landing/api.ts`
- `features/landing/queries.ts`
- `features/landing/schemas.ts`
- `features/landing/components/CategoryGrid.tsx`
- `features/landing/components/ProfessionalResults.tsx`
- `features/landing/components/SearchBar.tsx`
- `features/landing/components/SearchFilters.tsx`
- `features/landing/pages/LandingPage.tsx`
- `features/landing/pages/SearchPage.tsx`
- `pages/HomeRoute.tsx` (fora da feature, decide o que renderizar em `/`)
- Arquivos relacionados inspecionados para contexto: `features/professional/components/ProfessionalCard.tsx`, `features/professional/queries.ts` (hook `useCategories`), `features/favorites/queries.ts` (hook `useFavoriteIds`), `router/index.tsx`.

---

### Roteamento e decisão Home vs Dashboard (`pages/HomeRoute.tsx`)

Arquivo: `frontend/src/pages/HomeRoute.tsx`. É o `element` associado à rota `path: '/'` em `router/index.tsx` (linha 32: `{ path: '/', element: <HomeRoute /> }`).

Comportamento:
- Lê `user` do `useAuthStore` (Zustand), via `useAuthStore((state) => state.user)`.
- Se `user?.role === 'client'` → renderiza `ClientDashboardPage` (feature `dashboard`).
- Se `user?.role === 'professional'` → renderiza `ProfessionalDashboardPage` (feature `professional-dashboard`).
- Caso contrário (usuário não logado, ou logado sem role reconhecida, ou `user` `undefined`/`null`) → renderiza `LandingPage`.

Não há redirecionamento de rota (via `<Navigate>` ou `navigate()`) — a troca é puramente por renderização condicional do componente na mesma URL `/`. Ou seja, a URL permanece `/` tanto para visitante quanto para usuário logado sem role reconhecida; apenas o conteúdo muda dependendo do papel do usuário armazenado no client-side auth store. Não há chamada de API dentro do próprio `HomeRoute` — a decisão depende inteiramente do estado já carregado no `useAuthStore`.

A rota `/search` é registrada separadamente e sempre aponta para `SearchPage` (linha 33: `{ path: '/search', element: <SearchPage /> }`), sem checagem de autenticação — pública para qualquer visitante, logado ou não.

---

### Tela: LandingPage

- **Nome do componente**: `LandingPage` (default export)
- **Arquivo**: `frontend/src/features/landing/pages/LandingPage.tsx`
- **Rota**: `/` (renderizada apenas quando `HomeRoute` decide não mostrar um dashboard, isto é, visitante anônimo ou usuário sem `role` de `client`/`professional`)
- **Quem acessa**: Público em geral, sem exigência de autenticação. Também é o que um usuário logado sem role reconhecida veria.
- **Objetivo**: Landing page institucional/comercial da plataforma — apresentar a proposta de valor, oferecer busca rápida de profissionais e navegação por categorias de serviço.
- **Descrição funcional**: Página estática (sem chamadas de API próprias no componente da página; as chamadas ocorrem dentro do componente filho `CategoryGrid`). Composta por duas seções: um hero com título, subtítulo, barra de busca e lista de "trust points"; e uma seção de "Categorias em destaque" que renderiza o grid de categorias.

#### Fluxo do usuário
1. Usuário chega em `/` (sem estar logado, ou logado sem role client/professional).
2. Vê o hero com headline "Encontre o profissional certo" e subtítulo explicativo.
3. Pode preencher a `SearchBar` (busca livre `q`, cidade, UF) e submeter — isso navega para `/search?q=...&city=...&state=...` via `useNavigate` do react-router.
4. Alternativamente, pode rolar até "Categorias em destaque" e clicar num card de categoria — isso navega para `/search?categoryId=<uuid>`.
5. Em ambos os casos o usuário chega em `SearchPage`, que lê os parâmetros da URL e dispara a busca.

#### Hierarquia visual / layout
Estrutura raiz: `<div className="flex flex-col">` contendo duas `<section>` empilhadas verticalmente (sem grid lateral).

**Seção 1 — Hero** (`<section className="bg-surface px-6 py-16 sm:py-24">`):
- Container interno `mx-auto flex max-w-2xl flex-col items-center gap-6 text-center` (conteúdo centralizado, largura máxima 2xl).
- `<h1>` — "Encontre o profissional certo", `text-4xl font-bold tracking-tight text-ink text-balance sm:text-5xl` (aumenta de 4xl para 5xl em telas `sm+`).
- `<p>` subtítulo — "Publique sua demanda, compare orçamentos e contrate com segurança em um só lugar.", `max-w-xl text-lg text-muted`.
- `<div className="w-full">` envolvendo `<SearchBar />`.
- `<ul>` de "trust points" — lista de 3 itens fixos hardcoded no componente:
  - `ShieldCheckIcon` + "Pagamento protegido"
  - `CheckBadgeIcon` + "Profissionais avaliados"
  - `BoltIcon` + "Resposta rápida"
  - Cada item é um `<li>` em formato de "pill" (`inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink`), ícone Heroicons outline de 3.5 (14px) na cor `text-primary`. Lista usa `flex flex-wrap items-center justify-center gap-2` — quebra em várias linhas conforme espaço disponível, sem breakpoint específico.

**Seção 2 — Categorias em destaque** (`<section className="mx-auto w-full max-w-6xl px-6 py-16">`):
- `<h2>` "Categorias em destaque" (`text-2xl font-bold text-ink`, `mb-6`).
- `<CategoryGrid />` (ver seção de componentes abaixo).

#### Componentes usados
- `SearchBar` (próprio da feature landing)
- `CategoryGrid` (próprio da feature landing)
- Ícones Heroicons outline: `ShieldCheckIcon`, `CheckBadgeIcon`, `BoltIcon` (usados apenas nesta página, array `trustPoints` local ao arquivo)
- Nenhum componente de `components/ui` é usado diretamente em `LandingPage.tsx` (eles aparecem dentro de `CategoryGrid` e `SearchBar`).

#### Estados
- `LandingPage` em si não tem estados de loading/erro/sucesso próprios — é puramente apresentacional/estático. Os estados de loading/erro/empty ficam encapsulados em `CategoryGrid` (ver abaixo).

#### Chamadas de API
- Nenhuma chamada de API direta em `LandingPage.tsx`. A chamada (`useCategories`) acontece dentro de `CategoryGrid`.

#### Hooks usados
- Nenhum hook usado diretamente no componente `LandingPage` (função simples sem `useState`/`useEffect`/react-query). Toda lógica de estado está delegada aos filhos.

#### Filtros/pesquisa/ordenação
- Não há filtros ou ordenação nesta página — apenas o formulário de busca inicial (`SearchBar`), que serve como ponto de entrada para `/search`.

#### Navegação/links
- Submissão do `SearchBar` → `navigate('/search?q=...&city=...&state=...')` (ver detalhes em SearchBar).
- Cada card de `CategoryGrid` é um `<Link>` para `/search?categoryId=<id>`.

#### Responsividade
- Hero: `py-16` em mobile, `sm:py-24` em telas ≥640px (mais respiro vertical).
- Título: `text-4xl` mobile → `sm:text-5xl`.
- `SearchBar` muda de coluna (mobile) para linha (`sm:flex-row`) — ver componente.
- Grid de categorias: `grid-cols-2` (mobile) → `sm:grid-cols-3` → `md:grid-cols-4` → `lg:grid-cols-6` (ver `CategoryGrid`).

#### Complexidade / dependências / observações
- Componente simples, sem estado, sem hooks. Toda a complexidade real está em `CategoryGrid` e `SearchBar`.
- Dependências: `react` (tipo `JSX`), `@heroicons/react/24/outline`, componentes internos `SearchBar` e `CategoryGrid`.
- Observação: o array `trustPoints` é hardcoded no arquivo (não vem de config nem de API) — os 3 itens ("Pagamento protegido", "Profissionais avaliados", "Resposta rápida") são fixos independentemente de dados reais da plataforma.
- Observação: não há tratamento algum para o caso de usuário autenticado sem `role` (`user` existe mas `role` não é `client` nem `professional`) além de cair no fallback de `LandingPage` — o comportamento é do `HomeRoute`, não desta página.

---

### Tela: SearchPage

- **Nome do componente**: `SearchPage` (default export)
- **Arquivo**: `frontend/src/features/landing/pages/SearchPage.tsx`
- **Rota**: `/search`
- **Quem acessa**: Público, sem exigência de autenticação (rota registrada sem guard de auth em `router/index.tsx`).
- **Objetivo**: Permitir busca e filtragem de profissionais cadastrados na plataforma, com resultados em lista de cards.
- **Descrição funcional**: Página com layout de duas colunas (filtros à esquerda / resultados à direita em desktop, empilhado em mobile). Os filtros de busca (texto livre, cidade, UF, categoria) são sincronizados com a query string da URL via `useSearchParams`; já a "ordenação" (`sort`) e o filtro "disponível agora" (`onlyAvailable`) são mantidos apenas em estado local (`useState`), não refletidos na URL.

#### Fluxo do usuário
1. Usuário chega em `/search` diretamente, vindo do `SearchBar` da landing (com `q`/`city`/`state` na URL), de um clique em categoria (`categoryId` na URL), ou navegando direto pela URL/link externo.
2. `SearchPage` lê os `searchParams` da URL e monta o objeto `value: SearchForm` (`q`, `city`, `state`, `state` forçado a uppercase, `categoryId`).
3. Esse `value` é passado tanto para `SearchFilters` (para popular os campos do formulário) quanto para `ProfessionalResults` (como `params` da query de busca).
4. Usuário pode editar qualquer campo do formulário de filtros (`SearchFilters`) — cada mudança dispara `handleChange`, que reconstrói o `URLSearchParams` inteiro a partir do novo `SearchForm` e chama `setSearchParams`, atualizando a URL e, por consequência, refazendo a query de busca (`useSearchProfessionals` depende de `params` no `queryKey`).
5. Usuário pode marcar o checkbox "Disponível agora" — isso atualiza apenas o estado local `onlyAvailable` (não é refletido na URL), e é usado como filtro client-side sobre os itens já retornados pela API.
6. Usuário pode trocar o `<select>` "Ordenar por" (Nota / Preço) — atualiza o estado local `sort` (também não refletido na URL), usado para ordenação client-side dos resultados.
7. `ProfessionalResults` renderiza a lista de `ProfessionalCard`s; cada card linka para `/professionals/:id` (página de perfil público, fora desta feature).

#### Hierarquia visual / layout
Container raiz: `<div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row">` — empilhado verticalmente em mobile, lado a lado (`md:flex-row`) a partir de `md` (≥768px).

- **Coluna de filtros** — `<SearchFilters>` renderizado como `<aside className="flex w-full flex-col gap-4 md:w-64">` (largura total em mobile, fixa em 16rem a partir de `md`).
- **Coluna de resultados** — `<div className="flex-1">`:
  - Barra superior de ordenação: `<div className="mb-4 flex justify-end">` contendo um `<label>` com texto "Ordenar por" e um `<select>` nativo (não é componente `Select` de design system) com opções "Nota" (`value="rating"`) e "Preço" (`value="price"`).
  - `<ProfessionalResults params={value} onlyAvailable={onlyAvailable} sort={sort} />`.

#### Componentes usados
- `SearchFilters` (próprio da feature)
- `ProfessionalResults` (próprio da feature, que por sua vez usa `ProfessionalCard` da feature `professional`)
- `<select>` nativo do HTML para ordenação (não usa componente `Select` de `components/ui`, se existir)
- Nenhum componente `components/ui` é usado diretamente em `SearchPage.tsx` — os usos (Skeleton, EmptyState, Card, etc.) estão dentro dos componentes filhos.

#### Estados
- `SearchPage` em si não tem estado de loading/erro — apenas gerencia estado local de UI (`onlyAvailable`, `sort`) e a leitura/escrita da URL (`searchParams`/`setSearchParams`).
- Estados de loading/erro/vazio dos resultados são tratados dentro de `ProfessionalResults` (ver abaixo).

#### Chamadas de API
- Nenhuma chamada direta em `SearchPage.tsx`. A chamada `useSearchProfessionals(params)` acontece dentro de `ProfessionalResults`, recebendo `params = value` (o `SearchForm` derivado da URL).
- `SearchFilters` também dispara sua própria chamada `useCategories()` internamente (compartilhando cache de query key com `CategoryGrid`, já que ambos usam o mesmo hook).

#### Hooks usados
- `useSearchParams()` (react-router-dom) — leitura/escrita da query string.
- `useState<boolean>(false)` para `onlyAvailable`.
- `useState<SortOption>('rating')` para `sort`.
- (Indiretamente, via filhos: `useSearchProfessionals` — react-query; `useCategories` — react-query; `useFavoriteIds` — react-query.)

#### Filtros, ordenação e pesquisa — detalhamento completo

**Campos refletidos na URL (via `useSearchParams`, controlados por `SearchFilters`):**
| Campo | Chave na URL | Origem/validação | Efeito |
|---|---|---|---|
| Busca livre | `q` | `SearchForm.q` (schema Zod: string 2–120 chars, opcional) | Enviado como `q` para o endpoint de busca (`GET /search/professionals`) |
| Cidade | `city` | `SearchForm.city` (schema Zod: string até 128 chars, opcional) | Enviado como `city` |
| UF (estado) | `state` | Forçado para uppercase no `onChange` e novamente ao ler da URL (`.toUpperCase()`); schema Zod valida regex `^[A-Z]{2}$` **apenas no formulário da SearchBar**, não no `SearchFilters` da SearchPage (ver observações) | Enviado como `state` |
| Categoria | `categoryId` | UUID vindo do `<select>` de `SearchFilters`, populado por `useCategories()` filtrando `isActive` | Enviado como `categoryId` |

Toda alteração em qualquer um desses 4 campos passa por `handleChange` em `SearchPage`, que **reconstrói do zero** o `URLSearchParams` a partir do objeto `SearchForm` completo (não faz merge incremental — os 4 campos são sempre recalculados a partir do `next` recebido).

**Campos NÃO refletidos na URL (estado local apenas, perdidos ao recarregar a página):**
| Campo | Tipo | Efeito | Onde é aplicado |
|---|---|---|---|
| `onlyAvailable` (checkbox "Disponível agora") | boolean, default `false` | Filtra client-side: remove da lista os itens com `isAvailable === false` | Dentro de `ProfessionalResults`, após os dados chegarem da API — **não é enviado como parâmetro de API** |
| `sort` (select "Ordenar por": Nota / Preço) | `'rating' \| 'price'` default `'rating'` | Ordena client-side a lista já carregada: `rating` ordena por `ratingAverage` desc; `price` ordena por `hourlyRate` asc (itens sem `hourlyRate`, ou seja `null`, tratados como `Infinity`, portanto vão para o fim) | Dentro de `ProfessionalResults`, via `Array.sort` — **não é enviado como parâmetro de API**, não há paginação por servidor considerando essa ordenação |

Isso significa que ordenação e disponibilidade operam **apenas sobre a página atual de resultados retornada pela API** (`SearchResponse.items`), não sobre o conjunto total — como a API já pagina (`page`/`limit`/`total`), a ordenação/filtragem client-side é local à página carregada, não ao total de resultados no backend.

#### Navegação/links
- Cada resultado (`ProfessionalCard`) linka para `/professionals/:id` (perfil público do profissional, fora da feature landing).
- Não há paginação de UI nesta tela — embora a API retorne `page`, `limit`, `total` em `SearchResponse`, não há controles de paginação implementados em `SearchPage` nem em `ProfessionalResults` (nenhum `page` é passado para `useSearchProfessionals` a partir do `SearchForm`, então sempre a página default do backend é usada).

#### Responsividade
- Container: `flex flex-col` (mobile) → `md:flex-row` (≥768px), colunas lado a lado a partir de `md`.
- `SearchFilters`: `w-full` (mobile) → `md:w-64` (largura fixa 16rem a partir de `md`).
- Grid de resultados (dentro de `ProfessionalResults`): `grid-cols-1` (mobile) → `sm:grid-cols-2` (≥640px).

#### Complexidade / dependências / observações
- Complexidade moderada: mistura estado de URL (react-router `useSearchParams`) com estado local (`useState`) para diferentes filtros, o que gera uma divisão pouco óbvia entre "o que é persistido na URL" (compartilhável/voltável no histórico) e "o que não é" (`onlyAvailable`, `sort` resetam ao recarregar ou compartilhar link).
- Dependências: `react-router-dom` (`useSearchParams`), componentes `SearchFilters` e `ProfessionalResults`, tipo `SearchForm` de `../schemas`.
- Observação: o schema Zod `searchFormSchema` (usado no `SearchBar` via `zodResolver`) não é aplicado na edição feita por `SearchFilters` — os campos em `SearchFilters` atualizam o estado diretamente via `onChange`, sem validação Zod nem `react-hook-form`; por exemplo, o campo `state` em `SearchFilters` não valida o regex `^[A-Z]{2}$` (apenas aplica `.toUpperCase()`), diferente do formulário da `SearchBar` que usa o resolver Zod completo.
- Observação: parâmetros de paginação (`page`, `limit` do tipo `SearchParams` em `api.ts`) nunca são preenchidos a partir da UI — sempre ficam `undefined`, dependendo do valor default do backend.
- Observação: `categoryId` vindo da URL não passa por nenhuma validação de formato (UUID) antes de ser enviado à API — é lido cru de `searchParams.get('categoryId')`.

---

### Componente: CategoryGrid

- **Arquivo**: `features/landing/components/CategoryGrid.tsx`
- **Props**: nenhuma (componente sem parâmetros).
- **Estado interno**: nenhum `useState` próprio; depende inteiramente do estado de `useCategories()` (react-query).
- **Hooks usados**: `useCategories()` (de `features/professional/queries.ts`) — `useQuery({ queryKey: keys.categories, queryFn: professionalApi.listPublicCategories })`.
- **Eventos/callbacks**: nenhum callback recebido via props; a única interação é navegação via `<Link>`.
- **Lógica de dados**: filtra `data` recebido da API para manter apenas `category.isActive === true` (`categories = data?.filter((category) => category.isActive) ?? []`).
- **Estados de UI**:
  - Loading (`isLoading === true`): renderiza grid de 6 `Skeleton` (componente `components/ui/Skeleton`), cada um `h-28`, no mesmo grid responsivo usado no estado de sucesso.
  - Vazio (`categories.length === 0`, após filtrar `isActive`): renderiza `EmptyState` (`components/ui/EmptyState`) com título "Nenhuma categoria disponível" e descrição "Volte em breve para ver as categorias de serviço."
  - Sucesso: grid de `Card` (componente `components/ui/Card`, prop `interactive`) — um card por categoria ativa.
  - Não há tratamento explícito de estado de erro (`isError`) — se a query falhar, `data` permanece `undefined`, `isLoading` se torna `false`, e o componente cai no branch de "vazio" (`categories.length === 0`), mostrando a mesma `EmptyState` de "Nenhuma categoria disponível" — não há uma mensagem de erro distinta.
- **Ícones**: cada card usa `Squares2X2Icon` (Heroicons outline) fixo — o mesmo ícone genérico para todas as categorias, independente do tipo de categoria (não há campo de ícone vindo da API sendo usado).
- **Variantes**: nenhuma prop de variante; grid sempre no mesmo formato.
- **Layout do card**: `Card` com `interactive` + classes `relative flex flex-col items-center gap-3 bg-surface p-4 text-center`; contém um `<Link>` absoluto (`absolute inset-0`) cobrindo todo o card (torna o card inteiro clicável) com `aria-label={category.name}`; um círculo com ícone (`h-11 w-11 rounded-full bg-bg text-primary`); e o nome da categoria (`text-sm font-semibold text-ink`).
- **Navegação**: cada card linka para `/search?categoryId=${category.id}`.
- **Grid responsivo**: `grid-cols-2` (mobile) → `sm:grid-cols-3` → `md:grid-cols-4` → `lg:grid-cols-6`, `gap-3`.
- **Onde é usado**: apenas em `LandingPage.tsx` (seção "Categorias em destaque").
- **Reutilização**: usa o mesmo hook `useCategories()` que `SearchFilters` (compartilham cache de query, já que `queryKey: keys.categories` é o mesmo objeto de chaves).
- **Complexidade**: baixa. Componente puramente de apresentação com um único hook de dados e um filtro simples.

---

### Componente: SearchBar

- **Arquivo**: `features/landing/components/SearchBar.tsx`
- **Props**: nenhuma.
- **Estado interno**: gerenciado via `react-hook-form` (`useForm<SearchForm>`), com `resolver: zodResolver(searchFormSchema)`. Não há `useState` manual.
- **Hooks usados**: `useForm` (react-hook-form), `useNavigate` (react-router-dom).
- **Validação**: usa `searchFormSchema` de `../schemas` via `zodResolver` — porém o formulário é `noValidate` no HTML (desativa validação nativa do browser) e a validação Zod roda no `handleSubmit`. Campos validados: `q` (2–120 chars, opcional), `city` (até 128 chars, opcional), `state` (regex UF `^[A-Z]{2}$`, opcional; convertido para uppercase antes da validação via `normalizeState` no preprocess do schema). Não inclui campo de categoria (esse formulário não tem seletor de categoria).
- **Evento/callback (`onSubmit`)**: ao submeter, monta um `URLSearchParams` só com os campos preenchidos (`q`, `city`, `state` — nessa ordem, se truthy) e navega para `/search?<querystring>` via `navigate()`. Não inclui `categoryId` (o formulário não tem esse campo). Se a validação Zod falhar (por exemplo, UF inválida), `handleSubmit` do react-hook-form bloqueia a navegação e não propaga erros visualmente — não há exibição de mensagens de erro de validação na tela (nenhum uso de `formState.errors` no JSX).
- **Campos do formulário**:
  - Texto livre (`q`) — input com ícone `MagnifyingGlassIcon` posicionado absolutamente à esquerda (`absolute left-3 top-1/2 -translate-y-1/2`), placeholder "O que voce precisa?" (sem acento, conforme código-fonte).
  - Cidade (`city`) — input texto, placeholder "Cidade".
  - UF (`state`) — input texto, `maxLength={2}`, placeholder "UF", classe `uppercase` (CSS apenas visual) e também usa `setValueAs` no `register` para forçar `.toUpperCase()` no valor armazenado.
  - Botão "Buscar" — `Button` (componente `components/ui/Button`), `type="submit"`.
- **Layout**: `<form>` com `flex flex-col` (mobile, campos empilhados) → `sm:flex-row sm:items-center sm:divide-x sm:divide-surface` (linha única com divisores verticais a partir de `sm`, ≥640px). Em mobile, cidade e UF ficam lado a lado dentro de um `flex gap-2` (`sm:contents` remove esse agrupamento em telas maiores, permitindo que os itens participem diretamente do flex row do form pai).
- **Estados de loading/erro/empty**: não aplicável — este componente apenas navega, não faz fetch de dados nem exibe estado de carregamento.
- **Onde é usado**: apenas em `LandingPage.tsx` (dentro do hero).
- **Reutilização**: não reutilizado em outro lugar (a `SearchPage` usa `SearchFilters`, um componente distinto, e não `SearchBar`).
- **Complexidade**: baixa/moderada — combina react-hook-form + Zod resolver + navegação programática.
- **Observação**: o schema `searchFormSchema` também define `categoryId` (uuid, opcional), mas o `SearchBar` não tem input para esse campo — o campo é validado/tipado no schema, mas nunca usado por este componente especificamente (é usado por `SearchFilters`, que não usa o schema/resolver, apenas o tipo `SearchForm`).

---

### Componente: SearchFilters

- **Arquivo**: `features/landing/components/SearchFilters.tsx`
- **Props**:
  - `value: SearchForm` — valores atuais dos filtros (controlado externamente por `SearchPage`).
  - `onChange: (value: SearchForm) => void` — callback disparado a cada alteração de campo, recebendo o objeto `SearchForm` completo já atualizado (spread do `value` anterior + o campo alterado).
  - `onlyAvailable: boolean` — estado do checkbox "Disponível agora" (controlado externamente).
  - `onOnlyAvailableChange: (value: boolean) => void` — callback do checkbox.
- **Estado interno**: nenhum `useState` — componente totalmente controlado (props/callbacks). Único estado local indireto é o resultado de `useCategories()`.
- **Hooks usados**: `useCategories()` (mesma fonte de `CategoryGrid`).
- **Campos do formulário** (todos nativos HTML, sem react-hook-form nem validação Zod):
  1. "O que você precisa?" — `<input>` texto, ligado a `value.q`.
  2. "Cidade" — `<input>` texto, ligado a `value.city`.
  3. "UF" — `<input>` texto, `maxLength={2}`, força uppercase no `onChange` (`event.target.value.toUpperCase() || undefined`), classe `uppercase`.
  4. "Categoria" — `<select>` nativo, opção default "Todas" (`value=""`), populado com `categories?.filter(isActive)` vindos de `useCategories()`.
  5. "Disponível agora" — `<input type="checkbox">`, controlado por `onlyAvailable`/`onOnlyAvailableChange` (props separadas do `value`/`onChange` de texto — não faz parte do `SearchForm`).
- **Padrão de atualização**: cada campo, ao mudar, chama `onChange({ ...value, <campo>: novoValor || undefined })` — ou seja, campo vazio vira `undefined` (removido da URL pelo pai). Cada alteração dispara uma reconstrução completa da URL no componente pai (`SearchPage.handleChange`), o que por sua vez muda o `queryKey` da query de busca e dispara novo fetch a cada tecla digitada (não há debounce nem "aplicar filtros" — a busca reage a cada `onChange`, inclusive de inputs de texto livre).
- **Layout**: `<aside>` com `flex flex-col gap-4`, `w-full` (mobile) → `md:w-64` (desktop). Cada campo é um `<label>` com `flex flex-col gap-1`; inputs com `rounded-sm border border-surface px-3 py-2 text-sm`.
- **Estados de loading/erro/empty**: não há tratamento explícito de loading/erro para `useCategories()` neste componente — se `categories` for `undefined` (carregando ou erro), o `<select>` simplesmente renderiza apenas a opção "Todas" (o `.filter()`/`.map()` é encadeado com optional chaining `categories?.filter(...).map(...)`, retornando `undefined`/nada renderizado sem crash).
- **Onde é usado**: apenas em `SearchPage.tsx`.
- **Reutilização**: compartilha o hook `useCategories()` com `CategoryGrid` (mesma query key, cache compartilhado via react-query).
- **Complexidade**: baixa/moderada. Sem validação de formato, sem debounce, formulário totalmente controlado via props drilling simples (não usa Context nem lib de formulário).
- **Observação**: diferente de `SearchBar`, este componente não usa `searchFormSchema`/Zod para validar `state` (UF) — aceita qualquer string de até 2 caracteres, sem checar se é uma sigla de UF válida (o `maxLength={2}` é a única restrição, apenas no HTML).
- **Observação**: o checkbox "Disponível agora" e o parâmetro `sort` (gerenciado na página, não neste componente) não têm reflexo na URL, ao contrário dos demais campos deste formulário.

---

### Componente: ProfessionalResults

- **Arquivo**: `features/landing/components/ProfessionalResults.tsx`
- **Props** (`ProfessionalResultsProps`):
  - `params: SearchParams` — parâmetros de busca enviados à API (tipo importado de `../api`).
  - `onlyAvailable?: boolean` (default `false`) — filtro client-side por disponibilidade.
  - `sort?: SortOption` (`'rating' | 'price'`, default `'rating'`) — ordenação client-side.
- **Estado interno**: nenhum `useState` próprio — todo estado vem de hooks de dados.
- **Hooks usados**:
  - `useSearchProfessionals(params)` (react-query, de `../queries`) — chama `landingApi.searchProfessionals(params)` via `GET /search/professionals` com os `params` (`q`, `city`, `state`, `categoryId`, `page`, `limit`, conforme presentes em `SearchParams`). `queryKey: ['landing', 'search', params]` — como `params` é um objeto novo a cada render vindo de `SearchPage` (`value` é recriado a cada render a partir da URL), a query-key muda e dispara refetch sempre que a URL muda.
  - `useFavoriteIds()` (de `features/favorites/queries.ts`) — busca a lista de favoritos do usuário atual (`queryKey: favoriteKeys.list(1, FAVORITE_IDS_LIMIT)`) e retorna um `Set<string>` de IDs de profissionais favoritados, usado para marcar `isFavorite` em cada card.
- **Origem dos dados**: endpoint `GET /search/professionals`, resposta tipada como `SearchResponse { items: SearchResultItem[]; page: number; limit: number; total: number }`. Cada `SearchResultItem` contém `id`, `headline`, `bio`, `hourlyRate`, `ratingAverage`, `ratingCount`, `isAvailable`.
- **Card utilizado**: `ProfessionalCard` (de `features/professional/components/ProfessionalCard.tsx`), recebendo todos os campos do item mais `isFavorite` (calculado via `favoriteIds.has(item.id)`).
  - `ProfessionalCard` internamente: `Card` (interactive) com `FavoriteButton` (posicionado `absolute right-3 top-3`) e um `Link` para `/professionals/${id}` envolvendo `Avatar`, `headline`, `Badge` condicional "Disponível agora" (tone `urgent`, exibido apenas se `isAvailable`), `bio` truncada (`line-clamp-2`), preço formatado (`R$ {hourlyRate}/h` ou "Sob consulta" se `hourlyRate === null`) e rating (`StarIcon` + `ratingAverage.toFixed(1)` + `(ratingCount)`).
- **Filtro/ordenação client-side** (aplicado depois que os dados chegam da API, sobre `data.items`):
  1. Se `onlyAvailable === true`: `items = items.filter((item) => item.isAvailable)`.
  2. Sempre: `items = [...items].sort(...)` — se `sort === 'rating'`, ordena por `ratingAverage` decrescente; senão (`'price'`), ordena por `hourlyRate` crescente, tratando `null` como `Infinity` (profissionais sem preço definido vão para o final da lista).
- **Paginação**: não há nenhum controle de paginação de UI neste componente — apenas consome `data.items` (a primeira "página" retornada pela API, conforme os parâmetros `page`/`limit` recebidos, que na prática nunca são preenchidos pela UI atual, ver observações da SearchPage). Os campos `page`, `limit`, `total` da resposta (`SearchResponse`) não são usados/exibidos em lugar nenhum deste componente.
- **Estados de UI**:
  - Loading (`isPending`): grid com 2 `Skeleton` fixos (`h-40 w-full`, `aria-label="Carregando profissionais"`) — número fixo de skeletons (sempre 2), independentemente de quantos itens serão retornados.
  - Erro (`isError`): `EmptyState` com título "Não foi possível carregar os resultados" (sem descrição, sem botão de retry).
  - Vazio (após loading bem-sucedido, mas `items.length === 0` — seja porque a API não retornou nada, seja porque o filtro `onlyAvailable` client-side zerou a lista): `EmptyState` com título "Nenhum profissional encontrado" e descrição "Tente ampliar os filtros de busca."
  - Sucesso: grid `grid-cols-1 sm:grid-cols-2 gap-4` de `ProfessionalCard`.
- **Onde é usado**: apenas em `SearchPage.tsx`.
- **Reutilização**: usa `ProfessionalCard` da feature `professional` (compartilhado, presumivelmente também usado em outras listagens de profissionais fora do escopo desta auditoria).
- **Complexidade**: moderada — combina dois hooks de react-query (busca + favoritos), aplica filtro e ordenação client-side sobre o resultado de uma API que já pagina no servidor, e tem 4 estados de retorno visual distintos (loading, erro, vazio, sucesso).
- **Observações/inconsistências observadas**:
  - O filtro "Disponível agora" (`onlyAvailable`) e a ordenação (`sort`) são aplicados inteiramente no client, sobre os itens já retornados pela página atual da API — não afetam `total` nem re-consultam o backend; em uma lista paginada, isso significa que profissionais disponíveis/mais bem avaliados que estejam em outra página do backend não aparecem, mesmo que o filtro sugira visualmente estar filtrando o conjunto inteiro.
  - Não há paginação implementada nesta tela apesar do contrato de API (`SearchResponse.page/limit/total`) já suportar; a UI sempre exibe apenas os itens de uma única chamada sem parâmetros de paginação explícitos vindos do usuário.
  - O número de `Skeleton`s no loading é fixo em 2, não relacionado a `params.limit` nem a nenhum valor dinâmico.
  - `useFavoriteIds()` depende do usuário estar autenticado para retornar favoritos reais (fora do escopo desta auditoria verificar o comportamento exato para usuário anônimo, mas a chamada ocorre incondicionalmente nesta tela pública, mesmo para visitante não logado).

---

### Resumo de chamadas de API (feature landing)

| Hook | Função de API | Endpoint | Parâmetros | Usado em |
|---|---|---|---|---|
| `useSearchProfessionals(params, options?)` | `landingApi.searchProfessionals` | `GET /search/professionals` | `q?, city?, state?, categoryId?, page?, limit?` (query params) | `ProfessionalResults` |
| `useCategories()` (feature `professional`, reaproveitado) | `professionalApi.listPublicCategories` | (não inspecionado neste escopo, mas endpoint de categorias públicas) | — | `CategoryGrid`, `SearchFilters` |
| `useFavoriteIds()` (feature `favorites`, reaproveitado) | `fetchFavorites(1, FAVORITE_IDS_LIMIT)` | (endpoint de favoritos, fora do escopo desta auditoria) | página 1, limite `FAVORITE_IDS_LIMIT` | `ProfessionalResults` |

`landingApi.searchProfessionals` usa o cliente HTTP compartilhado `http` (de `../../lib/http`), chamando `http.get<SearchResponse>('/search/professionals', { params })`.

---

### Resumo de dependências externas (bibliotecas) usadas na feature

- `@tanstack/react-query` (`useQuery`) — `queries.ts`, indiretamente em `ProfessionalResults`, `CategoryGrid`, `SearchFilters`.
- `react-router-dom` (`Link`, `useNavigate`, `useSearchParams`) — `CategoryGrid`, `SearchBar`, `SearchPage`.
- `react-hook-form` (`useForm`) + `@hookform/resolvers/zod` (`zodResolver`) — apenas em `SearchBar`.
- `zod` — `schemas.ts` (`searchFormSchema`).
- `@heroicons/react/24/outline` — `Squares2X2Icon` (CategoryGrid), `MagnifyingGlassIcon` (SearchBar), `ShieldCheckIcon`/`CheckBadgeIcon`/`BoltIcon` (LandingPage).
- `@heroicons/react/24/solid` — `StarIcon` (ProfessionalCard, feature professional).
- Componentes de design system (`components/ui/`): `Card`, `Skeleton`, `EmptyState`, `Button`, `Badge`, `Avatar` (os três últimos usados via `ProfessionalCard`, feature professional).

---

### Capítulo: 03-demands

## Auditoria Técnica — Feature DEMANDS

> Documentação descritiva do estado atual do código, sem sugestões de melhoria. Base: `frontend/src/features/demands/**` e integrações diretas (`router/index.tsx`, `router/ProtectedRoute.tsx`, `components/ui/*`, `stores/auth.ts`).

### Visão geral da feature

A feature `demands` (demandas) implementa o fluxo de publicação, listagem, visualização e orçamento de "demandas" (pedidos de serviço publicados por clientes e respondidos por profissionais via orçamentos/"quotes"). É composta por:

- **Domínio de dados**: `api.ts` (tipos + chamadas HTTP), `schemas.ts` (validação Zod de formulários), `queries.ts` (hooks TanStack Query).
- **Componentes**: `components/DemandCard.tsx`, `components/DemandForm.tsx`, `components/InviteProfessionalDialog.tsx`, `components/QuoteCard.tsx`, `components/QuoteForm.tsx`.
- **Páginas**: `pages/DemandListPage.tsx`, `pages/DemandDetailPage.tsx`, `pages/PublishDemandPage.tsx`.

#### Modelo de dados (`api.ts`)

```ts
type DemandStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

interface DemandImage { url: string; position: number; }

interface Demand {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  status: DemandStatus;
  addressId: string | null;
  images: DemandImage[];
  tagIds: string[];
  createdAt: string;
}

interface QuoteItem { description: string; quantity: number; unitPrice: number; subtotal: number; }
type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

interface Quote {
  id: string;
  demandId: string;
  professionalId: string;
  message: string | null;
  total: number;
  status: QuoteStatus;
  validUntil: string | null;
  items: QuoteItem[];
  createdAt: string;
}

type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

interface Schedule { id: string; scheduledDate: string; durationMinutes: number | null; notes: string | null; status: ScheduleStatus; }

interface Contract {
  id: string;
  demandId: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  total: number;
  status: ContractStatus;
  cancelledBy: string | null;
  cancellationReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  schedule: Schedule | null;
  createdAt: string;
}

interface Paginated<T> { items: T[]; page: number; limit: number; total: number; }
```

`Contract`/`Schedule`/`ContractStatus`/`ScheduleStatus` estão definidos neste arquivo mas não são usados nas telas/componentes da feature `demands` em si (são consumidos por `features/contracts`, fora do escopo desta auditoria).

#### Endpoints consumidos (`api.ts`)

| Função | Método/Rota | Payload | Retorno |
|---|---|---|---|
| `fetchDemands({ page?, mine? })` | `GET /demands` (params `page`, `mine`) | — | `Paginated<Demand>` |
| `fetchDemand(id)` | `GET /demands/:id` | — | `Demand` |
| `publishDemand(values, images=[])` | `POST /demands` | `{ ...values, addressId: null, tagIds: [], images: images.map((url, position) => ({ url, position })) }` | `Demand` |
| `fetchDemandQuotes(demandId)` | `GET /demands/:demandId/quotes` | — | `Quote[]` |
| `acceptQuote(quoteId)` | `POST /quotes/:quoteId/accept` | `{ schedule: null }` | `Contract` |
| `inviteProfessional(demandId, professionalId)` | `POST /demands/:demandId/invitations` | `{ professionalId }` | `void` |
| `createQuote(demandId, values)` | `POST /demands/:demandId/quotes` | `{ message, validUntil: values.validUntil ? new Date(validUntil).toISOString() : null, items }` | `Quote` |

Todas as chamadas usam o cliente HTTP compartilhado `http` de `lib/http`.

#### Hooks TanStack Query (`queries.ts`)

Chaves de cache (`demandKeys`):
- `all`: `['demands']`
- `list(mine?)`: `['demands', 'list', { mine }]`
- `detail(id)`: `['demands', 'detail', id]`
- `quotes(id)`: `['demands', id, 'quotes']`

Hooks:
- `useDemands(mine?, options?)` — `useQuery` sobre `fetchDemands({ mine })`; aceita `options.enabled` (default `true`).
- `useDemand(id)` — `useQuery` sobre `fetchDemand(id)`; `enabled: !!id`.
- `usePublishDemand()` — `useMutation` que chama `publishDemand(values, images)`; `onSuccess` invalida `demandKeys.all` (toda a árvore de cache de demandas).
- `useDemandQuotes(id)` — `useQuery` sobre `fetchDemandQuotes(id)`; `enabled: !!id`.
- `useAcceptQuote(demandId)` — `useMutation` que chama `acceptQuote(quoteId)`; `onSuccess` invalida `demandKeys.detail(demandId)` (não invalida a lista de quotes).
- `useInviteProfessional(demandId)` — `useMutation` que chama `inviteProfessional(demandId, professionalId)`; **sem** `onSuccess`/invalidação de cache.
- `useCreateQuote(demandId)` — `useMutation` que chama `createQuote(demandId, values)`; `onSuccess` invalida `demandKeys.quotes(demandId)`.

Nenhum dos hooks expõe tratamento de erro (`onError`) — os componentes que os consomem também não leem `isError`/`error` desses hooks (ver seção de Estados de cada tela).

#### Validação de formulários (`schemas.ts`, Zod)

**`demandFormSchema`** (usado por `DemandForm`):
```ts
z.object({
  categoryId: z.string().uuid('Categoria obrigatória'),
  title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
  description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
  budgetMin: z.coerce.number().nonnegative(),
  budgetMax: z.coerce.number().nonnegative(),
}).refine((v) => v.budgetMax >= v.budgetMin, { message: 'Máximo deve ser >= mínimo', path: ['budgetMax'] });
```
Tipo inferido: `DemandFormValues`.

**`quoteItemFormSchema`** (item de orçamento):
```ts
z.object({
  description: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  quantity: z.coerce.number().int('Deve ser inteiro').positive('Deve ser maior que zero'),
  unitPrice: z.coerce.number().nonnegative('Não pode ser negativo'),
});
```

**`quoteFormSchema`** (usado por `QuoteForm`):
```ts
z.object({
  message: z.string().min(5, 'Mínimo 5 caracteres').max(2000),
  validUntil: z.string().optional(),
  items: z.array(quoteItemFormSchema).min(1, 'Adicione ao menos um item').max(50),
});
```
Tipo inferido: `QuoteFormValues`. Nota: o campo `subtotal` de `QuoteItem` (usado na exibição/`QuoteCard`) não existe em `quoteItemFormSchema`/`QuoteFormValues` — é calculado/retornado pelo backend, não enviado pelo formulário.

#### Roteamento e controle de acesso (`router/index.tsx`, `router/ProtectedRoute.tsx`)

```ts
{
  element: <ProtectedRoute />,          // qualquer usuário autenticado
  children: [
    ...
    { path: '/demands', element: <DemandListPage /> },
    { path: '/demands/:id', element: <DemandDetailPage /> },
    ...
  ],
},
{
  element: <ProtectedRoute roles={['client']} />,   // somente role client
  children: [{ path: '/demands/new', element: <PublishDemandPage /> }],
},
```

`ProtectedRoute` (`router/ProtectedRoute.tsx`):
- Lê `user` e `isBootstrapping` de `useAuthStore`.
- Se `isBootstrapping`, renderiza `null` (nenhum conteúdo, sem placeholder de loading visível).
- Se não há `user`, redireciona para `/login` (`replace`).
- Se `roles` é passado e `user.role` não está incluído, redireciona para `/forbidden` (`replace`).
- Caso contrário, renderiza `<Outlet />`.

`Role` (`stores/auth.ts`): `'client' | 'professional' | 'admin'`.

Assim: `/demands` e `/demands/:id` são acessíveis a qualquer usuário logado (client, professional ou admin); `/demands/new` é exclusiva de `client` — profissional ou admin tentando acessar são redirecionados para `/forbidden`.

---

### Tela: DemandListPage

- **Nome de exibição**: "Demandas" (título `<h1>`)
- **Arquivo**: `frontend/src/features/demands/pages/DemandListPage.tsx`
- **Rota**: `/demands`
- **Quem acessa**: qualquer usuário autenticado (rota sob `ProtectedRoute` sem `roles`), independente de role (client, professional, admin).
- **Objetivo**: listar demandas retornadas pela API em formato de lista de cards clicáveis, com atalho para publicar uma nova demanda.

#### Descrição funcional

A página chama `useDemands()` sem argumentos (portanto `mine` é `undefined` e a chamada real é `fetchDemands({ mine: undefined })`, ou seja, busca a listagem geral de demandas, não filtrada por "minhas demandas"). Não há paginação, busca, filtro ou ordenação implementados na página — apenas a lista bruta do resultado de `useDemands`.

#### Fluxo do usuário

Não há diferenciação de fluxo por role nesta página — o comportamento é idêntico para client, professional e admin: a mesma listagem é exibida e o mesmo CTA de "Publicar demanda" aparece no estado vazio para qualquer usuário (mesmo que, ao clicar, um profissional/admin seja bloqueado por `ProtectedRoute roles={['client']}` na rota de destino `/demands/new` e redirecionado a `/forbidden`).

1. Usuário navega para `/demands`.
2. Enquanto carrega, vê um `Skeleton`.
3. Se a lista vier vazia, vê `EmptyState` com botão "Publicar demanda" que navega para `/demands/new`.
4. Se houver itens, vê uma lista vertical de `DemandCard`.
5. Ao clicar em um card, é navegado para `/demands/:id`.

#### Hierarquia visual / Layout

```
<section class="mx-auto flex max-w-3xl flex-col gap-3 p-6">
  <h1>Demandas</h1>
  [Skeleton | EmptyState | lista de DemandCard]
</section>
```

- Container centralizado, largura máxima `max-w-3xl`, padding `p-6`, layout em coluna com gap `gap-3`.
- Título `<h1>` com classes `text-2xl font-bold text-ink`.
- Corpo condicional (loading / vazio / lista), sem cabeçalhos de seção adicionais, sem sidebar, sem filtros.

#### Componentes utilizados

- `DemandCard` (`components/DemandCard.tsx`) — um por item da lista.
- `Button` (`components/ui/Button.tsx`) — dentro do `EmptyState`, variante padrão (`primary`), texto "Publicar demanda".
- `Skeleton` (`components/ui/Skeleton.tsx`) — `className="h-24 w-full"`, `aria-label="Carregando demandas"`.
- `EmptyState` (`components/ui/EmptyState.tsx`) — `title="Nenhuma demanda ainda"`, sem `description`, com `action` = botão.

#### Estados

- **Loading** (`isPending === true`): renderiza um único `Skeleton` (`h-24 w-full`, `role="status"`, `aria-label="Carregando demandas"`).
- **Vazio** (`!data || data.items.length === 0`): renderiza `EmptyState` com título "Nenhuma demanda ainda" e botão de ação "Publicar demanda" (navega para `/demands/new`).
- **Sucesso com itens**: mapeia `data.items` para `DemandCard`, passando `onOpen` que navega para `/demands/${id}`.
- **Erro**: **não tratado** — `useDemands` não expõe `isError`/`error` na página; se a query falhar, o componente permanece potencialmente em estado inconsistente (sem `isPending` true e sem `data`, cai no ramo de "vazio" com `EmptyState` "Nenhuma demanda ainda", mascarando um erro real como lista vazia).
- **Permissões**: nenhuma verificação de role nesta página; conteúdo idêntico para todos os roles autenticados.

#### Chamadas de API/queries

- `useDemands()` → `GET /demands` (params `{ page: undefined, mine: undefined }`).

#### Hooks usados

- `useNavigate` (react-router-dom)
- `useDemands` (`../queries`)

#### Navegação / Links / Toasts

- Botão do `EmptyState` → `navigate('/demands/new')`.
- Cada `DemandCard` → `navigate('/demands/${id}')` via callback `onOpen`.
- Nenhum toast é disparado nesta página.

#### Responsividade

Único breakpoint aplicado é implícito via `max-w-3xl` (contração em telas largas); não há classes responsivas (`sm:`, `md:`, etc.) na própria página. O `DemandCard` interno é `w-full` dentro do container, portanto ocupa a largura disponível em qualquer tamanho de tela.

#### Complexidade / Dependências / Observações

- Página simples (28 linhas), sem estado local próprio (`useState`), toda a lógica delega a `useDemands`.
- Dependências diretas: `DemandCard`, `useDemands`, `Button`, `Skeleton`, `EmptyState`.
- Não há mecanismo de refetch manual, paginação, busca ou filtro por status/categoria nesta tela, apesar de a API (`fetchDemands`) aceitar `page` e `mine`.
- Uso de `mine` nunca é acionado (nenhum toggle "minhas demandas" na UI).

---

### Tela: DemandDetailPage

- **Nome de exibição**: título dinâmico = `demand.title`
- **Arquivo**: `frontend/src/features/demands/pages/DemandDetailPage.tsx`
- **Rota**: `/demands/:id`
- **Quem acessa**: qualquer usuário autenticado (client, professional, admin) — rota sob `ProtectedRoute` sem restrição de role. A diferenciação de comportamento ocorre **dentro** da página, com base em `role` lido de `useAuthStore`.
- **Objetivo**: exibir detalhes completos de uma demanda específica, orçamentos recebidos, permitir convidar profissional, aceitar orçamento (implicitamente restrito a quem pode aceitar) e — exclusivamente para profissionais — enviar um novo orçamento.

#### Descrição funcional

A página lê o parâmetro de rota `id` via `useParams` (default `''` se ausente). Busca a demanda (`useDemand(id)`), a lista de orçamentos (`useDemandQuotes(id)`), e prepara duas mutations: `useAcceptQuote(id)` e `useCreateQuote(id)`. Também lê `role` do usuário autenticado via `useAuthStore((state) => state.user?.role)`.

Estado local: `inviting` (`boolean`, via `useState(false)`) controla a exibição do modal `InviteProfessionalDialog`.

#### Fluxo do usuário

**Fluxo comum (qualquer role autenticado)**:
1. Acessa `/demands/:id`.
2. Enquanto `isPending`, vê `Skeleton` de carregamento.
3. Se a demanda não existir (`!demand`), vê `EmptyState` "Demanda não encontrada" (tela final, sem CTA).
4. Se existir, vê cabeçalho com título, badge de status, botão "Convidar profissional", descrição, galeria de imagens (se houver), seção de orçamentos.
5. Pode clicar em "Convidar profissional" para abrir `InviteProfessionalDialog` (não há restrição de role no código para exibir este botão — está disponível para qualquer usuário autenticado que acesse a página, incluindo profissionais e admins, não apenas o client dono da demanda).
6. Pode ver a lista de `QuoteCard` (ou `EmptyState` "Nenhum orçamento recebido ainda").
7. Em cada `QuoteCard`, pode clicar "Conversar" (cria/abre uma sala de chat com o profissional) e, se `canAccept` for verdadeiro, "Aceitar".

**Fluxo específico — condição `canAccept` no `QuoteCard`**: `canAccept = quote.status === 'pending' && demand.status === 'open'`. Não há checagem explícita de `role === 'client'` para exibir o botão "Aceitar" — a lógica de exibição do botão de aceite depende apenas do status da quote/demanda, não da role do usuário logado (ou seja, no código-fonte desta tela, um profissional ou admin visualizando a página também veria o botão "Aceitar" habilitado se as condições de status forem satisfeitas).

**Fluxo específico — role `professional`**: o formulário `QuoteForm` (envio de novo orçamento) só é renderizado quando `role === 'professional' && demand.status === 'open'`. Para `client` e `admin`, o formulário nunca aparece, independentemente do status da demanda.

**Fluxo específico — role `client`/`admin`**: sem o `QuoteForm`, a página termina na lista de orçamentos (e no modal de convite, se aberto).

#### Hierarquia visual / Layout

```
<section class="mx-auto flex max-w-3xl flex-col gap-4 p-6">
  <header class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <h1>{demand.title}</h1>
      <Badge>{demand.status}</Badge>
    </div>
    <Button variant="ghost">Convidar profissional</Button>
  </header>
  <p>{demand.description}</p>
  [grid de imagens, se houver]
  <h2>Orçamentos ({quotes?.length ?? 0})</h2>
  [EmptyState | lista de QuoteCard]
  [QuoteForm, se role === professional e demanda aberta]
  [InviteProfessionalDialog, se inviting === true]
</section>
```

Seções, em ordem:
1. **Header**: título (`h1`, `text-2xl font-bold text-ink`) + `Badge` de status (texto bruto do enum, sem tradução de label como no `DemandCard` — exibe `open`/`in_progress`/`closed`/`cancelled` diretamente) + botão "Convidar profissional" (`variant="ghost"`, alinhado à direita, com `flex-wrap` para quebrar em telas estreitas).
2. **Descrição**: parágrafo simples com `demand.description`.
3. **Galeria de imagens** (condicional: `demand.images.length > 0`): grid `grid-cols-3` (mobile) que vira `sm:grid-cols-4` (telas ≥640px), imagens quadradas (`aspect-square`), `object-cover`, todas com o mesmo `alt={demand.title}` (não descrevem individualmente a imagem).
4. **Cabeçalho de orçamentos**: `h2` "Orçamentos (N)" onde N é `quotes?.length ?? 0`.
5. **Lista de orçamentos ou vazio**: `EmptyState` "Nenhum orçamento recebido ainda" OU coluna (`flex flex-col gap-3`) de `QuoteCard`.
6. **Formulário de orçamento** (condicional por role): `QuoteForm`, sem título de seção próprio na página (o título "Enviar orçamento" está dentro do próprio componente `QuoteForm`).
7. **Modal de convite** (condicional `inviting`): `InviteProfessionalDialog`.

#### Componentes utilizados

- `Badge` (`components/ui/Badge.tsx`) — tom `urgent` se `status === 'open'`, senão `neutral`. Texto é o valor bruto do enum (não passa por `STATUS_LABELS` como em `DemandCard`).
- `Button` (`components/ui/Button.tsx`) — variante `ghost` para "Convidar profissional".
- `Skeleton` — `className="m-6 h-40 w-full"`, `aria-label="Carregando demanda"`.
- `EmptyState` — dois usos: "Demanda não encontrada" (`className="m-6"`, sem action) e "Nenhum orçamento recebido ainda" (sem className adicional, sem action).
- `QuoteCard` (`components/QuoteCard.tsx`) — um por orçamento.
- `QuoteForm` (`components/QuoteForm.tsx`) — condicional por role.
- `InviteProfessionalDialog` (`components/InviteProfessionalDialog.tsx`) — modal condicional.

#### Estados

- **Loading**: `isPending` de `useDemand` → retorna cedo um `Skeleton` isolado (fora da estrutura de `<section>`, é o único elemento retornado pela função nesse ramo).
- **Demanda não encontrada**: `!demand` (após loading) → retorna cedo `EmptyState` "Demanda não encontrada" isolado (idem, sem `<section>` ao redor).
- **Sucesso**: renderiza a `<section>` completa descrita acima.
- **Lista de orçamentos vazia**: `!quotes || quotes.length === 0` → `EmptyState` "Nenhum orçamento recebido ainda".
- **Erro de rede/API**: não há tratamento explícito de erro em nenhuma das duas queries (`useDemand`, `useDemandQuotes`) nesta página — sem leitura de `isError`.
- **Permissões**: a página em si é acessível a qualquer autenticado; a diferenciação de UI por role está restrita à exibição do `QuoteForm` (`role === 'professional'`). O botão "Convidar profissional" e o botão "Aceitar" (via `canAccept` no `QuoteCard`) não têm guarda de role no código desta página.
- **Aceite de orçamento em andamento**: `accepting={accept.isPending}` passado ao `QuoteCard`, desabilita o botão "Aceitar" durante a mutation.
- **Envio de orçamento em andamento**: `submitting={createQuote.isPending}` passado ao `QuoteForm`.

#### Chamadas de API/queries/mutations

- `useDemand(id)` → `GET /demands/:id`.
- `useDemandQuotes(id)` → `GET /demands/:id/quotes`.
- `useAcceptQuote(id)` → mutation `POST /quotes/:quoteId/accept` (body `{ schedule: null }`); ao concluir, invalida `demandKeys.detail(id)`.
- `useCreateQuote(id)` → mutation `POST /demands/:id/quotes` (body `{ message, validUntil, items }`); ao concluir, invalida `demandKeys.quotes(id)`.
- Indiretamente via `InviteProfessionalDialog`: `useInviteProfessional(demandId)` → mutation `POST /demands/:id/invitations`.
- Indiretamente via `QuoteCard`: `usePublicProfile(professionalId)` (feature `professional`) e `useCreateRoom()` (feature `chat`).

#### Hooks usados (na própria página)

`useState`, `useParams` (react-router-dom), `useDemand`, `useDemandQuotes`, `useAcceptQuote`, `useCreateQuote` (`../queries`), `useAuthStore` (`../../../stores/auth`).

#### Modal: InviteProfessionalDialog (dentro desta tela)

Ver seção dedicada abaixo — é aberto pelo botão "Convidar profissional" (`setInviting(true)`) e fechado por `onClose={() => setInviting(false)}` (botão "Cancelar" interno ou após sucesso da mutation de convite).

#### Navegação / Links / Toasts

- Nenhuma navegação própria de página (não há `useNavigate` na `DemandDetailPage`).
- Navegação indireta: dentro de `QuoteCard`, clique em "Conversar" navega para `/chat/:roomId` após criar a sala.
- Nenhum toast disparado diretamente por esta página (os componentes filhos também não disparam toast nas ações de aceitar/enviar orçamento/convidar).

#### Responsividade

- Header usa `flex flex-wrap items-center justify-between gap-2`, permitindo que o botão "Convidar profissional" quebre para a linha seguinte em telas estreitas.
- Grid de imagens: `grid-cols-3` até breakpoint `sm`, `sm:grid-cols-4` a partir de 640px.
- Container geral limitado a `max-w-3xl`, centralizado, `p-6`.

#### Complexidade / Dependências / Observações

- Página com múltiplas queries e mutations simultâneas (2 queries próprias + 2 mutations próprias + hooks de dois componentes filhos: `QuoteCard` usa `usePublicProfile`/`useCreateRoom`, `InviteProfessionalDialog` usa `useInviteProfessional`).
- Não há verificação de que o usuário logado seja o dono (`clientId`) da demanda para exibir "Convidar profissional" ou o botão de aceite — a única guarda de role explícita no arquivo é para o `QuoteForm` (`role === 'professional'`).
- `Badge` de status na página não usa o mapa de tradução `STATUS_LABELS` presente em `DemandCard`, resultando em inconsistência textual entre as duas telas (lista mostra "Aberta"/"Em andamento"/etc., detalhe mostra `open`/`in_progress`/etc. em inglês/snake_case cru).
- Early returns (loading e "não encontrada") retornam elementos fora da estrutura `<section>` usada no caso de sucesso — diferença de wrapper entre os três ramos de renderização.

---

### Tela: PublishDemandPage

- **Nome de exibição**: "Publicar demanda"
- **Arquivo**: `frontend/src/features/demands/pages/PublishDemandPage.tsx`
- **Rota**: `/demands/new`
- **Quem acessa**: exclusivamente role `client` (rota protegida por `ProtectedRoute roles={['client']}`); profissionais e admins são redirecionados para `/forbidden`.
- **Objetivo**: publicar uma nova demanda através do `DemandForm`, com possibilidade de, ao concluir, convidar automaticamente um profissional específico (via query string) para a demanda recém-criada.

#### Descrição funcional

A página lê o query param `professionalId` da URL (`useSearchParams`). Ao submeter o `DemandForm`, chama a mutation `usePublishDemand()`. No `onSuccess` da publicação:
1. Se `professionalId` estiver presente na URL, tenta chamar `inviteProfessional(demand.id, professionalId)` diretamente da API (não via hook/mutation) dentro de um `try/catch` que **silencia qualquer erro** (bloco `catch {}` vazio — nenhum log, nenhum toast, nenhuma re-tentativa).
2. Em seguida, navega (sempre, mesmo se o convite falhar) para `/demands/${demand.id}` (a `DemandDetailPage` da demanda recém-criada).

#### Fluxo do usuário

Não há diferenciação por role dentro da página (apenas `client` chega até aqui, garantido pela rota). Dois sub-fluxos possíveis conforme a origem da navegação:

**Fluxo A — publicação direta** (sem `professionalId` na URL, ex.: vindo do CTA em `DemandListPage` ou navegação direta a `/demands/new`):
1. Cliente preenche o `DemandForm`.
2. Submete → `usePublishDemand` dispara `POST /demands`.
3. Em sucesso, navega direto para `/demands/:id` da demanda criada.

**Fluxo B — publicação com convite pré-associado** (`?professionalId=xxx` na URL, presumivelmente vindo de um perfil público de profissional "Publicar demanda para este profissional"):
1. Idêntico ao Fluxo A na parte de preenchimento/submissão.
2. Em sucesso, adicionalmente tenta convidar automaticamente o profissional indicado por `professionalId` para a demanda recém-criada, via `POST /demands/:id/invitations`.
3. Falhas nesse convite automático são engolidas silenciosamente; o usuário não recebe nenhum feedback visual de que o convite falhou.
4. Navega para `/demands/:id` de qualquer forma.

#### Hierarquia visual / Layout

```
<section class="mx-auto max-w-2xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Publicar demanda</h1>
  <DemandForm submitting={publish.isPending} onSubmit={handleSubmit} />
</section>
```

Estrutura mínima: título + formulário. Nenhuma outra seção (sem sidebar, sem preview, sem breadcrumb).

#### Componentes utilizados

- `DemandForm` (`components/DemandForm.tsx`) — único componente de conteúdo da página.

#### Estados

- **Formulário em envio**: `submitting={publish.isPending}` desabilita o botão de submit dentro de `DemandForm`.
- **Sucesso**: navegação automática para `/demands/:id`; não há tela de confirmação intermediária nem toast de sucesso.
- **Erro na publicação**: `usePublishDemand` (mutation) não expõe tratamento de erro nesta página — não há leitura de `publish.isError`/`publish.error`; se a mutation falhar, não há feedback visual ao usuário (nenhum toast, nenhuma mensagem, o formulário simplesmente não navega).
- **Erro no convite automático (Fluxo B)**: silenciado por `catch {}` vazio; nenhum estado ou feedback é gerado.
- **Permissões**: garantidas fora da página, pelo `ProtectedRoute roles={['client']}`; a página não faz nenhuma verificação adicional de role internamente.

#### Chamadas de API/queries/mutations

- `usePublishDemand()` → mutation `POST /demands` com body `{ ...values, addressId: null, tagIds: [], images: images.map((url, position) => ({ url, position })) }`; `onSuccess` invalida `demandKeys.all`.
- `inviteProfessional(demand.id, professionalId)` (chamada direta à função de `api.ts`, **não** via hook `useInviteProfessional`) → `POST /demands/:id/invitations` body `{ professionalId }`. Sem invalidação de cache associada (a função crua não tem `onSuccess`).

#### Hooks usados

`useNavigate`, `useSearchParams` (react-router-dom), `usePublishDemand` (`../queries`).

#### Navegação / Links / Toasts

- Após sucesso (com ou sem convite), `navigate('/demands/${demand.id}')`.
- Nenhum toast disparado por esta página.

#### Responsividade

Container `max-w-2xl`, `p-6`, sem breakpoints adicionais na própria página; a responsividade do formulário depende do `DemandForm` (ver abaixo, que também não tem classes responsivas específicas).

#### Complexidade / Dependências / Observações

- Página curta (37 linhas); lógica de negócio adicional (convite automático pós-publicação) embutida diretamente no handler de submit, fora de qualquer hook dedicado.
- Import direto de `inviteProfessional` da camada `api.ts` (bypassa `queries.ts`/`useInviteProfessional`), quebrando o padrão de uso de hooks de mutation usado no restante da feature.
- Tratamento de erro do convite automático é um `catch` vazio sem qualquer log ou notificação — silenciosamente ignorado.

---

### Componente: DemandCard

- **Arquivo**: `frontend/src/features/demands/components/DemandCard.tsx`
- **Usado em**: `DemandListPage`.

#### Props

```ts
interface DemandCardProps {
  demand: Demand;
  onOpen: (id: string) => void;
}
```

#### Estrutura

Renderiza como um `<button type="button">` (o card inteiro é clicável, não um `<div>` com handler), com classes `flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover`. Conteúdo interno:

1. Linha superior (`flex items-center justify-between gap-2`):
   - `span` com `demand.title` (`text-base font-semibold text-ink`).
   - `Badge` de status: tom `urgent` se `status === 'open'`, senão `neutral`; conteúdo é `STATUS_LABELS[demand.status]` (mapa de tradução: `open` → "Aberta", `in_progress` → "Em andamento", `closed` → "Concluída", `cancelled` → "Cancelada"). Se `status === 'cancelled'`, é prefixado por um ícone `XCircleIcon` (heroicons, `h-3.5 w-3.5 text-muted`, `data-testid="demand-cancelled-icon"`).
2. Linha inferior: `span` (`text-sm text-muted`) exibindo faixa de orçamento formatada em BRL: `{currency(budgetMin)} — {currency(budgetMax)}` (função local `currency` usa `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`, distinta do helper compartilhado `formatCurrency` de `lib/utils` usado em `QuoteCard`).

#### Informações exibidas

Título, status (traduzido, com badge colorido/tom + ícone condicional para cancelada), faixa de orçamento (mínimo — máximo) em Real brasileiro.

#### Botões / Eventos

- O card inteiro é um botão (`onClick={() => onOpen(demand.id)}`), sem botões internos adicionais.

#### Estados

- Não possui estados de loading/erro internos (é um componente de apresentação puro).
- Efeito visual `hover:shadow-hover` no hover.

#### Responsividade

`w-full` — ocupa a largura do container pai em qualquer viewport; sem breakpoints próprios.

---

### Componente: QuoteCard

- **Arquivo**: `frontend/src/features/demands/components/QuoteCard.tsx`
- **Usado em**: `DemandDetailPage`.

#### Props

```ts
export interface QuoteCardProps {
  quote: Quote;
  canAccept: boolean;
  onAccept: () => void;
  accepting: boolean;
}
```

#### Dependências/hooks internos

- `usePublicProfile(quote.professionalId)` (feature `professional/queries`) — busca o perfil público do profissional autor do orçamento, usado para exibir `profile?.headline` e para obter `profile.userId` (necessário para abrir chat).
- `useCreateRoom()` (feature `chat/queries`) — mutation para criar uma sala de chat.
- `useNavigate` (react-router-dom).
- `formatCurrency` (`lib/utils`) — helper compartilhado (diferente do `currency` local de `DemandCard`).

#### Estrutura

Renderizado dentro de um `Card` (`components/ui/Card.tsx`), com `className="flex flex-col gap-2"`. Seções internas:

1. **Cabeçalho**: `span` com `profile?.headline ?? 'Profissional'` (fallback textual enquanto o perfil não carrega ou não existe) + `Badge` de status do orçamento (`STATUS_LABELS`: `pending` → "Pendente", `accepted` → "Aceito", `rejected` → "Rejeitado", `withdrawn` → "Retirado"; tom `urgent` se `pending`, senão `neutral`).
2. **Mensagem** (condicional `quote.message`): parágrafo `text-sm text-muted`.
3. **Lista de itens**: `<ul>` mapeando `quote.items`, cada `<li>` em `flex justify-between` exibindo `{quantity}x {description}` à esquerda e `formatCurrency(item.subtotal)` à direita. `key={index}` (chave por índice, não por id — os itens não têm id próprio no tipo `QuoteItem`).
4. **Rodapé**: total (`formatCurrency(quote.total)`, `text-lg font-bold`) à esquerda; à direita, dois botões:
   - `Button` variant `ghost` "Conversar" — `onClick={handleChat}`, desabilitado se `!profile || createRoom.isPending`.
   - `Button` (variante padrão/`primary`) "Aceitar" — renderizado apenas se `canAccept` for `true` (prop vinda do pai); `onClick={onAccept}`, desabilitado se `accepting`.

#### Evento "Conversar" (`handleChat`)

```ts
function handleChat() {
  if (!profile) return;
  createRoom.mutate({ participantId: profile.userId }, { onSuccess: (room) => navigate(`/chat/${room.id}`) });
}
```
Cria uma sala de chat com o profissional (`participantId: profile.userId`) e, em sucesso, navega para `/chat/:roomId`.

#### Informações exibidas

Nome/headline do profissional (via perfil público, com fallback "Profissional"), status do orçamento (badge traduzido), mensagem opcional do profissional ao cliente, lista detalhada de itens (quantidade, descrição, subtotal formatado em BRL), total do orçamento formatado em BRL.

#### Estados

- Perfil do profissional em carregamento: `profile` é `undefined` até resolver `usePublicProfile`; nesse intervalo, "Conversar" fica desabilitado e o cabeçalho mostra "Profissional" como placeholder textual (sem skeleton dedicado no próprio card).
- `accepting` (prop) desabilita "Aceitar" durante a mutation de aceite (controlada pelo pai, `DemandDetailPage`).
- `createRoom.isPending` desabilita "Conversar" durante a criação da sala.
- Não há tratamento de erro renderizado para falhas em `usePublicProfile` ou `createRoom` neste componente.

#### Responsividade

Sem classes responsivas específicas (`sm:`, `md:`) — layout flexível (`flex`, `justify-between`) que se adapta à largura do container pai, herdado do `max-w-3xl` da página.

---

### Formulário: DemandForm

- **Arquivo**: `frontend/src/features/demands/components/DemandForm.tsx`
- **Usado em**: `PublishDemandPage`.
- **Biblioteca de formulário**: `react-hook-form` com `zodResolver(demandFormSchema)`.

#### Props

```ts
interface DemandFormProps {
  onSubmit: (values: DemandFormValues, images: string[]) => void;
  submitting?: boolean;
}
```

#### Estado local

`images: string[]` (via `useState`) — acumula URLs de imagens enviadas através do `ImageUpload`, mantido fora do `react-hook-form` (não é um campo do schema) e passado manualmente para `onSubmit` junto dos valores validados.

#### Valores padrão (`defaultValues`)

```ts
{ title: '', description: '', budgetMin: 0, budgetMax: 0, categoryId: '' }
```

#### Campos, um a um

| Campo | Tipo de input | id/label | Placeholder | Obrigatório/validação (Zod) | Mensagem de erro |
|---|---|---|---|---|---|
| `categoryId` | `<input>` texto (via `register`) | `demand-category` / "Categoria" | — (sem placeholder) | `z.string().uuid(...)` — precisa ser um UUID válido | "Categoria obrigatória" |
| `title` | `<input>` texto | `demand-title` / "Título" | — | `min(5)`, `max(120)` | "Mínimo 5 caracteres" (min); sem mensagem custom para `max` (usa mensagem default do Zod, não exibida explicitamente no código mas capturada por `errors.title`) |
| `description` | `<textarea rows={5}>` | `demand-description` / "Descrição" | — | `min(20)`, `max(4000)` | "Mínimo 20 caracteres" |
| `budgetMin` | `<input type="number" step="0.01">` | `demand-budget-min` / "Orçamento mínimo" | — | `z.coerce.number().nonnegative()` | Não exibida no JSX (não há bloco `errors.budgetMin` renderizado, apesar de o schema poder gerar erro) |
| `budgetMax` | `<input type="number" step="0.01">` | `demand-budget-max` / "Orçamento máximo" | — | `z.coerce.number().nonnegative()` + `.refine` cross-field (`budgetMax >= budgetMin`) | "Máximo deve ser >= mínimo" (exibida via `errors.budgetMax`) |
| Fotos (imagens) | componente `ImageUpload` (não é campo `register`d do RHF) | — / "Fotos (opcional)" | label do botão de upload: "Adicionar foto" | Nenhuma validação Zod (não faz parte do schema); campo é opcional por natureza | — |

Nenhum campo tem atributo `placeholder` de fato (todos os `<input>`/`<textarea>` não possuem a prop `placeholder`; a única "label" textual de UI para o upload é o texto do botão "Adicionar foto").

#### Upload de imagens

Usa o componente compartilhado `ImageUpload` (`components/ui/ImageUpload.tsx`). Ao selecionar um arquivo:
1. Cria preview local via `URL.createObjectURL`.
2. Mostra `Skeleton` (`h-24 w-24`) enquanto `uploading === true`.
3. Chama `uploadImage(file)` (feature `uploads/api`); em sucesso, invoca `onUploaded(result)` — no `DemandForm`, isso adiciona `result.url` ao array `images` local.
4. Em falha, dispara toast de erro "Falha ao enviar imagem" (via `useToast`) e limpa o preview.
5. Aceita apenas `image/jpeg,image/png,image/webp` (atributo `accept`).

Após upload bem-sucedido, cada imagem enviada é exibida em uma lista (`<ul className="flex flex-wrap gap-2">`) como thumbnail `h-16 w-16 rounded-md object-cover`, com `key={url}` e `alt="Foto da demanda"` (texto alternativo genérico, igual para todas).

#### Botão de submit

`<button type="submit" disabled={submitting}>` — texto "Publicar demanda", classes `rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50` (estilo de botão "cru", não usa o componente compartilhado `Button` de `components/ui`).

#### Submissão

`handleSubmit((values) => onSubmit(values, images))` — no submit, RHF valida via `zodResolver`; se válido, chama a prop `onSubmit` com os valores tipados (`DemandFormValues`) e o array de URLs de imagens acumulado localmente. A página (`PublishDemandPage`) então dispara a mutation `usePublishDemand`.

#### Observações de estilo

Este formulário usa classes utilitárias "cruas" (`border-slate-300`, `bg-slate-900`, `text-red-600`) em vez dos tokens de design system usados em outras partes da feature (`ink`, `muted`, `surface`, `accent` vistos em `DemandCard`/`QuoteCard`/páginas) — inconsistência de paleta dentro da mesma feature.

---

### Formulário: QuoteForm

- **Arquivo**: `frontend/src/features/demands/components/QuoteForm.tsx`
- **Usado em**: `DemandDetailPage` (apenas quando `role === 'professional'` e demanda `open`).
- **Biblioteca de formulário**: `react-hook-form` com `zodResolver(quoteFormSchema)`, mais `useFieldArray` para a lista dinâmica de itens.

#### Props

```ts
interface QuoteFormProps {
  onSubmit: (values: QuoteFormValues) => void;
  submitting?: boolean;
}
```

#### Valores padrão (`defaultValues`)

```ts
{ message: '', validUntil: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] }
```

#### Título interno

`<h3>Enviar orçamento</h3>` — este título faz parte do próprio componente, não da página.

#### Campos, um a um

| Campo | Tipo de input | Label | Placeholder | Obrigatório/validação (Zod) | Mensagem de erro |
|---|---|---|---|---|---|
| `message` | `<textarea rows={3}>` | "Mensagem ao cliente" | — | `min(5)`, `max(2000)` | "Mínimo 5 caracteres" |
| `validUntil` | `<input type="date">` | "Válido até (opcional)" | — | `z.string().optional()` — nenhuma validação além de string opcional | — (sem mensagem, campo nunca falha) |
| `items[].description` | `<input>` texto | (sem label visível, só placeholder) | "Descrição" | `min(2)`, `max(200)` | "Mínimo 2 caracteres" |
| `items[].quantity` | `<input type="number" step="1">` | (sem label visível) | "Qtd" | `z.coerce.number().int()`, `.positive()` | "Deve ser inteiro" / "Deve ser maior que zero" |
| `items[].unitPrice` | `<input type="number" step="0.01">` | (sem label visível) | "Preço unit." | `z.coerce.number().nonnegative()` | "Não pode ser negativo" |

Nível de array `items`: `min(1, 'Adicione ao menos um item')`, `max(50)` — erros de nível de array exibidos via `errors.items?.root` e `errors.items?.message` (ambos verificados/renderizados no JSX, cobrindo diferentes formatos de erro que o RHF/Zod podem produzir para arrays).

#### Itens dinâmicos (`useFieldArray`)

- Renderiza uma linha por item (`fields.map`), cada linha em `flex items-start gap-2` contendo os três inputs (descrição flexível `flex-1`, quantidade `w-20`, preço unitário `w-28`) e um botão "Remover".
- Botão "Remover" (`onClick={() => remove(index)}`) é desabilitado quando `fields.length <= 1` (não permite remover o último item restante).
- Botão "Adicionar item" (`onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}`) — estilo outline (`border-slate-300`), fora do array de itens mas dentro do bloco de itens.

#### Botão de submit

`<button type="submit" disabled={submitting}>Enviar orçamento</button>` — mesmo padrão de estilo "cru" (`bg-slate-900 text-white`) do `DemandForm`, não usa o `Button` compartilhado.

#### Submissão

`handleSubmit(onSubmit)` chama diretamente a prop `onSubmit` com `QuoteFormValues` validado. Na página, isso alimenta `createQuote.mutate(values)` (`useCreateQuote`), que dispara `POST /demands/:id/quotes` e invalida `demandKeys.quotes(demandId)` em sucesso.

#### Observações

- Container do formulário: `rounded-xl border border-slate-200 p-4` — visualmente distinto (borda) dos demais blocos da página, que não têm borda.
- Assim como `DemandForm`, usa paleta de cores utilitária "crua" (`slate`, `red`) em vez dos tokens de design system (`ink`, `muted`, `surface`).
- Não há campo para descontos, impostos ou frete — apenas itens com quantidade × preço unitário (o `subtotal`/`total` finais são calculados/retornados pelo backend, não no formulário).

---

### Modal: InviteProfessionalDialog

- **Arquivo**: `frontend/src/features/demands/components/InviteProfessionalDialog.tsx`
- **Usado em**: `DemandDetailPage`, aberto pelo botão "Convidar profissional" no header.

#### Props

```ts
interface InviteProfessionalDialogProps {
  demandId: string;
  onClose: () => void;
}
```

#### Quem abre / quem fecha

- **Abertura**: controlada externamente pela `DemandDetailPage` via estado `inviting` (`setInviting(true)` no `onClick` do botão "Convidar profissional" do header). O próprio modal não decide quando aparecer — é montado/desmontado condicionalmente pelo pai (`{inviting && <InviteProfessionalDialog .../>}`).
- **Fechamento**: 
  - Botão "Cancelar" interno → chama `onClose` diretamente.
  - Botão "Convidar" → ao suceder a mutation (`invite.mutate(professionalId, { onSuccess: onClose })`), fecha automaticamente o modal.
  - Não há fechamento por clique fora do modal (backdrop) nem por tecla Esc — o overlay (`fixed inset-0 bg-black/40`) não tem handler de clique.

#### Estrutura visual

```
<div class="fixed inset-0 flex items-center justify-center bg-black/40">
  <div class="flex w-96 flex-col gap-3 rounded-xl bg-white p-5">
    <h3>Convidar profissional</h3>
    <input placeholder="ID do profissional" />
    <div class="flex justify-end gap-2">
      <button>Cancelar</button>
      <button>Convidar</button>
    </div>
  </div>
</div>
```

Modal centralizado (overlay full-screen escurecido a 40% de opacidade), card interno de largura fixa `w-96`, fundo branco sólido (`bg-white`, não usa tokens de tema como `bg-bg`/`bg-surface`).

#### Campos

| Campo | Tipo | Placeholder | Obrigatório | Validação |
|---|---|---|---|---|
| ID do profissional | `<input>` texto controlado (`useState`, não RHF/Zod) | "ID do profissional" | Implícito — botão "Convidar" fica desabilitado se vazio | Nenhuma validação de formato (não valida se é um UUID ou id existente); qualquer string não-vazia habilita o botão |

Não há uso de `react-hook-form`/`zodResolver` neste modal — é um `useState` simples (`professionalId`) sem schema de validação dedicado em `schemas.ts` (o arquivo `schemas.ts` não define nenhum schema para convite).

#### Botões

- **Cancelar** (`type="button"`): `onClick={onClose}` — fecha sem efeitos colaterais, texto cinza (`text-slate-500`), sem fundo.
- **Convidar** (`type="button"`): `disabled={invite.isPending || !professionalId}`; `onClick={() => invite.mutate(professionalId, { onSuccess: onClose })}`; estilo preenchido (`bg-slate-900 text-white`).

#### Mutation

`useInviteProfessional(demandId)` → `createQuote`-like mutation que chama `inviteProfessional(demandId, professionalId)` (`POST /demands/:id/invitations`, body `{ professionalId }`). **Não invalida nenhuma query** em sucesso (diferente de outras mutations da feature) e **não há tratamento de erro** (`onError`) — se a chamada falhar, o modal permanece aberto sem feedback visual de erro ao usuário (nenhum toast, nenhuma mensagem de erro renderizada).

#### Estados

- **Input vazio**: botão "Convidar" desabilitado.
- **Enviando** (`invite.isPending`): botão "Convidar" desabilitado (mesma condição do input vazio, usando `||`).
- **Sucesso**: fecha o modal automaticamente (via `onSuccess: onClose` passado ao `.mutate`).
- **Erro**: não tratado/exibido.

#### Responsividade

Largura fixa `w-96` (384px) sem variação por breakpoint; em telas muito estreitas o modal pode ultrapassar a viewport horizontalmente (não há `max-w-full` ou unidades relativas), já que não há classe de ajuste para mobile.

---

### Resumo de inconsistências observadas (apenas descritivo, sem prescrição)

Estes pontos são registrados apenas como fatos observados no código-fonte, para referência da documentação — não constituem recomendação:

1. `DemandCard` traduz `status` via `STATUS_LABELS`; `DemandDetailPage` exibe o valor bruto do enum (`open`, `in_progress`, etc.) no `Badge` do cabeçalho.
2. `DemandCard` usa uma função `currency` local; `QuoteCard` usa o helper compartilhado `formatCurrency` de `lib/utils`.
3. `DemandForm`, `QuoteForm` e `InviteProfessionalDialog` usam paleta de cores utilitária "crua" (`slate-*`, `red-600`, `bg-white`, `bg-slate-900`) enquanto as páginas e `DemandCard`/`QuoteCard` usam tokens de design system (`ink`, `muted`, `surface`, `accent`, `bg`).
4. `InviteProfessionalDialog` não usa `react-hook-form`/Zod, diferente de `DemandForm` e `QuoteForm`.
5. Nenhuma das três páginas trata explicitamente estados de erro de rede/API (sem leitura de `isError`/`error` nos hooks de query/mutation usados diretamente nas páginas).
6. `PublishDemandPage` chama `inviteProfessional` diretamente da camada `api.ts`, ignorando o hook `useInviteProfessional` já existente em `queries.ts`, e engole silenciosamente qualquer erro dessa chamada.
7. `useInviteProfessional` (hook) não invalida nenhuma query em `onSuccess`, diferente das demais mutations da feature.
8. `DemandDetailPage` não restringe por role a exibição do botão "Convidar profissional" nem a condição de exibição do botão "Aceitar" no `QuoteCard` (`canAccept` depende só de status, não de role/ownership).
9. `DemandListPage` não expõe nenhum controle de UI para o parâmetro `mine` que a API (`fetchDemands`) já aceita.

---

### Capítulo: 04-contracts

## Auditoria Técnica — Feature CONTRACTS

> Documento de levantamento (pré-redesign). Descreve exclusivamente o que existe hoje no código, sem sugerir alterações.

Diretório-base: `frontend/src/features/contracts/`

Arquivos analisados:
- `api.ts` (112 linhas) — chamadas HTTP e tipos de domínio
- `queries.ts` (83 linhas) — hooks React Query (queries e mutations)
- `schemas.ts` (12 linhas) — validação Zod dos formulários
- `components/ContractProgress.tsx` (28 linhas)
- `components/DisputeDialog.tsx` (52 linhas)
- `components/PaymentDialog.tsx` (76 linhas)
- `components/ProgressUpdateForm.tsx` (56 linhas)
- `pages/ContractListPage.tsx` (76 linhas)
- `pages/ContractDetailPage.tsx` (139 linhas)
- Também inspecionados (apenas leitura, para entender comportamento): `*.test.tsx` de cada arquivo acima.

---

### 1. Modelo de dados (`api.ts`, `schemas.ts`)

#### Tipos principais

**`ContractStatus`**: `'active' | 'completed' | 'cancelled' | 'disputed'`

**`ScheduleStatus`**: `'scheduled' | 'confirmed' | 'completed' | 'cancelled'`

**`Schedule`**
| Campo | Tipo |
|---|---|
| `id` | `string` |
| `scheduledDate` | `string` |
| `durationMinutes` | `number \| null` |
| `notes` | `string \| null` |
| `status` | `ScheduleStatus` |

**`Contract`**
| Campo | Tipo | Observação |
|---|---|---|
| `id` | `string` | |
| `demandId` | `string` | |
| `quoteId` | `string` | |
| `clientId` | `string` | id do registro de cliente |
| `professionalId` | `string` | id do registro de profissional (perfil, não usuário) |
| `total` | `number` | valor do contrato |
| `status` | `ContractStatus` | |
| `cancelledBy` | `string \| null` | |
| `cancellationReason` | `string \| null` | |
| `startedAt` | `string \| null` | marca se o profissional já iniciou o trabalho |
| `completedAt` | `string \| null` | |
| `cancelledAt` | `string \| null` | |
| `schedule` | `Schedule \| null` | agendamento vinculado |
| `clientName` | `string` | nome exibido do cliente (para visão do profissional) |
| `professionalHeadline` | `string` | headline exibido do profissional (para visão do cliente) |
| `professionalUserId` | `string` | **id do usuário** (não do perfil) do profissional — usado para comparar com `user.id` do auth store |
| `createdAt` | `string` | |

Observação: existe uma distinção entre `professionalId` (id do perfil profissional) e `professionalUserId` (id da conta/usuário). As checagens de propriedade do contrato (`isOwnProfessionalContract`) usam `professionalUserId`, não `professionalId`. Não há campo `clientUserId` explícito — `clientId` é comparado diretamente ao `user.id` para o fluxo de chat.

**`ProgressUpdate`**
| Campo | Tipo |
|---|---|
| `id` | `string` |
| `contractId` | `string` |
| `authorId` | `string` |
| `description` | `string` |
| `percentage` | `number \| null` |
| `images` | `string[]` |
| `createdAt` | `string` |

**`PaymentMethod`**: `'wallet' | 'credit_card' | 'pix' | 'boleto'`

**`PaymentStatus`**: `'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'`

**`Payment`**
| Campo | Tipo |
|---|---|
| `id` | `string` |
| `contractId` | `string` |
| `payerId` | `string` |
| `amount` | `number` |
| `status` | `PaymentStatus` |
| `method` | `PaymentMethod` |
| `paidAt` | `string \| null` |
| `createdAt` | `string` |

#### Funções de API (`api.ts`)

| Função | Método/Endpoint | Retorno | Observações |
|---|---|---|---|
| `fetchContracts()` | `GET /contracts` | `Contract[]` | lista completa do usuário logado (filtragem por dono ocorre no backend) |
| `fetchContract(id)` | `GET /contracts/:id` | `Contract` | |
| `fetchProgress(id)` | `GET /contracts/:id/progress` | `ProgressUpdate[]` | |
| `addProgress(id, values)` | `POST /contracts/:id/progress` | `ProgressUpdate` | envia `{ description, percentage, images: [] }` — `images` é sempre um array vazio fixo, não há input de imagens na UI apesar do tipo `ProgressUpdate.images` existir |
| `startContract(id)` | `POST /contracts/:id/start` | `Contract` | corpo vazio `{}` |
| `completeContract(id)` | `POST /contracts/:id/complete` | `Contract` | corpo vazio `{}` |
| `openDispute(id, reason)` | `POST /contracts/:id/disputes` | `void` | |
| `fetchPayment(contractId)` | `GET /contracts/:id/payment` | `Payment \| null` | trata 404 explicitamente via `axios.isAxiosError` e retorna `null` (nenhum pagamento ainda criado); qualquer outro erro é relançado |
| `payContract(contractId, method)` | `POST /contracts/:id/payment` | `Payment` | envia `{ method }` |

#### Validação (`schemas.ts`, Zod)

**`progressFormSchema`**
- `description`: `z.string().min(3, 'Descreva o progresso').max(1000)`
- `percentage`: `z.coerce.number().int().min(0).max(100)` — sem mensagem de erro customizada (usa mensagem padrão do Zod)

**`disputeFormSchema`**
- `reason`: `z.string().min(10, 'Mínimo 10 caracteres').max(2000)`

---

### 2. Camada de hooks (`queries.ts`)

#### Query keys
```
contractKeys.all            = ['contracts']
contractKeys.detail(id)     = ['contracts', 'detail', id]
contractKeys.progress(id)   = ['contracts', id, 'progress']
contractKeys.payment(id)    = ['contracts', id, 'payment']
```
Nota: `detail` usa um padrão de chave (`['contracts','detail',id]`) diferente de `progress`/`payment` (`['contracts', id, 'progress'|'payment']`), ou seja, não há uma hierarquia de invalidação única sob `['contracts', id]` para tudo — `all` (lista) não é automaticamente invalidada quando o detalhe muda.

#### Hooks expostos

| Hook | Tipo | queryFn/mutationFn | Invalidação no sucesso |
|---|---|---|---|
| `useContracts()` | query | `fetchContracts` | — |
| `useContract(id)` | query | `fetchContract(id)`, `enabled: !!id` | — |
| `useContractProgress(id)` | query | `fetchProgress(id)`, `enabled: !!id` | — |
| `useAddProgress(id)` | mutation | `addProgress(id, values)` | invalida `contractKeys.progress(id)` |
| `useStartContract(id)` | mutation | `startContract(id)` | invalida `contractKeys.detail(id)` |
| `useCompleteContract(id)` | mutation | `completeContract(id)` | invalida `contractKeys.detail(id)` |
| `useOpenDispute(id)` | mutation | `openDispute(id, reason)` | invalida `contractKeys.detail(id)` |
| `usePayment(contractId)` | query | `fetchPayment(contractId)`, `enabled: !!contractId` | — |
| `usePayContract(contractId)` | mutation | `payContract(contractId, method)` | invalida `contractKeys.payment(contractId)` **e** `contractKeys.detail(contractId)` |

Nenhum dos hooks usa `staleTime`, `retry` customizado, `select`, nem paginação. Nenhuma mutation invalida `contractKeys.all` — ou seja, ao voltar para a lista (`ContractListPage`) após uma mutation no detalhe, o React Query pode reutilizar cache desatualizado da lista até um refetch natural.

---

### 3. Tela: ContractListPage

- **Arquivo**: `pages/ContractListPage.tsx`
- **Rota**: `/contracts` (registrada em `router/index.tsx:49`, dentro do grupo `<ProtectedRoute />` sem restrição de `roles` — ou seja, qualquer usuário autenticado, seja `client`, `professional` ou `admin`, pode acessar)
- **Quem acessa**: qualquer usuário logado (client, professional, admin)
- **Objetivo**: listar todos os contratos do usuário autenticado, com navegação para o detalhe de cada um.

#### Descrição funcional

A página busca a lista de contratos via `useContracts()` (que chama `GET /contracts` — presume-se que o backend já filtra pelos contratos do usuário logado, já que não há parâmetros de filtro enviados pelo frontend). Lê o papel do usuário (`role`) do `useAuthStore` para decidir qual nome exibir em cada item da lista.

#### Fluxo do usuário

1. Usuário acessa `/contracts`.
2. Enquanto `isPending` é `true`, é exibido um único `Skeleton` (não há skeleton por item, é um placeholder genérico de altura fixa `h-16 w-full`).
3. Quando os dados chegam:
   - Se `data` é `undefined` ou array vazio → `EmptyState` com título "Nenhum contrato ainda" (sem descrição nem ação/CTA).
   - Caso contrário → lista de cards (`ContractListItem`), um por contrato, empilhados verticalmente (`flex flex-col gap-3`).
4. Ao clicar em qualquer card, chama `navigate(`/contracts/${contract.id}`)`, levando ao `ContractDetailPage`.

Não há diferenciação de fluxo entre client e professional além do nome exibido no card (ver abaixo); ambos veem a mesma lista de cards com o mesmo layout.

#### Hierarquia visual / layout

```
<div class="flex flex-col gap-4 p-6">
  <h1>Contratos</h1>            (text-3xl font-bold text-ink)
  [Skeleton | EmptyState | lista de cards]
</div>
```

Cada `ContractListItem` é renderizado como um `<button>` de largura total:
```
<button class="flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover">
  <div class="flex items-center justify-between gap-2">
    <span class="text-base font-semibold text-ink">{otherPartyName}</span>
    <Badge tone={disputed ? 'urgent' : 'neutral'}>
      [ícone XCircle se cancelled] {STATUS_LABELS[status]}
    </Badge>
  </div>
  <span class="text-sm text-muted">{formatCurrency(total)}</span>
</button>
```

- `otherPartyName`: se `role === 'professional'` → `contract.clientName`; caso contrário (client ou admin) → `contract.professionalHeadline`.
- Nenhuma paginação, nenhum filtro (por status, data, busca) na tela.
- Nenhuma ordenação visível no código (a ordem vem como veio da API).

#### Labels de status (`STATUS_LABELS`, duplicado também em `ContractDetailPage`)
```
active:    'Ativo'
completed: 'Concluído'
cancelled: 'Cancelado'
disputed:  'Em disputa'
```
O badge usa tone `'urgent'` apenas para `disputed`; todos os outros status (inclusive `cancelled`) usam tone `'neutral'`. Para `cancelled` especificamente, é exibido um ícone `XCircleIcon` (Heroicons, sólido, `h-3.5 w-3.5 text-muted`) ao lado do texto, com `data-testid="contract-cancelled-icon"` apenas nesta tela (na lista); no detalhe o mesmo ícone aparece sem esse `data-testid`.

#### Componentes usados
- `Badge` (`components/ui/Badge.tsx`) — tons `neutral` (bg-surface) e `urgent` (bg-accent)
- `Skeleton` (`components/ui/Skeleton.tsx`) — placeholder com `role="status"`, animação `animate-pulse` (respeitando `motion-reduce`)
- `EmptyState` (`components/ui/EmptyState.tsx`) — título, descrição opcional, ação opcional (aqui só título é usado)
- Ícone `XCircleIcon` de `@heroicons/react/24/solid`
- Função utilitária `formatCurrency` de `lib/utils`

#### Estados
| Estado | Condição | UI |
|---|---|---|
| Loading | `isPending === true` | `Skeleton` único, `h-16 w-full`, `aria-label="Carregando contratos"` |
| Vazio | `!data \|\| data.length === 0` | `EmptyState title="Nenhum contrato ainda"` |
| Sucesso | dados presentes | lista de cards |
| Erro | **não tratado explicitamente** — o hook `useContracts()` não expõe/consome `isError`/`error`; se a query falhar, a tela permanece renderizando a branch de "vazio" (pois `data` será `undefined`) sem qualquer indicação de que ocorreu um erro de rede |
| Permissão | não há checagem de `role` para acesso — a rota está apenas dentro do bloco genérico de `ProtectedRoute` (qualquer usuário autenticado) |

#### Hooks utilizados
- `useNavigate` (react-router-dom)
- `useAuthStore` (zustand, seletor `state => state.user?.role`)
- `useContracts()` (React Query, feature local)

#### Navegação
- Clique no card → `navigate('/contracts/:id')`
- Nenhum link de "voltar" ou breadcrumb na própria página.

#### Responsividade
- Não há classes responsivas (`sm:`, `md:`, etc.) em nenhum elemento desta página; o layout é fluido por padrão (flex-col, w-full), portanto se adapta a qualquer largura de tela sem breakpoints explícitos.

#### Complexidade e dependências
- Complexidade baixa: um único componente de apresentação (`ContractListItem`) inline no mesmo arquivo, sem subcomponentes externos além dos primitivos de UI.
- Dependências diretas: `react-router-dom`, `@heroicons/react/24/solid`, store de auth, query hook local, 3 componentes de UI compartilhados, utilitário de formatação de moeda.
- Nenhum teste cobre o estado de erro de rede nem paginação (porque não existem).

---

### 4. Tela: ContractDetailPage

- **Arquivo**: `pages/ContractDetailPage.tsx`
- **Rota**: `/contracts/:id` (dentro do bloco `<ProtectedRoute />` sem restrição de roles)
- **Quem acessa**: qualquer usuário logado; o conteúdo interno (botões/ações) varia conforme `role` e conforme ser ou não o dono (client ou professional) daquele contrato específico
- **Objetivo**: exibir detalhes de um contrato específico e permitir as ações do ciclo de vida: iniciar, registrar progresso, concluir, pagar, abrir disputa, conversar via chat e avaliar (review) ao final.

#### Descrição funcional

Busca em paralelo: o contrato (`useContract(id)`), as atualizações de progresso (`useContractProgress(id)`), e o pagamento associado (`usePayment(id)`). Usa `useAddProgress`, `useStartContract`, `useCompleteContract` (mutations) e `useCreateRoom` (do domínio `chat`, para abrir/criar sala de chat vinculada ao contrato). Mantém 3 estados locais de UI via `useState`: `disputing` (abre/fecha `DisputeDialog`), `paying` (abre/fecha `PaymentDialog`), `reviewDone` (oculta o formulário de avaliação após envio).

#### Fluxo do usuário

1. Usuário acessa `/contracts/:id` (por navegação da lista ou URL direta).
2. Enquanto `isPending || !contract` → tela mostra apenas um `Skeleton` (`h-24 w-full`, `aria-label="Carregando contrato"`) dentro de `<div class="p-6">`. **Não há tratamento de "contrato não encontrado" ou erro** — se a query falhar (404, 500, etc.), a página permanece no skeleton indefinidamente, pois a condição de loading é `isPending || !contract`, e nunca sai desse estado quando não há dado e não há mais "pending".
3. Após carregar, computam-se flags de permissão (ver seção "Regras de negócio / permissões" abaixo) e a página renderiza:
   - Cabeçalho com nome da outra parte, valor total, badge de status.
   - Bloco de agendamento (se `contract.schedule` existir).
   - Barra de ações (botões condicionais).
   - Formulário de progresso (condicional, só profissional dono com contrato iniciado).
   - Título "Acompanhamento" + componente `ContractProgress` (lista de atualizações, sempre visível, com fallback de "vazio" embutido no próprio componente).
   - Bloco de avaliação (condicional, `canReview`).
   - Modais (`DisputeDialog`, `PaymentDialog`) renderizados condicionalmente por estado local.

#### Diferenciação client vs professional

Variáveis calculadas a partir de `useAuthStore` e do `contract`:

```ts
isProfessional = user?.role === 'professional'
isClient = user?.role === 'client'
isOwnProfessionalContract = isProfessional && user?.id === contract.professionalUserId
```

Regras derivadas:

| Flag | Condição completa | Resultado visual |
|---|---|---|
| `canStart` | `isOwnProfessionalContract && status === 'active' && startedAt === null` | Botão "Iniciar contrato" |
| `canRegisterProgress` | `isOwnProfessionalContract && status === 'active' && startedAt !== null` | Botão "Concluir contrato" **+** `ProgressUpdateForm` visível |
| `canPay` | `isClient && status !== 'cancelled' && status !== 'disputed' && (!payment \|\| payment.status !== 'captured')` | Botão "Pagar" |
| `canReview` | `!reviewDone && status === 'completed' && (isClient \|\| isProfessional)` | Bloco "Avaliar" com `ReviewForm` |
| `otherPartyName` | `isProfessional ? contract.clientName : contract.professionalHeadline` | Nome no cabeçalho |

Notas importantes:
- Um usuário `professional` que **não é dono** do contrato (`isOwnProfessionalContract === false`) não vê nem "Iniciar", nem "Concluir", nem o formulário de progresso — mas ainda vê Chat e "Abrir disputa" (esses dois botões não têm checagem de papel/posse, aparecem sempre).
- Um usuário `admin` (que não é `client` nem `professional`) só teria acesso a Chat e "Abrir disputa" — nenhuma outra ação é exposta para admin nesta tela.
- `canReview` não verifica posse do contrato — qualquer usuário com role `client` ou `professional` vê o bloco de avaliação quando `status === 'completed'`, mesmo que não seja parte do contrato (não há checagem adicional de `user.id` contra `clientId`/`professionalUserId` para essa flag especificamente).
- O botão "Abrir disputa" e o botão "Chat" são exibidos **incondicionalmente** para qualquer status de contrato e qualquer papel (nenhuma regra de `canDispute`/`canChat` explícita), inclusive em contratos já `cancelled`, `completed` ou `disputed`.

#### Hierarquia visual / layout

```
<div class="mx-auto flex max-w-3xl flex-col gap-4 p-6">
  <header class="flex items-center justify-between gap-2">
    <div>
      <h1>{otherPartyName}</h1>              (text-2xl font-bold)
      <p>{formatCurrency(total)}</p>         (text-sm text-muted)
    </div>
    <Badge tone={disputed?'urgent':'neutral'}>[ícone se cancelled] {STATUS_LABELS[status]}</Badge>
  </header>

  [se schedule] <div class="rounded-lg bg-surface p-3">
    <p>{formatDate(schedule.scheduledDate)}</p>
    [se notes] <p class="text-muted">{schedule.notes}</p>
  </div>

  <div class="flex flex-wrap gap-2">   -- barra de ações
    [canStart]            Button "Iniciar contrato"
    [canRegisterProgress]  Button "Concluir contrato"
    [canPay]               Button "Pagar"
    Button ghost "Chat"
    Button ghost "Abrir disputa"
  </div>

  [canRegisterProgress] <ProgressUpdateForm .../>

  <h2>Acompanhamento</h2>
  <ContractProgress updates={updates ?? []} />

  [canReview] <div>
    <h2>Avaliar</h2>
    <ReviewForm contractId onDone={...} />
  </div>

  [disputing] <DisputeDialog .../>
  [paying]    <PaymentDialog .../>
</div>
```

Largura do conteúdo limitada a `max-w-3xl` e centralizada (`mx-auto`), diferente da lista que ocupa toda a largura disponível.

#### Componentes utilizados nesta tela
- `ContractProgress` (local, ver seção 5)
- `ProgressUpdateForm` (local, ver seção 6)
- `DisputeDialog` (local, ver seção 7)
- `PaymentDialog` (local, ver seção 8)
- `ReviewForm` (de `features/reviews/components/ReviewForm`, fora do escopo desta auditoria, mas usado aqui: recebe `contractId` e `onDone`)
- `Badge`, `Button`, `Skeleton` (`components/ui`)
- Ícone `XCircleIcon` (Heroicons sólido)

#### Estados
| Estado | Condição | UI |
|---|---|---|
| Loading | `isPending || !contract` | `Skeleton` `h-24 w-full` |
| Erro (contrato) | **não tratado** — sem `isError` consumido; se a query falhar permanentemente, tela trava no skeleton | — |
| Progresso vazio | `updates` vazio ou `undefined` | delegado ao `ContractProgress`, que renderiza `EmptyState` internamente |
| Pagamento inexistente | `usePayment` retorna `null` (404 tratado em `fetchPayment`) | `canPay` considera `!payment` como "ainda pode pagar" |
| Avaliação enviada | `reviewDone === true` | bloco de avaliação some da tela |
| Permissão | calculada via `role` + comparação de IDs (ver tabela acima); não há tela de bloqueio/403 — os elementos apenas não são renderizados condicionalmente | — |

#### Hooks utilizados
- `useParams`, `useNavigate` (react-router-dom)
- `useAuthStore` (zustand)
- `useState` (3 estados locais: `disputing`, `paying`, `reviewDone`)
- `useContract(id)`, `useContractProgress(id)`, `useAddProgress(id)`, `useStartContract(id)`, `useCompleteContract(id)`, `usePayment(id)` (feature local)
- `useCreateRoom()` (feature `chat`)

#### Chamadas de API / mutations disparadas nesta tela
- `GET /contracts/:id` (via `useContract`)
- `GET /contracts/:id/progress` (via `useContractProgress`)
- `GET /contracts/:id/payment` (via `usePayment`)
- `POST /contracts/:id/start` (botão "Iniciar contrato")
- `POST /contracts/:id/complete` (botão "Concluir contrato")
- `POST /contracts/:id/progress` (via `ProgressUpdateForm`, indiretamente)
- Chat: mutation `useCreateRoom` (endpoint fora do escopo desta auditoria) com payload `{ participantId, contractId }`, onde `participantId` = `isClient ? contract.professionalUserId : contract.clientId` (ou seja, o outro lado da conversa)

#### Navegação / toasts
- `handleChat`: ao clicar em "Chat", chama `createRoom.mutate({ participantId, contractId }, { onSuccess: room => navigate(\`/chat/${room.id}\`) })` — navega para a sala de chat recém-criada/obtida.
- **Nenhum toast/notificação visível** é disparado por nenhuma mutation desta tela (start, complete, add progress, dispute, payment) — o feedback de sucesso é apenas via re-render reativo (badge de status muda, formulário some, modal fecha), e o feedback de erro só existe explicitamente dentro do `PaymentDialog` (mensagem de texto inline); as demais mutations (`startContract`, `completeContract`, `addProgress`, `openDispute`) não exibem nenhuma mensagem de erro na UI caso falhem — apenas o estado `isPending` desabilita o botão durante o request.

#### Responsividade
- `flex flex-wrap gap-2` na barra de botões permite quebra de linha em telas estreitas.
- Sem breakpoints (`sm:`/`md:`) explícitos; `max-w-3xl` limita a largura em telas grandes mas o conteúdo é fluido abaixo disso.

#### Complexidade e dependências
- É a tela mais complexa da feature: orquestra 6 hooks de dados/mutação locais + 1 hook de outra feature (chat), 4 componentes locais (2 modais, 1 form, 1 lista) e 1 componente de outra feature (`ReviewForm`).
- Lógica de permissão é feita inteiramente inline na função do componente (não extraída para hook/helper), com 5 flags booleanas (`canStart`, `canRegisterProgress`, `canPay`, `canReview`, `isOwnProfessionalContract`) calculadas a cada render.
- Acoplamento cruzado com os domínios: `auth` (store), `chat` (mutation + navegação), `reviews` (componente), `wallet` (indireto, dentro do `PaymentDialog`).

---

### 5. Componente: ContractProgress

- **Arquivo**: `components/ContractProgress.tsx`
- **Usado em**: `ContractDetailPage` (seção "Acompanhamento"), sempre renderizado (não é condicional ao papel do usuário — tanto client quanto professional veem a mesma lista).

#### Props
```ts
interface ContractProgressProps {
  updates: ProgressUpdate[];
}
```

#### Comportamento / visualização
Não é um stepper nem uma timeline com conectores visuais — é uma **lista ordenada simples** (`<ol>`) de "cards" empilhados verticalmente (`flex flex-col gap-2`), um por `ProgressUpdate`, sem indicadores de conexão entre itens (sem linha vertical, sem marcador de "etapa X de Y", sem ícones de check).

Cada item (`<li>`, `rounded-lg bg-surface p-3`):
```
<div class="flex items-center justify-between gap-2">
  <span class="font-medium text-ink">{update.description}</span>
  [se percentage !== null] <span class="text-sm text-muted">{percentage}%</span>
</div>
<span class="text-xs text-muted">{formatDate(update.createdAt)}</span>
```

- Ordem de exibição: a ordem vem tal como recebida da API (`updates.map`), sem reordenação/ordenação no cliente por data.
- Estado vazio: se `updates.length === 0`, retorna `<EmptyState title="Nenhuma atualização de progresso ainda" />` (sem descrição, sem ação) — **substitui completamente** a lista, não há um "esqueleto" de progresso 0%.
- Não exibe `authorId` nem imagens (`update.images`), embora o tipo `ProgressUpdate` inclua um array `images: string[]` — o componente não renderiza nenhuma imagem.
- Não há paginação/scroll virtual — todos os `updates` são renderizados de uma vez.

#### Dependências
- `EmptyState` (`components/ui`)
- `formatDate` (`lib/utils`)
- Tipo `ProgressUpdate` de `../api`

---

### 6. Formulário: ProgressUpdateForm

- **Arquivo**: `components/ProgressUpdateForm.tsx`
- **Usado em**: `ContractDetailPage`, renderizado apenas quando `canRegisterProgress === true` (ou seja, somente para o profissional dono do contrato, com contrato `active` e já `startedAt !== null`)
- **Objetivo**: permitir ao profissional registrar uma nova atualização de progresso do serviço em andamento.

#### Props
```ts
interface ProgressUpdateFormProps {
  onSubmit: (values: ProgressFormValues) => void;
  submitting?: boolean;
}
```
O formulário **não** chama a mutation diretamente — delega ao `onSubmit` recebido via prop (que, na página, é `(values) => addProgress.mutate(values)`).

#### Campos

| Campo | `name` | Tipo de input | Obrigatório | Placeholder | Validação (Zod) | Mensagem de erro |
|---|---|---|---|---|---|---|
| Descrição do progresso | `description` | `<textarea rows={3}>` | sim | nenhum (`placeholder` não definido) | `min(3).max(1000)` | "Descreva o progresso" (min); mensagem padrão do Zod para max |
| Percentual concluído | `percentage` | `<input type="number">` | sim | nenhum | `z.coerce.number().int().min(0).max(100)` | mensagem padrão do Zod (não customizada) — não há `min`/`max` HTML nativos no `<input>`, a validação de faixa é só via Zod no submit |

- Ambos os campos usam `id`/`htmlFor` (`progress-description`, `progress-percentage`) e `label` com texto auxiliar em `text-sm text-muted` acima do controle.
- Valores padrão: `{ description: '', percentage: 0 }`.
- Resolver: `zodResolver(progressFormSchema)`.
- Erros exibidos como `<span class="text-xs text-accent">{errors.field?.message}</span>` logo abaixo de cada campo, condicionalmente.

#### Botão
- `<Button type="submit" disabled={submitting}>Registrar progresso</Button>` — variante padrão (`primary`, já que não é passada `variant`).

#### Comportamento de submit
```ts
handleSubmit((values) => {
  onSubmit(values);
  reset();
})
```
O `reset()` do react-hook-form é chamado **imediatamente após** invocar `onSubmit`, sem esperar a mutation resolver (não há `await`/callback de sucesso) — ou seja, o formulário é limpo de forma otimista, independentemente de a mutation ter sucesso ou falhar.

#### Estados
- `submitting` (prop, vindo de `addProgress.isPending` na página) desabilita o botão de submit enquanto a mutation está em andamento.
- **Não há feedback de erro da mutation dentro do formulário** — se `addProgress` falhar, não há mensagem visível (nem no form nem na página).
- Não há indicação de sucesso (toast, mensagem) após envio bem-sucedido; a única "confirmação" visual indireta é a nova entrada aparecendo na lista de `ContractProgress` (após invalidação da query `contractKeys.progress(id)`).

#### Container/estilo
`<form class="flex flex-col gap-2 rounded-lg bg-surface p-3">` — visualmente semelhante a um card, mesmo padrão de fundo (`bg-surface`) dos demais blocos da página.

---

### 7. Modal: DisputeDialog

- **Arquivo**: `components/DisputeDialog.tsx`
- **Quem abre**: `ContractDetailPage`, ao clicar no botão "Abrir disputa" (`setDisputing(true)`) — disponível para **qualquer** usuário logado que acesse a tela (sem checagem de papel/posse do contrato, sem checagem de status do contrato)
- **Quem fecha**: 
  - Botão "Cancelar" dentro do modal (`onClick={onClose}`)
  - Botão "×" no cabeçalho do `Modal` (compartilhado)
  - Tecla `Escape` (comportamento do componente `Modal` compartilhado)
  - Clique fora do modal: **não fecha** — o `Modal` compartilhado não tem handler de clique no backdrop, só o botão "×", o botão de cancelar da ação, ou Escape fecham
  - Sucesso do submit (`onSuccess: onClose` passado à mutation)
- **Objetivo**: permitir abrir uma disputa sobre o contrato, enviando um motivo textual.

#### Props
```ts
interface DisputeDialogProps {
  contractId: string;
  onClose: () => void;
}
```
Não recebe callback de sucesso separado — o fechamento em si já é o único efeito colateral tratado no componente pai.

#### Campos

| Campo | `name` | Tipo | Obrigatório | Validação | Mensagem de erro |
|---|---|---|---|---|---|
| Motivo | `reason` | `<textarea rows={4}>` | sim | `min(10).max(2000)` (Zod) | "Mínimo 10 caracteres" (min); mensagem padrão do Zod para max |

- `id`/`htmlFor`: `dispute-reason`
- Label: "Motivo" (`text-sm text-muted`)
- Valor padrão: `{ reason: '' }`
- Resolver: `zodResolver(disputeFormSchema)`

#### Botões
- "Cancelar" — `type="button"`, `variant="ghost"`, chama `onClose` diretamente.
- "Abrir disputa" — `type="submit"`, `variant="accent"`, `disabled={dispute.isPending}`.

#### Submit / mutation
```ts
handleSubmit((values) => dispute.mutate(values.reason, { onSuccess: onClose }))
```
- Mutation: `useOpenDispute(contractId)` → `POST /contracts/:id/disputes` com `{ reason }`.
- Ao sucesso: invalida `contractKeys.detail(contractId)` (dentro do hook) e fecha o modal (`onClose`, passado como callback local do `mutate`).
- **Não há mensagem de erro exibida** se a mutation falhar — não há bloco condicional para `dispute.isError` neste componente (diferente do `PaymentDialog`, que trata erro explicitamente).

#### Título e estrutura do Modal
- `title="Abrir disputa"` passado ao `Modal` compartilhado (renderizado no cabeçalho, `role="dialog"`, `aria-modal="true"`, `aria-label` = título).
- Modal usa `createPortal` para `document.body`; container com `max-w-lg`, `bg-bg`, `rounded-lg`, `shadow-modal`, sobreposto por backdrop `bg-ink/40` cobrindo a tela inteira.

---

### 8. Modal: PaymentDialog

- **Arquivo**: `components/PaymentDialog.tsx`
- **Quem abre**: `ContractDetailPage`, ao clicar no botão "Pagar" (`setPaying(true)`) — só aparece esse botão quando `canPay === true` (cliente, contrato não cancelado/disputado, sem pagamento capturado)
- **Quem fecha**: botão "Cancelar", botão "×" do `Modal`, tecla Escape, ou sucesso do pagamento (`onSuccess: onClose`)
- **Objetivo**: permitir ao cliente escolher um método de pagamento e confirmar o pagamento do valor total do contrato.

#### Props
```ts
interface PaymentDialogProps {
  contractId: string;
  total: number;
  onClose: () => void;
}
```

#### Dados carregados
- `useWallet()` (hook da feature `wallet`, fora do escopo direto desta auditoria) — busca saldo da carteira do usuário, usado apenas para validar se há saldo suficiente quando o método selecionado é `wallet`.

#### Campos / conteúdo

1. **Texto informativo**: "Valor a pagar: **{formatCurrency(total)}**" (não é um campo, é somente leitura).
2. **Fieldset de método de pagamento** (`<fieldset>` com `<legend>Método de pagamento</legend>`):
   - Um `<input type="radio" name="payment-method">` por opção, controlado via `useState<PaymentMethod>('wallet')` (não usa react-hook-form/Zod — estado local simples, sem schema de validação).
   - Opções e labels (`METHOD_LABELS`):
     - `wallet` → "Carteira"
     - `credit_card` → "Cartão de crédito"
     - `pix` → "Pix"
     - `boleto` → "Boleto"
   - Valor padrão selecionado: `wallet`.
   - Cada `label`/`input` tem `id="payment-method-{option}"`.

#### Regras/validações
- `insufficientBalance = method === 'wallet' && wallet !== undefined && wallet.balance < total` — se verdadeiro, exibe texto de aviso: "Saldo da carteira insuficiente para pagar com este método." (`text-xs text-accent`) e desabilita o botão de confirmar.
- Se `payContract.isError === true`, exibe: "Não foi possível processar o pagamento." (mesma classe de estilo do aviso de saldo).
- Não há validação de outros métodos (cartão, pix, boleto) — nenhum campo adicional é solicitado para esses métodos (sem número de cartão, CPF, etc.) — a escolha do método por si só habilita o botão de confirmar (exceto `wallet` com saldo insuficiente).

#### Botões
- "Cancelar" — `type="button"`, `variant="ghost"`, chama `onClose`.
- "Confirmar pagamento" — `type="button"` (não é `submit`, pois não há `<form>` envolvendo o conteúdo — é feito diretamente por `onClick`), `disabled={payContract.isPending || insufficientBalance}`, chama `payContract.mutate(method, { onSuccess: onClose })`.

#### Mutation
- `usePayContract(contractId)` → `POST /contracts/:id/payment` com `{ method }`.
- Ao sucesso: invalida `contractKeys.payment(contractId)` e `contractKeys.detail(contractId)`; fecha o modal via callback local.

#### Estados
| Estado | Condição | UI |
|---|---|---|
| Carregando saldo | `wallet === undefined` (implícito, enquanto `useWallet` não retorna) | nenhum tratamento de loading explícito para o saldo — o aviso de saldo insuficiente simplesmente não aparece até os dados chegarem |
| Saldo insuficiente | `insufficientBalance` | aviso em texto + botão de confirmar desabilitado |
| Erro no pagamento | `payContract.isError` | mensagem de erro em texto |
| Enviando | `payContract.isPending` | botão de confirmar desabilitado |
| Sucesso | mutation resolve | modal fecha (`onClose`) |

#### Título e estrutura do Modal
- `title="Pagar contrato"`.
- Mesmo componente `Modal` compartilhado (portal, `role="dialog"`, Escape fecha, botão "×").

---

### 9. Componentes de UI compartilhados usados na feature

| Componente | Arquivo | Usado por |
|---|---|---|
| `Modal` | `components/ui/Modal.tsx` | `DisputeDialog`, `PaymentDialog` |
| `Button` | `components/ui/Button.tsx` | `ContractDetailPage`, `ProgressUpdateForm`, `DisputeDialog`, `PaymentDialog` |
| `Badge` | `components/ui/Badge.tsx` | `ContractListPage`, `ContractDetailPage` |
| `Skeleton` | `components/ui/Skeleton.tsx` | `ContractListPage`, `ContractDetailPage` |
| `EmptyState` | `components/ui/EmptyState.tsx` | `ContractListPage`, `ContractProgress` |

Detalhes técnicos do `Modal` compartilhado (relevantes para ambos os diálogos):
- Fecha com `Escape` via `useEffect`/`addEventListener('keydown', ...)`.
- Renderizado via `createPortal(..., document.body)`.
- Não fecha ao clicar no backdrop (não há handler de clique no `<div>` de fundo).
- Atributos de acessibilidade: `role="dialog"`, `aria-modal="true"`, `aria-label={title}`.
- Não faz gerenciamento de foco (sem foco automático no primeiro campo, sem focus trap, sem retorno de foco ao elemento que abriu o modal) — nenhum destes comportamentos está implementado no código.

`Button` variantes: `primary` (padrão), `accent`, `ghost`; tamanhos `sm`/`md` (padrão `md`). No fluxo de contratos: `PaymentDialog` e `ProgressUpdateForm` usam padrão `primary` implícito para os botões de ação principal; `DisputeDialog` usa `accent` para "Abrir disputa"; botões "Cancelar" usam sempre `ghost`.

---

### 10. Dependências externas usadas na feature

- `axios` (verificação de erro 404 em `fetchPayment`)
- `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`)
- `react-hook-form` + `@hookform/resolvers/zod` (formulários `ProgressUpdateForm`, `DisputeDialog`)
- `zod` (schemas de validação)
- `react-router-dom` (`useParams`, `useNavigate`)
- `@heroicons/react/24/solid` (`XCircleIcon`)
- Zustand (`useAuthStore`)

Dependências cruzadas com outras features:
- `features/wallet/queries` (`useWallet`, dentro de `PaymentDialog`)
- `features/chat/queries` (`useCreateRoom`, dentro de `ContractDetailPage`)
- `features/reviews/components/ReviewForm` (dentro de `ContractDetailPage`)

---

### 11. Observações consolidadas (fatos, sem recomendação)

- Não existe tratamento de estado de erro de rede (`isError`) em `useContracts`, `useContract`, `useContractProgress`, `useStartContract`, `useCompleteContract`, `useAddProgress` e `useOpenDispute` nas telas/componentes — o único lugar da feature que trata explicitamente `isError` de uma mutation é o `PaymentDialog`.
- Não existe nenhum toast/notificação global disparado por nenhuma ação desta feature (start, complete, progress, dispute, payment); o único feedback textual de erro embutido é o do `PaymentDialog`.
- `ContractDetailPage` fica preso indefinidamente no `Skeleton` de carregamento caso a query do contrato retorne erro (não há fallback de "contrato não encontrado" nem redirecionamento).
- O botão "Chat" e o botão "Abrir disputa" são exibidos para qualquer status de contrato e qualquer papel de usuário na tela de detalhe, sem checagem de posse do contrato.
- `canReview` não verifica se o usuário é de fato parte (`clientId`/`professionalUserId`) do contrato, apenas checa `role` e `status === 'completed'`.
- O campo `images` de `ProgressUpdate` existe no tipo e é sempre enviado como array vazio (`images: []`) em `addProgress`; não há UI de upload de imagens em `ProgressUpdateForm`.
- `ContractProgress` não é um stepper/timeline com marcação visual de progressão — é uma lista simples ordenada conforme a ordem retornada pela API.
- `ProgressUpdateForm` (chamado via prop `onSubmit`) limpa o formulário (`reset()`) de forma síncrona e otimista, sem esperar confirmação da mutation.
- Nenhuma das mutations desta feature invalida `contractKeys.all` (a lista); apenas `detail`, `progress` ou `payment` são invalidados conforme o caso.
- `STATUS_LABELS` (mapa de rótulos de status) está duplicado, com o mesmo conteúdo, em `ContractListPage.tsx` e `ContractDetailPage.tsx`.
- Nenhuma das duas páginas (`ContractListPage`, `ContractDetailPage`) usa classes de breakpoint responsivo (`sm:`, `md:`, `lg:`); a adaptação a diferentes larguras de tela decorre apenas do uso de flexbox fluido e, no caso do detalhe, de um `max-w-3xl` centralizado.
- O `Modal` compartilhado não implementa focus trap nem fecha ao clicar fora (apenas Escape ou botões internos fecham).

---

### Capítulo: 05-dashboard-client

## Auditoria Frontend — Domínio: Dashboard do Cliente

Documento de auditoria técnica pré-redesign. Este arquivo descreve, sem juízo de valor e sem sugestões de melhoria, o estado atual da feature `features/dashboard/` (dashboard do cliente) do frontend React + TypeScript do projeto.

Arquivos cobertos:
- `frontend/src/features/dashboard/pages/ClientDashboardPage.tsx`
- `frontend/src/features/dashboard/components/DashboardQuickActions.tsx`
- `frontend/src/features/dashboard/components/DashboardDemandsWidget.tsx`
- `frontend/src/features/dashboard/components/DashboardContractsWidget.tsx`
- `frontend/src/features/dashboard/components/DashboardScheduleWidget.tsx`
- `frontend/src/features/dashboard/components/DashboardFavoritesWidget.tsx`
- `frontend/src/features/dashboard/components/DashboardNotificationsWidget.tsx`
- (suporte) `frontend/src/pages/HomeRoute.tsx`, `frontend/src/components/ui/Card.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `Avatar.tsx`, `Button.tsx`, `frontend/src/lib/utils.ts`

---

### Roteamento e controle de acesso — HomeRoute

**Arquivo**: `frontend/src/pages/HomeRoute.tsx`

A rota raiz (`/`) é servida pelo componente `HomeRoute`, que decide qual tela renderizar de acordo com o `role` do usuário autenticado, lido via `useAuthStore` (store `../stores/auth`, propriedade `user`):

```tsx
export function HomeRoute(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }

  if (user?.role === 'professional') {
    return <ProfessionalDashboardPage />;
  }

  return <LandingPage />;
}
```

Regras observadas:
- `user.role === 'client'` → renderiza `ClientDashboardPage` (features/dashboard/pages).
- `user.role === 'professional'` → renderiza `ProfessionalDashboardPage` (features/professional-dashboard/pages), fora do escopo deste documento.
- Qualquer outro caso (usuário deslogado, `user` `undefined`/`null`, ou `role` diferente de `client`/`professional`, ex.: `admin`) → renderiza `LandingPage` (features/landing/pages).
- Não há tratamento explícito para `role === 'admin'` dentro de `HomeRoute` — um admin autenticado cai no fallback `LandingPage`, já que a condição só verifica `client` e `professional`.
- Não há estado de loading/skeleton no próprio `HomeRoute` enquanto o `authStore` é hidratado; a decisão é síncrona a partir do valor corrente da store.

---

### Tela: ClientDashboardPage

**Nome**: Painel do Cliente (título visível na tela: "Painel")
**Arquivo**: `frontend/src/features/dashboard/pages/ClientDashboardPage.tsx`
**Rota**: `/` (via `HomeRoute`, condicional a `user.role === 'client'`)
**Quem acessa**: usuário autenticado com `role === 'client'`
**Objetivo**: página inicial do cliente logado, agregando em um único painel: ações rápidas, demandas abertas, contratos, próximo agendamento, profissionais favoritos e notificações recentes.

#### Descrição funcional

`ClientDashboardPage` é um componente funcional stateless em relação a dados próprios — não possui `useState`/`useEffect`/chamadas de API diretas. Toda a lógica de busca de dados é delegada aos widgets filhos, cada um responsável por sua própria query React Query. A página apenas define o layout (grid) e a ordem de renderização dos widgets.

Código completo do componente:

```tsx
export function ClientDashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardDemandsWidget />
        <DashboardContractsWidget />
        <DashboardScheduleWidget />
        <DashboardFavoritesWidget />
        <DashboardNotificationsWidget />
      </div>
    </div>
  );
}

export default ClientDashboardPage;
```

Exporta tanto uma named export (`ClientDashboardPage`) quanto um `default export` — o `HomeRoute` importa via named export (`import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage'`).

#### Fluxo do usuário

1. Usuário com `role === 'client'` acessa `/` (login redireciona para raiz, ou navegação direta).
2. `HomeRoute` renderiza `ClientDashboardPage`.
3. A página monta o cabeçalho ("Painel" + ações rápidas) e, em paralelo, dispara 5 hooks de dados independentes (um por widget: demandas, contratos, contratos novamente para agendamento, favoritos, notificações).
4. Cada widget renderiza de forma independente seu próprio ciclo loading → dado/vazio, sem coordenação entre widgets (não há um loading global de página, nem um skeleton de página inteira).
5. A partir daqui, o usuário pode:
   - Clicar em botões de ação rápida (topo) para navegar a `/demands/new`, `/search`, `/contracts`.
   - Clicar em links dentro de cada widget para navegar a telas de detalhe/lista (ver seção "Navegação" de cada widget abaixo).
6. Não há refresh automático nem polling nesta tela: os dados vêm de `useQuery` do React Query com as configurações default do projeto (comportamento de cache/refetch não é sobrescrito nestes hooks específicos).

#### Hierarquia visual e layout

Estrutura de blocos (top-down):

1. **Container raiz**: `<div className="flex flex-col gap-6 p-6">` — layout em coluna, gap de 6 (1.5rem), padding de 6 (1.5rem) em todos os lados. Sem `max-width`/centralização explícita neste componente.
2. **Cabeçalho** (`<div className="flex flex-wrap items-center justify-between gap-4">`):
   - `<h1 className="text-3xl font-bold text-ink">Painel</h1>` — título da página.
   - `<DashboardQuickActions />` — botões de ação rápida, alinhados à direita (via `justify-between`) e ao mesmo nível vertical do título (`items-center`). `flex-wrap` permite que o bloco de botões quebre para a linha seguinte em telas estreitas.
3. **Grid de widgets** (`<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">`):
   - Mobile (abaixo de `md`): 1 coluna — todos os widgets empilhados verticalmente.
   - Tablet (`md:`, ≥768px conforme convenção Tailwind padrão): 2 colunas.
   - Desktop (`lg:`, ≥1024px): 3 colunas.
   - Gap de 4 (1rem) entre células do grid, tanto na horizontal quanto na vertical.
   - Não há definição de `grid-row`/`col-span` em nenhum widget — todos ocupam exatamente 1 célula de grid cada, e o CSS Grid os posiciona automaticamente na ordem em que aparecem no JSX (fluxo padrão do grid, sem áreas nomeadas).

**Ordem de renderização dos widgets no grid** (define a posição no fluxo automático do grid):
1. `DashboardDemandsWidget` — "Demandas abertas"
2. `DashboardContractsWidget` — "Contratos"
3. `DashboardScheduleWidget` — "Próximo agendamento"
4. `DashboardFavoritesWidget` — "Profissionais favoritos"
5. `DashboardNotificationsWidget` — "Notificações recentes"

Em desktop (3 colunas), isso resulta em: linha 1 = Demandas / Contratos / Agendamento; linha 2 = Favoritos / Notificações (2 células, 1 vazia na 3ª coluna). Em tablet (2 colunas): linha 1 = Demandas / Contratos; linha 2 = Agendamento / Favoritos; linha 3 = Notificações. Em mobile (1 coluna): empilhados na ordem acima.

Importante: `DashboardScheduleWidget` pode retornar `null` (ver seção do widget) quando não há agendamento futuro — nesse caso, a célula de grid correspondente simplesmente não existe, e os widgets seguintes "sobem" uma posição no fluxo do grid (não há espaço reservado/placeholder).

Todos os widgets compartilham o mesmo componente-base `Card` (`rounded-lg bg-bg p-6`), dando uniformidade visual (cantos arredondados, padding interno de 6, fundo `bg-bg`) — não há variação de tamanho entre cards (nenhum widget usa `col-span`/`row-span`), todos ocupam a mesma célula de grid com altura de conteúdo variável (a altura do card se ajusta ao conteúdo, sem altura fixa/mínima definida).

#### Todos os componentes usados

**Componentes de feature (próprios do dashboard)**:
- `DashboardQuickActions`
- `DashboardDemandsWidget`
- `DashboardContractsWidget`
- `DashboardScheduleWidget`
- `DashboardFavoritesWidget`
- `DashboardNotificationsWidget`

**Componentes compartilhados de `components/ui/`** (usados pelos widgets, não pela página diretamente):
- `Card` (`components/ui/Card.tsx`)
- `Skeleton` (`components/ui/Skeleton.tsx`)
- `EmptyState` (`components/ui/EmptyState.tsx`)
- `Avatar` (`components/ui/Avatar.tsx`) — usado apenas em `DashboardFavoritesWidget`
- `Button` (`components/ui/Button.tsx`) — usado apenas em `DashboardQuickActions`

**Componentes de roteamento**:
- `Link` do `react-router-dom` — usado em `DashboardContractsWidget`, `DashboardDemandsWidget`, `DashboardFavoritesWidget` (indireto via `FavoriteProfessionalPreview`), `DashboardNotificationsWidget`.
- `useNavigate` do `react-router-dom` — usado em `DashboardQuickActions`.

A própria `ClientDashboardPage` não importa nenhum componente de `components/ui/` diretamente — apenas `div`/`h1` nativos com classes Tailwind.

#### Estados globais da página

A página em si não define estado de loading/erro/sucesso — não há um "loading global" nem tratamento de erro consolidado. Cada widget gerencia seu próprio ciclo de loading via `isPending` do React Query e não há tratamento de estado de erro (`isError`) em nenhum dos 6 componentes do domínio — nenhum deles lê ou usa `error`/`isError` do retorno de `useQuery`. Em caso de falha da requisição, o comportamento visual não é tratado explicitamente no código destes componentes (cai no comportamento default do React Query: `data` permanece `undefined`, o que os widgets tratam via `data ?? []`/`!data` — ou seja, uma falha de rede tende a ser visualmente indistinguível de "lista vazia").

#### Responsividade

- Grid responsivo com 3 breakpoints (`grid-cols-1` mobile, `md:grid-cols-2`, `lg:grid-cols-3`), controlado inteiramente por classes utilitárias Tailwind no componente da página.
- Cabeçalho com `flex-wrap`, permitindo que os botões de ação rápida quebrem linha em telas estreitas.
- Não há tratamento de layout específico para orientação (portrait/landscape) nem breakpoints customizados (`sm`, `xl`, `2xl`) usados nesta página.
- Nenhum widget individual define comportamento responsivo próprio (breakpoints) — cada `Card` ocupa 100% da largura da célula do grid em que está, e o conteúdo interno (textos, listas, botões) usa classes de tamanho fixo de fonte (ex.: `text-sm`, `text-2xl`) sem variação por breakpoint.

#### Complexidade, dependências e observações técnicas

- **Complexidade**: baixa a nível de página (puramente composicional/layout); a complexidade real está distribuída nos 6 widgets, cada um pequeno e de responsabilidade única.
- **Dependências externas diretas da página**: nenhuma além de React e dos componentes-filhos locais.
- **Dependências transitivas** (via widgets): `@tanstack/react-query` (todos os widgets de dados), `react-router-dom` (navegação/links), `zod` (validação de schema de notificações, via `features/notifications/schemas.ts`), `axios` (via `lib/http`, usado pelas camadas de API).
- **Padrão arquitetural**: cada widget segue o mesmo padrão: 1 hook de query → filtragem/derivação local dos dados → 3 estados de render (`isPending` → `Skeleton`; vazio → `EmptyState`; com dados → lista/resumo) → `Link`(s) de navegação.
- **Não há testes de integração real de dados** na página: `ClientDashboardPage.test.tsx` faz mock de todos os 6 widgets-filhos (substitui por `<div>nome-widget</div>`), testando apenas que o título "Painel" e os 6 widgets estão presentes — não testa o grid, breakpoints, nem o comportamento real de dados dos widgets nesse nível.
- **Duplicidade de nome de componente**: existe um segundo componente chamado `DashboardQuickActions` em `features/professional-dashboard/components/DashboardQuickActions.tsx` (fora do escopo deste documento), com rótulos de botão e destinos diferentes ("Buscar demandas disponíveis", "Editar perfil" → `/professional/profile`) — não deve ser confundido com o `DashboardQuickActions` do cliente aqui documentado.

---

### Widget: DashboardQuickActions

**Arquivo**: `frontend/src/features/dashboard/components/DashboardQuickActions.tsx`
**Posição no layout**: canto superior direito do cabeçalho da página (ao lado do título "Painel"), fora do grid de widgets.
**Tipo de UI**: barra de botões de ação (não é um `Card`).

#### Estrutura

```tsx
export function DashboardQuickActions(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => navigate('/demands/new')}>Publicar demanda</Button>
      <Button variant="ghost" onClick={() => navigate('/search')}>
        Buscar profissional
      </Button>
      <Button variant="ghost" onClick={() => navigate('/contracts')}>
        Ver contratos
      </Button>
    </div>
  );
}
```

- Container: `flex flex-wrap gap-3` — 3 botões lado a lado, quebrando linha em telas estreitas, gap de 3 (0.75rem).
- **Botão 1**: "Publicar demanda" — variante `primary` (default do componente `Button`, fundo `bg-primary`/texto `bg`) → navega para `/demands/new`.
- **Botão 2**: "Buscar profissional" — variante `ghost` (fundo transparente, borda `border-surface`) → navega para `/search`.
- **Botão 3**: "Ver contratos" — variante `ghost` → navega para `/contracts`.

#### Estados

Não há estados de loading/erro/vazio — componente é puramente uma barra de navegação com 3 ações fixas, sem dados assíncronos.

#### Origem dos dados

Nenhuma — não consome nenhuma query/API. Usa apenas `useNavigate()` do `react-router-dom`.

#### Eventos

Cada botão dispara `navigate(<rota>)` em `onClick`. Sem confirmação, sem debounce, sem estado de "carregando" no clique.

#### Responsividade

`flex-wrap` permite quebra de linha dos 3 botões em telas estreitas; sem alteração de tamanho de botão por breakpoint.

#### Componente `Button` subjacente (`components/ui/Button.tsx`)

- Variantes: `primary` (`bg-primary text-bg hover:bg-primary-hover`), `accent` (`bg-accent text-bg hover:bg-accent-hover`), `ghost` (`bg-transparent text-ink border border-surface hover:bg-surface`). Este widget usa apenas `primary` (default) e `ghost`.
- Tamanhos: `sm` (`px-3 py-1.5 text-sm`) e `md` (`px-5 py-2.5 text-base`, default). Este widget não especifica `size`, logo usa `md` em todos os 3 botões.
- Foco acessível: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Suporta `disabled` (`disabled:cursor-not-allowed disabled:opacity-50`), não utilizado neste widget.

---

### Widget: DashboardDemandsWidget

**Arquivo**: `frontend/src/features/dashboard/components/DashboardDemandsWidget.tsx`
**Título exibido**: "Demandas abertas"
**Posição no grid**: 1ª célula (primeiro widget do grid).

#### Origem dos dados

- Hook: `useDemands(true)` de `features/demands/queries.ts`.
- `useDemands(mine?: boolean, options?)` executa `useQuery({ queryKey: demandKeys.list(mine), queryFn: () => fetchDemands({ mine }) })`.
- `mine = true` → busca apenas demandas do próprio usuário logado (endpoint `GET /demands` com parâmetro `mine: true`, implementado em `features/demands/api.ts`, função `fetchDemands`).
- Retorno paginado: `Paginated<Demand>` = `{ items: Demand[], page, limit, total }`.
- Tipo `Demand` (`features/demands/api.ts`): `{ id, clientId, categoryId, title, description, budgetMin, budgetMax, status: DemandStatus, addressId, images, tagIds, createdAt }`.
- `DemandStatus` = `'open' | 'in_progress' | 'closed' | 'cancelled'`.

#### Lógica de filtragem local

```tsx
const OPEN_STATUSES = new Set(['open', 'in_progress']);
const items = (data?.items ?? []).filter((demand) => OPEN_STATUSES.has(demand.status)).slice(0, 3);
```

- Filtra apenas demandas com status `open` ou `in_progress` (ignora `closed`/`cancelled`), mesmo que o backend já retorne todas as demandas do cliente.
- Limita a exibição às **3 primeiras** demandas abertas (não há indicação visual de "e mais N", nem ordenação explícita aplicada no frontend — a ordem depende da ordem retornada pela API).

#### Estrutura visual (dentro de `Card`)

1. `<h2>Demandas abertas</h2>`.
2. Corpo condicional (loading → vazio → lista).
3. Link fixo no rodapé: "Ver todas" → `/demands` (sempre visível, independente do estado).

#### Estados

- **Loading** (`isPending === true`): `<Skeleton className="h-16 w-full" aria-label="Carregando demandas" />` — placeholder animado (`animate-pulse`) de altura 16 (4rem) e largura total.
- **Vazio** (`items.length === 0`, após filtro): `<EmptyState title="Nenhuma demanda aberta" action={<Link to="/demands/new">Publicar demanda</Link>} />` — inclui um CTA de ação dentro do próprio empty state, direcionando à criação de demanda.
- **Sucesso** (`items.length > 0`): lista `<ul>` com até 3 `<li>`, cada um contendo um `Link` para `/demands/{demand.id}` com o `title` da demanda, estilo `text-sm font-medium text-ink hover:text-primary`.
- **Erro**: não tratado explicitamente — `isPending` não cobre estado de erro isolado; se a query falhar, `data` fica `undefined` e o widget cai no ramo de "vazio" (mesma UI de "Nenhuma demanda aberta"), pois não há verificação de `isError`.

#### Navegação (links)

- Cada item da lista → `/demands/{id}` (tela de detalhe da demanda, fora do escopo deste documento).
- CTA do empty state → `/demands/new` (formulário de publicação de demanda).
- Link de rodapé "Ver todas" → `/demands` (lista completa).

#### Responsividade

Sem tratamento específico; segue o comportamento padrão do `Card` (100% da largura da célula do grid).

---

### Widget: DashboardContractsWidget

**Arquivo**: `frontend/src/features/dashboard/components/DashboardContractsWidget.tsx`
**Título exibido**: "Contratos"
**Posição no grid**: 2ª célula.

#### Origem dos dados

- Hook: `useContracts()` de `features/contracts/queries.ts` → `useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts })`.
- `fetchContracts` (`features/contracts/api.ts`) faz `GET` (via `http`, axios) retornando `Contract[]` — não paginado (lista completa de contratos do usuário).
- Tipo `Contract`: `{ id, demandId, quoteId, clientId, professionalId, total, status: ContractStatus, cancelledBy, cancellationReason, startedAt, completedAt, cancelledAt, schedule: Schedule | null, clientName, professionalHeadline, professionalUserId, createdAt }`.
- `ContractStatus` = `'active' | 'completed' | 'cancelled' | 'disputed'`.

#### Lógica de agregação local

```tsx
const active = (data ?? []).filter((contract) => contract.status === 'active');
const completed = (data ?? []).filter((contract) => contract.status === 'completed');
```

- Calcula apenas contagens de contratos `active` e `completed` — contratos `cancelled` e `disputed` não entram em nenhuma das duas contagens exibidas (não aparecem no widget de forma alguma).

#### Estrutura visual (dentro de `Card`)

1. `<h2>Contratos</h2>`.
2. Corpo condicional (loading → vazio → resumo numérico).
3. Link fixo no rodapé: "Ver contratos" → `/contracts` (sempre visível).

#### Estados

- **Loading**: `<Skeleton className="h-16 w-full" aria-label="Carregando contratos" />`.
- **Vazio** (`active.length === 0 && completed.length === 0`): `<EmptyState title="Nenhum contrato ainda" />` (sem `description`/`action`). Nota: se existirem apenas contratos `cancelled`/`disputed` (nenhum `active` nem `completed`), o widget também cai neste estado "vazio", mesmo havendo contratos de fato — a mensagem não distingue os dois cenários.
- **Sucesso**: dois blocos lado a lado (`flex gap-6`):
  - Número grande (`text-2xl font-bold`) com contagem de `active`, rótulo "Ativos" abaixo (`text-xs text-muted`).
  - Número grande com contagem de `completed`, rótulo "Concluídos" abaixo.
- **Erro**: não tratado explicitamente (mesmo padrão dos demais widgets — cai no estado vazio via `data ?? []`).

#### Navegação (links)

- Link de rodapé "Ver contratos" → `/contracts` (única navegação deste widget; os números não são clicáveis individualmente).

#### Responsividade

Sem tratamento específico de breakpoint; os dois blocos de contagem usam `flex gap-6` fixo.

---

### Widget: DashboardScheduleWidget

**Arquivo**: `frontend/src/features/dashboard/components/DashboardScheduleWidget.tsx`
**Título exibido**: "Próximo agendamento"
**Posição no grid**: 3ª célula (quando renderizado).

#### Origem dos dados

- Reutiliza o mesmo hook `useContracts()` de `features/contracts/queries.ts` (mesma query key `contractKeys.all` que `DashboardContractsWidget` — compartilha cache do React Query, não faz uma nova requisição de rede se já estiver em cache/montada simultaneamente).
- Usa o campo `schedule: Schedule | null` de cada `Contract`. Tipo `Schedule`: `{ id, scheduledDate, durationMinutes, notes, status: ScheduleStatus }`, `ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled'`.

#### Lógica de seleção do "próximo agendamento"

```tsx
const scheduled = (data ?? [])
  .filter(
    (contract) =>
      contract.schedule !== null &&
      !['completed', 'cancelled'].includes(contract.schedule.status) &&
      new Date(contract.schedule.scheduledDate).getTime() > Date.now(),
  )
  .sort(
    (a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime(),
  );

const next = scheduled[0];
```

- Filtra contratos com `schedule` não nulo, cujo status de agendamento **não** seja `completed` nem `cancelled`, e cuja `scheduledDate` seja estritamente futura (`> Date.now()`).
- Ordena os resultados por `scheduledDate` ascendente e pega o primeiro (`next`) — ou seja, o compromisso futuro mais próximo no tempo, entre todos os contratos do cliente (independentemente do `status` do próprio contrato — `active`, `completed`, etc. não são filtrados aqui, apenas o `schedule.status`).

#### Estrutura e comportamento particular: pode retornar `null`

Este é o único widget do domínio cuja assinatura de retorno é `JSX.Element | null`:

```tsx
export function DashboardScheduleWidget(): JSX.Element | null {
  if (isPending) { return (<Card>...Skeleton...</Card>); }
  ...
  const next = scheduled[0];
  if (!next || !next.schedule) return null;
  return (<Card>...);
}
```

- Se não houver nenhum agendamento futuro válido, o componente retorna `null` — **não renderiza nem um `EmptyState`, nem o `Card`, nem o título "Próximo agendamento"**. Isso difere do padrão dos demais widgets (que sempre mostram um `EmptyState` com o `Card` visível).
- Consequência de layout: quando não há próximo agendamento, a célula de grid correspondente desaparece por completo, e o grid CSS reflui os widgets seguintes (Favoritos, Notificações) para preencher o espaço, alterando a disposição visual da página sem aviso ao usuário.

#### Estados

- **Loading**: `<Card><h2>Próximo agendamento</h2><Skeleton className="h-16 w-full" aria-label="Carregando agendamento" /></Card>` — este é o único caso em que o `Card`/título aparecem mesmo sem dados ainda resolvidos.
- **Vazio** (sem próximo agendamento válido): componente retorna `null` — nenhuma UI visível, nem mesmo um empty state.
- **Sucesso**: `Card` com título "Próximo agendamento", data formatada (`formatDate` de `lib/utils.ts`, usando `Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })`) em `text-sm font-medium text-ink`, e, se existir, `next.schedule.notes` em `text-sm text-muted` abaixo.
- **Erro**: não tratado explicitamente.

#### Navegação (links)

Nenhuma — este widget não contém nenhum `Link`/botão de navegação.

#### Responsividade

Sem tratamento específico de breakpoint.

---

### Widget: DashboardFavoritesWidget

**Arquivo**: `frontend/src/features/dashboard/components/DashboardFavoritesWidget.tsx`
**Título exibido**: "Profissionais favoritos"
**Posição no grid**: 4ª célula.

#### Origem dos dados

- Hook principal: `useFavorites(1)` de `features/favorites/queries.ts` → `useQuery({ queryKey: favoriteKeys.list(page, 20), queryFn: () => fetchFavorites(page) })`, com `page = 1` fixo (sempre a primeira página, limite padrão 20 itens, definido pela constante `FAVORITES_LIST_LIMIT`).
- `fetchFavorites` (`features/favorites/api.ts`) faz `GET /favorites?page=1&limit=20`, retornando `Paginated<Favorite>` onde `Favorite = { id, professionalId, createdAt }`.
- Hook secundário (por item, dentro do subcomponente `FavoriteProfessionalPreview`): `usePublicProfile(professionalId)` de `features/professional/queries.ts` → `useQuery({ queryKey: ['professional', 'public', id], queryFn: () => professionalApi.getPublicProfile(id) })`, que chama `GET /professionals/{id}`, retornando `PublicProfile` (contém `headline`, `categories`, `experiences`, `education`, `certifications`, `serviceAreas`, entre outros campos herdados de `ProfessionalProfile`).
- **Padrão N+1 de queries**: para cada favorito retornado por `useFavorites`, é montado um componente `FavoriteProfessionalPreview` que dispara sua própria query `usePublicProfile` — ou seja, se houver 20 favoritos, são feitas até 20 requisições adicionais em paralelo (uma por profissional), além da requisição inicial de favoritos.

#### Subcomponente interno: `FavoriteProfessionalPreview`

```tsx
function FavoriteProfessionalPreview({ professionalId }: { professionalId: string }): JSX.Element | null {
  const { data } = usePublicProfile(professionalId);
  if (!data) return null;
  return (
    <Link to={`/professionals/${professionalId}`} className="flex items-center gap-2">
      <Avatar name={data.headline} size="sm" />
      <span className="text-sm font-medium text-ink">{data.headline}</span>
    </Link>
  );
}
```

- Não possui tratamento de loading próprio — enquanto `usePublicProfile` está pendente (`data` ainda `undefined`), o subcomponente retorna `null`, ou seja, o item da lista de favoritos simplesmente não aparece até que o perfil público correspondente termine de carregar (sem skeleton individual por item).
- Exibe `Avatar` (tamanho `sm`) usando `data.headline` como `name` (usado para gerar iniciais, já que não há `src` de imagem sendo passado) e o próprio `headline` como rótulo textual ao lado.
- Link do item → `/professionals/{professionalId}` (perfil público do profissional).

#### Estrutura visual (dentro de `Card`)

1. `<h2>Profissionais favoritos</h2>`.
2. Corpo condicional (loading → vazio → lista de `FavoriteProfessionalPreview`).
3. **Não há link de rodapé** neste widget (diferente de Demandas, Contratos e Notificações) — não existe um "Ver todos" apontando para uma tela de lista de favoritos.

#### Estados

- **Loading** (`isPending` do `useFavorites`): `<Skeleton className="h-16 w-full" aria-label="Carregando favoritos" />`.
- **Vazio** (`!data || data.items.length === 0`): `<EmptyState title="Nenhum favorito ainda" description="Favorite profissionais para encontrá-los rápido aqui." />` — este é o único widget cujo empty state inclui uma `description` sem `action` (CTA).
- **Sucesso**: `<ul>` com um `<li>` por favorito, cada um renderizando `FavoriteProfessionalPreview` (que, por sua vez, pode renderizar `null` individualmente enquanto seu próprio perfil carrega, conforme acima).
- **Erro**: não tratado explicitamente em nenhum dos dois níveis de query (`useFavorites` nem `usePublicProfile`).

#### Navegação (links)

- Cada item (quando o perfil carrega) → `/professionals/{professionalId}`.
- Sem link de "ver todos os favoritos" nesta tela.

#### Responsividade

Sem tratamento específico de breakpoint; itens em coluna única (`flex flex-col gap-2`) independentemente da largura do card.

---

### Widget: DashboardNotificationsWidget

**Arquivo**: `frontend/src/features/dashboard/components/DashboardNotificationsWidget.tsx`
**Título exibido**: "Notificações recentes"
**Posição no grid**: 5ª célula (última).

#### Origem dos dados

- Hook: `useNotifications(1)` de `features/notifications/queries.ts` → `useQuery({ queryKey: notificationKeys.list(page), queryFn: () => fetchNotifications(page) })`, `page = 1` fixo.
- `fetchNotifications` (`features/notifications/api.ts`) faz `GET /notifications?page=1&limit=20` e valida a resposta com `notificationsPageSchema.parse(data)` (Zod, `features/notifications/schemas.ts`).
- Schema `notificationSchema`: `{ id: uuid, type: string, title: string, body: string | null, channel: 'push' | 'in_app' | 'email', readAt: string(datetime) | null, createdAt: string(datetime) }`.
- `notificationsPageSchema`: `{ items: Notification[], page, limit, total }`.

#### Lógica de recorte local

```tsx
const items = (data?.items ?? []).slice(0, 5);
```

- Exibe apenas as **5 primeiras** notificações retornadas pela página 1 (sem filtro por `readAt`/lidas vs. não lidas — mostra tanto lidas quanto não lidas indiscriminadamente, sem indicação visual de "não lida").

#### Estrutura visual (dentro de `Card`)

1. `<h2>Notificações recentes</h2>`.
2. Corpo condicional (loading → vazio → lista).
3. Link fixo no rodapé: "Ver todas" → `/notifications` (sempre visível).

#### Estados

- **Loading**: `<Skeleton className="h-16 w-full" aria-label="Carregando notificações" />`.
- **Vazio** (`items.length === 0`): `<EmptyState title="Nenhuma notificação ainda" />` (sem `description`/`action`).
- **Sucesso**: `<ul>` com até 5 `<li key={notification.id}>`, cada um exibindo apenas `notification.title` em texto simples (`text-sm text-ink`) — **não exibe** `body`, `channel`, nem indicação de lida/não lida (`readAt`), nem `createdAt`/timestamp relativo. Os itens não são clicáveis/links individuais (diferente de Demandas e Favoritos) — apenas texto estático dentro do `<li>`.
- **Erro**: não tratado explicitamente.

#### Navegação (links)

- Apenas o link de rodapé "Ver todas" → `/notifications`. Os itens individuais da lista não possuem link/ação de clique (não marcam como lida, não navegam a lugar nenhum).

#### Responsividade

Sem tratamento específico de breakpoint.

---

### Componentes de UI compartilhados usados no domínio (referência)

#### `Card` (`components/ui/Card.tsx`)

```tsx
export function Card({ interactive = false, className, children, ...rest }: CardProps): JSX.Element {
  return (
    <div
      className={cn('rounded-lg bg-bg p-6', interactive && 'cursor-pointer transition-shadow hover:shadow-hover', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
```
- Prop `interactive` (boolean, default `false`) adiciona cursor pointer e sombra ao hover — **nenhum widget do dashboard do cliente usa `interactive={true}`**; todos os `Card` são estáticos/não clicáveis como um todo (a interatividade vem de `Link`s internos, não do card em si).

#### `Skeleton` (`components/ui/Skeleton.tsx`)

- `role="status"`, `aria-label` customizável (cada widget define seu próprio label, ex.: "Carregando contratos"), classe `animate-pulse` com `motion-reduce:animate-none` (respeita preferência de redução de movimento do usuário/SO).
- Todos os 5 widgets de dados usam a mesma classe de tamanho: `h-16 w-full` (altura fixa de 4rem, largura 100%).

#### `EmptyState` (`components/ui/EmptyState.tsx`)

- Props: `title` (obrigatório), `description` (opcional), `action` (opcional, `ReactNode`), `className` (opcional).
- Visual: `flex flex-col items-center gap-2 rounded-lg bg-surface px-6 py-12 text-center` — centralizado, com bastante padding vertical (`py-12`), fundo `bg-surface` (distinto do `bg-bg` do `Card` pai).
- Uso no domínio: `title` sempre presente; `description` usada apenas em Favoritos; `action` (um `Link`) usado apenas em Demandas.

#### `Avatar` (`components/ui/Avatar.tsx`)

- Usado apenas em `DashboardFavoritesWidget` (via `FavoriteProfessionalPreview`), com `size="sm"` (`h-8 w-8 text-xs`).
- Sem `src` fornecido no fluxo do dashboard (apenas `name`), portanto sempre renderiza as iniciais do `headline` do profissional sobre fundo `bg-primary`, nunca uma imagem real (`PublicProfile` não expõe uma URL de avatar consumida aqui).

#### `Button` (`components/ui/Button.tsx`)

- Usado apenas em `DashboardQuickActions`, variantes `primary` (default) e `ghost`, tamanho `md` (default) em todos os casos.

---

### Resumo de navegação/links por widget (visão consolidada)

| Widget | Link/Ação | Destino |
|---|---|---|
| DashboardQuickActions | Botão "Publicar demanda" | `/demands/new` |
| DashboardQuickActions | Botão "Buscar profissional" | `/search` |
| DashboardQuickActions | Botão "Ver contratos" | `/contracts` |
| DashboardDemandsWidget | Item da lista (título da demanda) | `/demands/{id}` |
| DashboardDemandsWidget | CTA do empty state "Publicar demanda" | `/demands/new` |
| DashboardDemandsWidget | Rodapé "Ver todas" | `/demands` |
| DashboardContractsWidget | Rodapé "Ver contratos" | `/contracts` |
| DashboardScheduleWidget | — (nenhum link) | — |
| DashboardFavoritesWidget | Item da lista (profissional favorito) | `/professionals/{professionalId}` |
| DashboardNotificationsWidget | Rodapé "Ver todas" | `/notifications` |

---

### Observações técnicas gerais do domínio (achados, sem juízo de valor)

- Nenhum dos 5 widgets de dados trata explicitamente estado de erro (`isError`) do React Query — todos tratam apenas `isPending` (loading) e ausência/vazio de dados (`data ?? []` / `!data`); uma falha de requisição resulta visualmente no mesmo `EmptyState` de "nenhum item".
- `DashboardContractsWidget` e `DashboardScheduleWidget` chamam o mesmo hook `useContracts()` (mesma `queryKey`), portanto compartilham cache do React Query — não há uma segunda requisição de rede se ambos estiverem montados simultaneamente e o cache ainda for válido.
- `DashboardFavoritesWidget` gera um padrão de N chamadas paralelas a `usePublicProfile` (uma por favorito, via subcomponente `FavoriteProfessionalPreview`), sem loading individual por item — itens aparecem "instantaneamente" completos ou não aparecem, sem placeholder intermediário.
- `DashboardScheduleWidget` é o único widget que pode retornar `null` (omitindo completamente o `Card`), causando reflow do grid quando não há agendamento futuro; os demais widgets sempre renderizam ao menos um `Card` com `EmptyState`.
- Nenhum widget implementa paginação de fato na UI (mesmo consumindo endpoints paginados como Favoritos e Notificações) — todos fixam `page = 1` e aplicam apenas recortes locais (`.slice(0, 3)` em Demandas, `.slice(0, 5)` em Notificações) sem link "carregar mais" dentro do próprio widget (a navegação para "ver mais" leva a uma tela de lista separada).
- `DashboardNotificationsWidget` não oferece nenhuma interação de marcação como lida (`markNotificationRead` existe em `features/notifications/queries.ts` como hook `useMarkNotificationRead`, mas não é importado/usado neste widget) nem distinção visual entre notificações lidas e não lidas.
- Todos os componentes usam `JSX.Element` (ou `JSX.Element | null` no caso do widget de agendamento) como tipo de retorno explícito, e todos são funções nomeadas exportadas (sem `React.FC`).
- Não há uso de `useMemo`/`useCallback` em nenhum dos 6 componentes — as filtragens/derivações (`.filter`, `.sort`, `.slice`) são recalculadas a cada renderização.
- Não há comentários no código-fonte de nenhum dos arquivos analisados.

---

### Capítulo: 06-professional-dashboard

## Domínio: Professional Dashboard

Auditoria técnica da feature `professional-dashboard`, localizada em `frontend/src/features/professional-dashboard/`. Documento descritivo do estado atual do código, sem sugestões de melhoria.

Arquivos que compõem a feature:
- `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardQuickActions.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.tsx`
- `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.tsx`

Cada componente também possui um arquivo de teste homônimo com sufixo `.test.tsx` (não documentado em detalhe, mas consultado para entender comportamento esperado).

---

### Tela: ProfessionalDashboardPage

#### Identificação

- **Nome do componente**: `ProfessionalDashboardPage` (export nomeado e `export default`)
- **Arquivo**: `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.tsx`
- **Rota registrada**: `/professional/dashboard`, definida em `frontend/src/router/index.tsx` (linha 45)
- **Grupo de rota**: a rota está dentro do bloco `{ element: <ProtectedRoute />, children: [...] }`, ou seja, **sem** a prop `roles`. O componente `ProtectedRoute` (`frontend/src/router/ProtectedRoute.tsx`) só bloqueia por role quando recebe explicitamente `roles={[...]}` (linha 19: `if (roles && !roles.includes(user.role)) { return <Navigate to="/forbidden" replace />; }`). Como a rota `/professional/dashboard` não passa `roles`, **qualquer usuário autenticado** (`client`, `professional` ou `admin`) que navegue diretamente para essa URL consegue renderizar a página — não há checagem de role nem no router nem dentro do próprio arquivo `ProfessionalDashboardPage.tsx` (o componente não lê `useAuthStore` nem verifica `user.role`). Para comparação, outras rotas do mesmo arquivo de router usam restrição explícita: `/demands/new` tem `roles={['client']}` e `/admin` tem `roles={['admin']}`.
- **Quem acessa na prática (fluxo normal de navegação)**: `frontend/src/lib/navConfig.ts` define `dashboardRouteByRole` mapeando `professional: '/professional/dashboard'` (linha 53), ou seja, a navegação por menu/UI direciona apenas profissionais para essa tela. Não há, porém, barreira técnica que impeça um `client` ou `admin` de acessá-la via URL direta, visto que a única exigência do `ProtectedRoute` sem `roles` é `user` existir (estar logado).
- **Type `Role`**: definido em `frontend/src/stores/auth` (importado por `ProtectedRoute.tsx` e `navConfig.ts`) como `'client' | 'professional' | 'admin'`.

#### Objetivo e descrição funcional

Página de painel inicial (home) do profissional autenticado. Reúne, em uma grade de widgets, um resumo consolidado de receita/carteira, próximo compromisso de agenda, contratos ativos, resumo do perfil profissional e avaliações recentes recebidas, além de ações rápidas de navegação no topo. Não há formulários nem mutações diretamente nesta página — é uma tela puramente de leitura/agregação com links de navegação para outras telas (contratos, perfil, demandas).

#### Fluxo do usuário

1. Usuário autenticado navega para `/professional/dashboard` (via item de menu "Dashboard" gerado por `getDashboardItem(role)` em `navConfig.ts`, ou diretamente pela URL).
2. `ProtectedRoute` verifica apenas se existe `user` na store de auth (aguarda `isBootstrapping` resolver antes de decidir); se não houver usuário, redireciona para `/login`.
3. Página renderiza cabeçalho fixo ("Painel" + `DashboardQuickActions`) e, abaixo, a grade de 5 widgets, cada um dispara suas próprias queries React Query de forma independente e paralela.
4. Cada widget mostra seu próprio esqueleto de carregamento (`Skeleton`) enquanto sua(s) query(ies) está(ão) pendente(s); ao resolver, mostra dados ou um `EmptyState` local, sem bloquear a renderização dos demais widgets.
5. Usuário pode clicar em ações rápidas (topo) ou em links internos dos widgets (contrato individual, editar perfil) para navegar para outras telas da aplicação.

#### Hierarquia visual e layout

Estrutura declarada em JSX (raiz):

```
<div class="flex flex-col gap-6 p-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1>Painel</h1>
    <DashboardQuickActions />
  </div>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    <DashboardRevenueWidget />
    <DashboardAgendaWidget />
    <DashboardActiveContractsWidget />
    <DashboardProfileSummaryCard />
    <DashboardReviewsWidget />
  </div>
</div>
```

- Container geral: `flex flex-col gap-6 p-6` — padding uniforme de 6 (Tailwind), espaçamento vertical de 6 entre cabeçalho e grade.
- Cabeçalho: `flex flex-wrap items-center justify-between gap-4` — título à esquerda ("Painel", `h1` `text-3xl font-bold text-ink`), ações rápidas à direita; com `flex-wrap`, em telas estreitas os botões de ação quebram para uma nova linha abaixo do título.
- Grade de widgets: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3` — 1 coluna em mobile, 2 colunas a partir de breakpoint `md`, 3 colunas a partir de `lg`. Os 5 widgets são simplesmente listados em sequência no DOM/grid, sem `colSpan`/`rowSpan` custom, sem ordem de prioridade explícita além da ordem de import/render: Receita, Agenda, Serviços em andamento, Meu perfil, Avaliações recentes. Em grid de 3 colunas, isso produz 2 linhas (3 + 2 itens); em grid de 2 colunas, 3 linhas (2+2+1).
- Não há `Sidebar`/layout de shell próprio neste arquivo — presume-se que o layout de navegação global (header/nav) é fornecido por um componente `App` ancestral (fora do escopo desta auditoria).

#### Todos os componentes usados

Diretamente na página:
- `DashboardQuickActions` (local)
- `DashboardRevenueWidget` (local)
- `DashboardAgendaWidget` (local)
- `DashboardActiveContractsWidget` (local)
- `DashboardProfileSummaryCard` (local)
- `DashboardReviewsWidget` (local)

Componentes de `components/ui/` usados (diretamente pelos widgets ou indiretamente por `ReviewList`):
- `Card` (`frontend/src/components/ui/Card.tsx`) — wrapper `div` com `rounded-lg bg-bg p-6`, prop opcional `interactive` (não usada por nenhum widget desta feature) que adiciona `cursor-pointer transition-shadow hover:shadow-hover`. Usado por todos os 5 widgets como container externo.
- `Skeleton` (`frontend/src/components/ui/Skeleton.tsx`) — `div` com `role="status"`, `aria-label` customizável (default "Carregando"), classe `animate-pulse rounded-md bg-surface motion-reduce:animate-none`. Usado em estado de loading por todos os 5 widgets (e também dentro de `ReviewList`).
- `EmptyState` (`frontend/src/components/ui/EmptyState.tsx`) — bloco `flex flex-col items-center gap-2 rounded-lg bg-surface px-6 py-12 text-center` com `title`, `description` opcional e `action` opcional (ReactNode). Usado em `DashboardActiveContractsWidget`, `DashboardAgendaWidget` e, indiretamente, em `ReviewList` (dentro do `DashboardReviewsWidget`).
- `Button` (`frontend/src/components/ui/Button.tsx`) — usado apenas em `DashboardQuickActions`, variantes `primary` (default) e `ghost`.
- `StarIcon` de `@heroicons/react/24/solid` — usado dentro de `ReviewList` (não é um componente de `components/ui`, é ícone de terceiro).

Componente de outra feature reaproveitado:
- `ReviewList` (`frontend/src/features/reviews/components/ReviewList.tsx`) — usado dentro de `DashboardReviewsWidget`, recebendo prop `professionalId`.

#### Estados (agregado por widget) — ver detalhamento completo nas seções de cada widget abaixo

De forma geral, nenhum widget desta página trata explicitamente um estado de **erro** (`isError`/`error` do React Query não é lido em nenhum dos 5 componentes). Todos tratam apenas `isPending` (loading) e o caso de dados vazios/ausentes via renderização condicional simples (não usam necessariamente o componente `EmptyState` em todos os casos — ver detalhes).

#### Chamadas de API / queries usadas (visão consolidada da página)

A página, através de seus widgets, dispara as seguintes queries React Query (todas leitura, nenhuma mutação nesta feature):

| Widget | Hook | Arquivo de origem | Endpoint HTTP | Query key |
|---|---|---|---|---|
| DashboardRevenueWidget | `useWallet()` | `features/wallet/queries.ts` → `features/wallet/api.ts` | `GET /wallet` | `['wallet']` |
| DashboardRevenueWidget | `useTransactions(1)` | idem | `GET /wallet/transactions?page=1&limit=20` | `['wallet','transactions',1,20]` |
| DashboardAgendaWidget | `useMyProfile()` | `features/professional/queries.ts` → `features/professional/api.ts` | `GET /professionals/me` | `['professional','me']` |
| DashboardAgendaWidget | `useContracts()` | `features/contracts/queries.ts` → `features/contracts/api.ts` | `GET /contracts` | `['contracts']` |
| DashboardAgendaWidget | `useSlots(profile?.id)` | `features/professional/queries.ts` | `GET /availability/{professionalId}/slots` | `['professional','slots',professionalId]` (só executa quando `profile.id` existe, `enabled: Boolean(professionalId)`) |
| DashboardActiveContractsWidget | `useContracts()` | `features/contracts/queries.ts` | `GET /contracts` | `['contracts']` |
| DashboardProfileSummaryCard | `useMyProfile()` | `features/professional/queries.ts` | `GET /professionals/me` | `['professional','me']` |
| DashboardReviewsWidget | `useMyProfile()` | `features/professional/queries.ts` | `GET /professionals/me` | `['professional','me']` |
| DashboardReviewsWidget → ReviewList | `useProfessionalReviews(professionalId)` | `features/reviews/queries.ts` → `features/reviews/api.ts` | `GET /professionals/{professionalId}/reviews?page=1&limit=20` | `['reviews', professionalId, 1]` |

Observações sobre redundância de queries: `useContracts()` é chamado de forma independente tanto em `DashboardAgendaWidget` quanto em `DashboardActiveContractsWidget` (mesma query key `['contracts']`, o React Query deduplica/cacheia por key, então não gera duas requisições de rede simultâneas idênticas, mas o hook é invocado duas vezes). O mesmo ocorre com `useMyProfile()`, chamado de forma independente em `DashboardAgendaWidget`, `DashboardProfileSummaryCard` e `DashboardReviewsWidget` (mesma key `['professional','me']`, também deduplicado pelo cache do React Query, porém 3 pontos de código distintos disparam o hook).

`useMyProfile()` é definido com `retry: false` (`professional/queries.ts`), ou seja, se `GET /professionals/me` falhar (por exemplo, usuário sem perfil profissional criado, incluindo clientes/admins que acessem a rota), o React Query não tenta novamente — porém, como nenhum widget lê `isError`, a UI simplesmente trata isso como "sem profile" quando `isPending` vira `false` e `data` permanece `undefined` (renderização condicional cai para os ramos `profile ? ... : null` ou `profile && <X/>`).

#### Hooks usados

Diretamente nos arquivos desta feature:
- `useContracts` (contracts/queries.ts) — em `DashboardActiveContractsWidget` e `DashboardAgendaWidget`
- `useMyProfile` (professional/queries.ts) — em `DashboardAgendaWidget`, `DashboardProfileSummaryCard`, `DashboardReviewsWidget`
- `useSlots` (professional/queries.ts) — em `DashboardAgendaWidget`
- `useWallet`, `useTransactions` (wallet/queries.ts) — em `DashboardRevenueWidget`
- `useNavigate` (react-router-dom) — em `DashboardQuickActions`
- `useProfessionalReviews` (reviews/queries.ts) — indiretamente via `ReviewList`, usado dentro de `DashboardReviewsWidget`

Nenhum hook customizado próprio da feature `professional-dashboard` (não há arquivo `hooks.ts`/`useDashboard...` local); todos os hooks são importados de outras features (`contracts`, `professional`, `wallet`, `reviews`).

#### Navegação / links por widget

- `DashboardQuickActions`: 3 botões que chamam `navigate(...)` programaticamente — `/demands` ("Buscar demandas disponíveis", variante `primary`), `/contracts` ("Ver contratos", variante `ghost`), `/professional/profile` ("Editar perfil", variante `ghost`).
- `DashboardActiveContractsWidget`: cada item da lista é um `<Link>` para `/contracts/${contract.id}`.
- `DashboardProfileSummaryCard`: `<Link>` fixo para `/professional/profile` ("Editar perfil"), sempre visível independentemente de haver ou não perfil carregado.
- `DashboardAgendaWidget`, `DashboardRevenueWidget`, `DashboardReviewsWidget`: não possuem links/navegação própria (apenas exibição de dados; `ReviewList` dentro do widget de avaliações também não tem links).

#### Responsividade

- Grade principal: `grid-cols-1` (mobile) → `md:grid-cols-2` → `lg:grid-cols-3`.
- Cabeçalho com `flex-wrap`, permitindo quebra de linha dos botões de ação em telas estreitas.
- `DashboardQuickActions`: `flex flex-wrap gap-3` — botões quebram linha conforme espaço disponível.
- `DashboardRevenueWidget`: os 3 blocos de valores usam `flex flex-wrap gap-6`, quebrando em telas estreitas.
- Nenhum widget usa larguras fixas em px; todos usam classes utilitárias relativas/flex/grid do Tailwind.

#### Complexidade, dependências e observações técnicas

- Complexidade da página em si é baixa (puramente composição de widgets, sem lógica própria, sem estado local, sem efeitos).
- Cada widget concentra sua própria lógica de derivação de dados (filtros, ordenação, formatação) diretamente no corpo do componente, sem hooks/seletores extraídos.
- Dependências externas por widget: `react-router-dom` (`Link`, `useNavigate`), `@tanstack/react-query` (indireto via hooks de outras features), `@heroicons/react/24/solid` (via `ReviewList`).
- Dependências cruzadas de features: esta feature depende de `features/contracts`, `features/professional`, `features/wallet`, `features/reviews`, além de `components/ui` e `lib/utils` (para `formatCurrency`, `formatDate`, `cn`).
- Nenhum tratamento de erro de rede (`isError`) em nenhum dos 5 widgets — se uma query falhar, o widget permanece exibindo o ramo de "vazio" (por não haver dados) ou, em alguns casos, `Skeleton` nunca desaparece de forma incorreta é não observado (isPending some quando a query resolve com erro também, pois `isPending` do React Query v5 refere-se a "sem dados ainda", que também se torna `false` após erro — mas isso não foi verificado no código, é uma característica da biblioteca).
- `formatCurrency` e `formatDate` são importados de `frontend/src/lib/utils`, usados para formatar valores monetários (BRL, presumivelmente) e datas.
- Tipagem: `JSX.Element` como tipo de retorno de todos os componentes (`import type { JSX } from 'react'`), consistente em toda a feature.

---

### Widget: DashboardRevenueWidget

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx`
- **Título exibido**: "Receita" (`h2`)

#### Estrutura

`Card` contendo um `h2` de título e, abaixo, conforme estado:
- Loading: um único `Skeleton` (`h-16 w-full`, `aria-label="Carregando receita"`).
- Sucesso: `div` com `flex flex-wrap gap-6` contendo 3 blocos de estatística, cada um com um valor grande (`text-2xl font-bold text-ink`) e um rótulo pequeno (`text-xs text-muted`):
  1. "Saldo disponível" — `formatCurrency(wallet?.balance ?? 0)`
  2. "Saldo pendente" — `formatCurrency(wallet?.pendingBalance ?? 0)`
  3. "Receita do mês" — `formatCurrency(monthlyRevenue)`, calculado no cliente.

#### Informações exibidas

- Saldo disponível da carteira (`wallet.balance`).
- Saldo pendente da carteira (`wallet.pendingBalance`).
- Receita do mês corrente: calculada localmente filtrando `transactions.items` por `type === 'credit'` e `isCurrentMonth(transaction.createdAt)` (comparação de ano e mês UTC com a data atual), somando `transaction.amount` via `reduce`.

#### Botões / eventos

Nenhum botão ou evento de interação neste widget — é somente leitura/exibição.

#### Estados

- **Loading**: `isPending = isWalletPending || isTransactionsPending` (combinação das duas queries) → mostra `Skeleton`.
- **Vazio**: não há tratamento de "vazio" dedicado; se `wallet` for `undefined`, usa fallback `0` via `??`; se `transactions` for `undefined`, `transactions?.items ?? []` resulta em array vazio e `monthlyRevenue` fica `0`. Ou seja, o estado "sem dados" se resolve visualmente como valores zerados (R$ 0,00), sem `EmptyState`.
- **Erro**: não tratado (nenhuma leitura de `isError`).

#### Origem dos dados

- `useWallet()` → `GET /wallet` (`features/wallet/api.ts` / `features/wallet/queries.ts`).
- `useTransactions(1)` → `GET /wallet/transactions?page=1&limit=20` (página 1 fixa, `limit` default 20 do hook).

#### Gráficos

Não há gráficos neste widget — apenas números formatados como texto (sem sparkline, barra, ou qualquer visualização gráfica). Apesar do nome da feature sugerir "revenue chart", o componente atual é puramente textual/numérico.

#### Responsividade

`flex flex-wrap gap-6` nos 3 blocos de estatística — quebram para novas linhas em telas estreitas, sem grid fixo de colunas.

---

### Widget: DashboardAgendaWidget

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.tsx`
- **Título exibido**: "Agenda" (`h2`)

#### Estrutura

`Card` com `h2` de título e, conforme estado:
- Loading: `Skeleton` (`h-16 w-full`, `aria-label="Carregando agenda"`).
- Vazio: `EmptyState` com `title="Nenhum compromisso ou disponibilidade cadastrada"`.
- Sucesso: `div flex flex-col gap-3` contendo:
  - Se houver próximo compromisso (`next`): bloco com `formatDate(next.schedule.scheduledDate)` (`text-sm font-medium`) e, se existir, `next.schedule.notes` (`text-sm text-muted`).
  - Sempre (quando não vazio): parágrafo com contagem de dias com disponibilidade cadastrada — `"{slotCount} dia(s) com disponibilidade cadastrada"` (pluralização manual via condicional ternário singular/plural).

#### Informações exibidas

- Data/hora do próximo compromisso agendado (contrato com `schedule` não nulo, cujo `schedule.status` não seja `'completed'` nem `'cancelled'`, e cuja `scheduledDate` seja no futuro — `> Date.now()`), ordenado do mais próximo para o mais distante e pegando o primeiro (`upcoming[0]`).
- Observações do agendamento (`schedule.notes`), se presentes.
- Quantidade de "slots" de disponibilidade cadastrados (`slots.length`) do profissional.

#### Botões / eventos

Nenhum — somente leitura.

#### Estados

- **Loading**: `isPending = isContractsPending || isProfilePending || (Boolean(profile?.id) && isSlotsPending)` — ou seja, só considera o carregamento de `slots` quando já existe `profile.id` (a query de slots é `enabled` apenas quando há id de profissional).
- **Vazio**: condição `!next && slotCount === 0` → mostra `EmptyState`. Note que se houver `slotCount > 0` mas nenhum `next` compromisso, o widget NÃO cai no ramo vazio — mostra o ramo de sucesso sem o bloco de "próximo compromisso" (pois `{next && next.schedule && (...)}` simplesmente não renderiza nada), exibindo apenas a contagem de disponibilidade.
- **Erro**: não tratado.

#### Origem dos dados

- `useMyProfile()` → `GET /professionals/me`.
- `useContracts()` → `GET /contracts` (mesma query/key usada por `DashboardActiveContractsWidget`).
- `useSlots(profile?.id)` → `GET /availability/{professionalId}/slots`, habilitada apenas quando `profile?.id` existe.

#### Gráficos

Não há.

#### Responsividade

Bloco simples em coluna (`flex flex-col gap-3`); sem comportamento responsivo especial além do que o `Card`/grid pai já fornece.

---

### Widget: DashboardActiveContractsWidget

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.tsx`
- **Título exibido**: "Serviços em andamento" (`h2`)

#### Estrutura

`Card` com `h2` de título e, conforme estado:
- Loading: `Skeleton` (`h-16 w-full`, `aria-label="Carregando serviços em andamento"`).
- Vazio: `EmptyState` com `title="Nenhum contrato em andamento"`.
- Sucesso: `ul flex flex-col gap-2`, cada item (`li`) contendo um `Link` para `/contracts/${contract.id}` exibindo `formatCurrency(contract.total)` como texto do link (`text-sm font-semibold text-primary`).

#### Informações exibidas

Lista de contratos cujo `status === 'active'` (filtrado a partir de todos os contratos retornados por `useContracts()`), exibindo apenas o valor total do contrato formatado como moeda — **não exibe** nome do cliente, data, categoria ou qualquer outro dado do contrato nesta lista; o valor monetário funciona também como o próprio link clicável.

#### Botões / eventos

- Cada item é um link de navegação (`react-router-dom Link`) para o detalhe do contrato (`/contracts/:id`); não há botões de ação (iniciar, concluir, cancelar) neste widget — essas ações presumivelmente vivem na tela de detalhe do contrato.

#### Estados

- **Loading**: `isPending` da query `useContracts()`.
- **Vazio**: `active.length === 0` (após filtro por `status === 'active'`) → `EmptyState`.
- **Erro**: não tratado.

#### Origem dos dados

- `useContracts()` → `GET /contracts` (`features/contracts/api.ts`), mesma query key `['contracts']` compartilhada com `DashboardAgendaWidget`.

#### Gráficos

Não há.

#### Responsividade

Lista vertical simples (`flex flex-col gap-2`); não há tratamento responsivo específico além do grid/Card pai.

---

### Widget: DashboardProfileSummaryCard

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.tsx`
- **Título exibido**: "Meu perfil" (`h2`)

#### Estrutura

`Card` com `h2` de título; conforme estado, um bloco condicional de conteúdo; e, **sempre visível** (fora do bloco condicional principal), um `Link` de rodapé "Editar perfil" apontando para `/professional/profile`.

- Loading: `Skeleton` (`h-16 w-full`, `aria-label="Carregando perfil"`).
- Com perfil (`profile` truthy): `div flex flex-col gap-2` com:
  - `p` `text-sm font-semibold` exibindo `profile.headline`.
  - `p` `text-sm text-muted` exibindo `profile.ratingAverage.toFixed(1)` seguido de `(profile.ratingCount)` entre parênteses — ex.: "4.8 (12)".
- Sem perfil (`profile` falsy e não pending): não renderiza nada no bloco de conteúdo (`null`), mas o link "Editar perfil" continua visível.

#### Informações exibidas

- `headline` do perfil profissional (`ProfessionalProfile.headline`, tipo `string`).
- Média de avaliação (`ratingAverage`, formatada com 1 casa decimal) e contagem total de avaliações (`ratingCount`).

#### Botões / eventos

- `Link` fixo "Editar perfil" → `/professional/profile` (mesma rota de destino do botão "Editar perfil" em `DashboardQuickActions`).

#### Estados

- **Loading**: `isPending` de `useMyProfile()`.
- **Vazio/ausência de perfil**: não usa `EmptyState`; simplesmente não renderiza o bloco de dados (`profile ? (...) : null`), deixando apenas título e link "Editar perfil" visíveis — não há mensagem explicando a ausência de perfil.
- **Erro**: não tratado (e, como citado, `useMyProfile` tem `retry: false`, então falhas não são reprocessadas).

#### Origem dos dados

- `useMyProfile()` → `GET /professionals/me` (mesma query key `['professional','me']` compartilhada com `DashboardAgendaWidget` e `DashboardReviewsWidget`).

#### Gráficos

Não há.

#### Responsividade

Bloco vertical simples (`flex flex-col gap-2`); sem tratamento responsivo específico.

---

### Widget: DashboardReviewsWidget

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.tsx`
- **Título exibido**: "Avaliações recentes" (`h2`)

#### Estrutura

`Card` com `h2` de título; conforme estado:
- Loading (do próprio perfil): `Skeleton` (`h-20 w-full`, `aria-label="Carregando avaliações"`).
- Com perfil carregado: renderiza `profile && <ReviewList professionalId={profile.id} />` — ou seja, delega toda a exibição de avaliações ao componente `ReviewList` de outra feature (`features/reviews/components/ReviewList.tsx`).
- Sem perfil (após loading, `profile` falsy): não renderiza nada (expressão `profile && <ReviewList .../>` resulta em `false`/vazio).

#### Estrutura interna de `ReviewList` (componente de `features/reviews`, reaproveitado aqui)

- Loading (`useProfessionalReviews` pendente): dois `Skeleton` empilhados (`h-20 w-full`, `aria-label="Carregando avaliações"`) — note que isso pode gerar uma dupla camada de skeleton visual, pois o próprio `DashboardReviewsWidget` já mostra seu skeleton de perfil antes de `ReviewList` montar; uma vez que `profile` carrega, `ReviewList` monta e mostra os seus próprios 2 skeletons enquanto busca as reviews.
- Vazio (`!data || data.items.length === 0`): `EmptyState` com `title="Nenhuma avaliação ainda"` e `description="Este profissional ainda não recebeu avaliações."`.
- Sucesso: `ul flex flex-col gap-3`, cada `li` (`rounded-lg bg-surface p-4`) contendo:
  - Linha de 5 ícones `StarIcon` (heroicons, `solid`), coloridos `text-accent` se `index < review.rating`, caso contrário `text-muted` (representação visual de 1 a 5 estrelas conforme `review.rating`).
  - `p` com `review.comment`, exibido apenas se não for `null`.
  - `p` `text-xs text-muted` com `formatDate(review.createdAt)`.

#### Informações exibidas

- Nota (rating de 1 a 5, via estrelas) de cada avaliação.
- Comentário textual da avaliação (opcional, pode ser `null`).
- Data de criação da avaliação, formatada via `formatDate`.

Não há paginação visível na UI (o hook busca `page = 1` por padrão, `limit = 20`), nem link para ver "todas as avaliações" a partir deste widget.

#### Botões / eventos

Nenhum — somente leitura, sem interação nem link de navegação.

#### Estados

- **Loading**: dois níveis — (1) o próprio `DashboardReviewsWidget` mostra skeleton enquanto `useMyProfile()` está pendente; (2) uma vez com `profile.id`, `ReviewList` mostra seus próprios 2 skeletons enquanto `useProfessionalReviews` está pendente.
- **Vazio**: tratado dentro de `ReviewList` via `EmptyState` (com descrição), quando `data.items.length === 0`.
- **Erro**: não tratado em nenhum dos dois componentes (`DashboardReviewsWidget` nem `ReviewList`).

#### Origem dos dados

- `useMyProfile()` (dashboard widget) → `GET /professionals/me`.
- `useProfessionalReviews(professionalId)` (dentro de `ReviewList`) → `GET /professionals/{professionalId}/reviews?page=1&limit=20` (`features/reviews/api.ts` / `features/reviews/queries.ts`).

#### Gráficos

Não há — apenas ícones de estrela por avaliação individual, sem agregação visual (não há, por exemplo, um gráfico de distribuição de notas).

#### Responsividade

Lista vertical simples (`flex flex-col gap-3`), cartões internos com `p-4`; sem breakpoints/responsividade específica além do grid do dashboard.

---

### Widget: DashboardQuickActions

- **Arquivo**: `frontend/src/features/professional-dashboard/components/DashboardQuickActions.tsx`
- Posicionado no cabeçalho da página (fora da grade de widgets), ao lado do título "Painel".

#### Estrutura

`div flex flex-wrap gap-3` contendo 3 componentes `Button`:
1. `Button` (variante default `primary`) — texto "Buscar demandas disponíveis" — `onClick={() => navigate('/demands')}`.
2. `Button variant="ghost"` — texto "Ver contratos" — `onClick={() => navigate('/contracts')}`.
3. `Button variant="ghost"` — texto "Editar perfil" — `onClick={() => navigate('/professional/profile')}`.

#### Informações exibidas

Nenhuma informação de dados — é puramente um conjunto de atalhos de navegação, sem contadores/badges nos botões.

#### Botões / eventos

Os 3 botões descritos acima; todos usam `useNavigate()` do `react-router-dom` para navegação client-side programática (não usam `Link`).

#### Estados

Não há estados de loading/erro/vazio — o componente não consome nenhuma query, é estático e sempre renderiza os 3 botões da mesma forma, independentemente de contexto (não há personalização condicional, por exemplo esconder "Buscar demandas disponíveis" se não houver demandas).

#### Origem dos dados

N/A — não consome API.

#### Gráficos

Não há.

#### Responsividade

`flex flex-wrap gap-3` — os botões quebram para novas linhas conforme espaço disponível, sem breakpoints adicionais.

---

### Capítulo: 07-professional

## Domínio 07 — Professional

Auditoria técnica descritiva da feature `features/professional/` (React + TypeScript). Documento factual, sem sugestões de melhoria.

Arquivos cobertos:
- `features/professional/api.ts`
- `features/professional/queries.ts`
- `features/professional/schemas.ts`
- `features/professional/components/AvailabilityGrid.tsx`
- `features/professional/components/AvailabilityManager.tsx`
- `features/professional/components/PortfolioGallery.tsx`
- `features/professional/components/PortfolioManager.tsx`
- `features/professional/components/ProfessionalCard.tsx`
- `features/professional/components/ProfessionalProfileHeader.tsx`
- `features/professional/components/ProfileForm.tsx`
- `features/professional/components/ServiceAreaManager.tsx`
- `features/professional/pages/ProfessionalProfileEditPage.tsx`
- `features/professional/pages/PublicProfilePage.tsx`

---

### Camada de dados — `api.ts`

Arquivo que centraliza o client HTTP da feature (`professionalApi`), construído sobre o wrapper `http` (`lib/http`).

#### Tipos/Interfaces exportados

| Tipo | Campos |
|---|---|
| `ProfessionalProfile` | `id`, `userId`, `headline`, `bio` (nullable), `yearsExperience` (nullable), `hourlyRate` (nullable), `serviceRadiusKm` (nullable), `ratingAverage` (number), `ratingCount` (number), `isAvailable` (boolean), `verifiedAt` (nullable), `createdAt` |
| `CategoryOption` | `id`, `parentId` (nullable), `name`, `slug`, `icon` (nullable), `description` (nullable), `isActive` (boolean) |
| `TagOption` | `id`, `name`, `slug` |
| `PortfolioImage` | `id`, `imageUrl`, `position` |
| `PortfolioItem` | `id`, `categoryId` (nullable), `title`, `description` (nullable), `completedAt` (nullable), `images: PortfolioImage[]` |
| `AvailabilitySlot` | `id`, `weekday` (number 0-6), `startTime`, `endTime` |
| `ServiceArea` | `id`, `city`, `state`, `radiusKm` (nullable) |
| `PublicProfile` | estende `ProfessionalProfile` + `categories: {id,name,slug}[]`, `experiences: unknown[]`, `education: unknown[]`, `certifications: unknown[]`, `serviceAreas: ServiceArea[]` |

Observação: `experiences`, `education`, `certifications` são tipados como `unknown[]` — não há renderização desses campos em nenhuma tela desta feature (não aparecem em `PublicProfilePage` nem em `ProfessionalProfileEditPage`).

#### Métodos de `professionalApi`

| Método | Verbo/Endpoint | Descrição |
|---|---|---|
| `getMyProfile()` | `GET /professionals/me` | Perfil profissional do usuário autenticado |
| `upsertProfile(payload)` | `PUT /professionals/me` | Cria/atualiza perfil (`headline`, `bio`, `yearsExperience`, `hourlyRate`, `serviceRadiusKm`) |
| `listPublicCategories()` | `GET /categories` | Lista categorias públicas do catálogo |
| `listPublicTags()` | `GET /tags` | Lista tags públicas do catálogo |
| `setCategories(ids)` | `PUT /professionals/me/categories` | Define categorias do profissional (`{ ids }`) |
| `setTags(ids)` | `PUT /professionals/me/tags` | Define tags do profissional (`{ ids }`) |
| `getPublicProfile(id)` | `GET /professionals/:id` | Perfil público de um profissional |
| `listPortfolio(professionalId)` | `GET /portfolio/:professionalId/items` | Lista itens de portfólio |
| `createPortfolioItem(payload)` | `POST /portfolio/me/items` | Cria item (`categoryId`, `title`, `description`, `completedAt`) |
| `removePortfolioItem(id)` | `DELETE /portfolio/me/items/:id` | Remove item de portfólio |
| `addPortfolioImage(itemId, payload)` | `POST /portfolio/me/items/:itemId/images` | Adiciona imagem (`imageUrl`, `position`) a um item |
| `removePortfolioImage(id)` | `DELETE /portfolio/me/images/:id` | Remove imagem de portfólio |
| `listSlots(professionalId)` | `GET /availability/:professionalId/slots` | Lista slots de disponibilidade |
| `addSlot(payload)` | `POST /availability/me/slots` | Cria slot (`weekday`, `startTime`, `endTime`) |
| `removeSlot(id)` | `DELETE /availability/me/slots/:id` | Remove slot |
| `addServiceArea(payload)` | `POST /professionals/me/service-areas` | Cria área de atendimento (`city`, `state`, `radiusKm`) |
| `removeServiceArea(id)` | `DELETE /professionals/me/service-areas/:id` | Remove área de atendimento |

Nota: as funções `setCategories`/`setTags` e os tipos `CategoryOption`/`TagOption` existem em `api.ts`, mas **não há hook em `queries.ts` que os exponha com nome "set" ligado a mutação de UI usada nas telas auditadas** — `useSetCategories`/`useSetTags` existem em `queries.ts` (ver abaixo) mas não são consumidos por nenhum componente/página dentre os listados nesta auditoria (nem `ProfileForm`, nem `ProfessionalProfileEditPage`). Não há seletor de categorias/tags visível nas telas documentadas.

---

### Camada de queries — `queries.ts`

Usa `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`).

#### Query keys centralizadas
```
keys.myProfile   = ['professional', 'me']
keys.categories  = ['catalog', 'categories']
keys.tags        = ['catalog', 'tags']
```
Demais keys são construídas inline (não centralizadas no objeto `keys`): `['professional', 'public', id]`, `['professional', 'portfolio', professionalId]`, `['professional', 'slots', professionalId]`.

#### Hooks de leitura (queries)

| Hook | Query key | Fonte | `enabled` |
|---|---|---|---|
| `useMyProfile()` | `['professional','me']` | `getMyProfile` | sempre; `retry: false` |
| `useCategories()` | `['catalog','categories']` | `listPublicCategories` | sempre |
| `useTags()` | `['catalog','tags']` | `listPublicTags` | sempre |
| `usePublicProfile(id)` | `['professional','public', id]` | `getPublicProfile(id)` | `Boolean(id)` |
| `usePortfolio(professionalId)` | `['professional','portfolio', professionalId]` | `listPortfolio` | `Boolean(professionalId)` |
| `useSlots(professionalId)` | `['professional','slots', professionalId]` | `listSlots` | `Boolean(professionalId)` |

#### Hooks de escrita (mutations)

| Hook | mutationFn | onSuccess |
|---|---|---|
| `useUpsertProfile()` | `upsertProfile` | `setQueryData(keys.myProfile, data)` (atualiza cache diretamente, sem refetch) |
| `useSetCategories()` | `setCategories` | nenhum (sem invalidação) |
| `useSetTags()` | `setTags` | nenhum (sem invalidação) |
| `useCreatePortfolioItem(professionalId)` | `createPortfolioItem` | invalida `['professional','portfolio', professionalId]` |
| `useRemovePortfolioItem(professionalId)` | `removePortfolioItem` | invalida `['professional','portfolio', professionalId]` |
| `useAddSlot(professionalId)` | `addSlot` | invalida `['professional','slots', professionalId]` |
| `useRemoveSlot(professionalId)` | `removeSlot` | invalida `['professional','slots', professionalId]` |
| `useAddServiceArea()` | `addServiceArea` | invalida `keys.myProfile` **e** `['professional','public']` (prefixo, sem id — invalida todas as queries de perfil público em cache) |
| `useRemoveServiceArea()` | `removeServiceArea` | idem acima |
| `useAddPortfolioImage(professionalId, itemId)` | `(payload) => addPortfolioImage(itemId, payload)` | invalida `['professional','portfolio', professionalId]` |
| `useRemovePortfolioImage(professionalId)` | `(imageId) => removePortfolioImage(imageId)` | invalida `['professional','portfolio', professionalId]` |

Nenhum hook implementa `onError` customizado; erros de mutation ficam expostos via `isError`/`error` do próprio hook do React Query, tratados individualmente em cada componente consumidor (ver seção de cada formulário).

---

### Camada de validação — `schemas.ts`

Schema Zod único: `profileFormSchema`, usado por `ProfileForm` via `zodResolver`.

```
headline:         string, min 5 ("Minimo 5 caracteres"), max 255
bio:               string, max 4000, nullable (sem mensagem customizada)
yearsExperience:   number inteiro, min 0, max 80, nullable
hourlyRate:        number não-negativo, nullable
serviceRadiusKm:   number inteiro, min 0, max 1000, nullable
```
Tipo inferido exportado: `ProfileForm = z.infer<typeof profileFormSchema>`.

Não há schemas Zod para: slot de disponibilidade, item de portfólio, imagem de portfólio ou área de atendimento — esses formulários (`AvailabilityManager`, `PortfolioManager`, `ServiceAreaManager`) não usam `react-hook-form` nem Zod; usam `useState` local e validação condicional inline no `disabled` do botão.

---

### Tela: PublicProfilePage

- **Arquivo**: `features/professional/pages/PublicProfilePage.tsx`
- **Rota**: `/professionals/:id`
- **Registro de rota**: `router/index.tsx`, fora do bloco `ProtectedRoute` — rota **pública**, acessível sem autenticação.
- **Quem acessa**: qualquer visitante (não autenticado), cliente, profissional ou admin — não há checagem de role nesta página.
- **Objetivo**: exibir o perfil público de um profissional específico (identificado por `:id` na URL) para visitantes/clientes avaliarem antes de contratar ou favoritar.
- **Export**: `export default function PublicProfilePage()`.

#### Fluxo do usuário
1. Usuário chega via link (ex.: clique em `ProfessionalCard`, resultado de busca, ou link direto `/professionals/:id`).
2. `useParams<{ id: string }>()` extrai `id` da URL.
3. `usePublicProfile(id)` dispara `GET /professionals/:id` (habilitado apenas se `id` existir).
4. `useFavoriteIds()` (do módulo `features/favorites/queries`) carrega o conjunto de IDs favoritados do usuário logado (usado para pintar o coração do header).
5. Enquanto pendente, mostra `Skeleton`. Se erro ou perfil ausente, mostra `EmptyState`. Caso contrário, renderiza a página completa.
6. Usuário pode: favoritar/desfavoritar, iniciar chat, navegar para "Contratar" (`/demands/new?professionalId=...`), rolar pelas seções (Sobre, Áreas de atendimento, Portfólio, Disponibilidade, Avaliações).

#### Layout e hierarquia visual
Container: `<div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">` — coluna única, largura máxima 3xl, gap de 6, padding 6. Ordem das seções, de cima para baixo:

1. **`ProfessionalProfileHeader`** — cabeçalho com avatar, nome/headline, badges de categoria, rating, botões de ação (Favoritar, Chat, Contratar).
2. **Seção "Sobre"** (`<section>`) — renderizada condicionalmente apenas se `profile.bio` for truthy. Título `<h2>` + parágrafo com o texto da bio.
3. **Seção "Áreas de atendimento"** — sempre renderizada. Se `serviceAreas.length === 0`, mostra parágrafo texto simples "Nenhuma área informada." (não usa componente `EmptyState` aqui, diferente de outras seções). Caso contrário, lista `<ul>` de badges arredondados (`rounded-full bg-surface`) no formato `"{city} - {state}"`.
4. **Seção "Portfólio"** — título + componente `PortfolioGallery`.
5. **Seção "Disponibilidade"** — título + componente `AvailabilityGrid`.
6. **Seção "Avaliações"** — título + componente `ReviewList` (de `features/reviews/components/ReviewList`).

Todas as seções usam o mesmo padrão de título: `<h2 className="mb-2 text-lg font-semibold text-ink">`.

#### Componentes usados
`ProfessionalProfileHeader`, `PortfolioGallery`, `AvailabilityGrid`, `ReviewList` (externo, feature `reviews`), `Skeleton`, `EmptyState`.

#### Estados
| Estado | Condição | Renderização |
|---|---|---|
| Loading | `isPending` (query `usePublicProfile`) | `<Skeleton className="m-6 h-40 w-full" aria-label="Carregando perfil" />` |
| Erro / não encontrado | `isError \|\| !profile` | `<EmptyState className="m-6" title="Perfil não encontrado" />` (sem `description`, sem `action`) |
| Sucesso | `profile` presente | Página completa conforme layout acima |
| Sem bio | `!profile.bio` | Seção "Sobre" inteira omitida (não aparece nem vazia) |
| Sem áreas de atendimento | `serviceAreas.length === 0` | Texto "Nenhuma área informada." em vez de lista |
| Sem itens de portfólio | delegado a `PortfolioGallery` | `EmptyState title="Nenhum item no portfólio ainda"` |
| Sem disponibilidade | delegado a `AvailabilityGrid` | `EmptyState title="Disponibilidade não informada"` |
| Sem avaliações | delegado a `ReviewList` | `EmptyState title="Nenhuma avaliação ainda" description="Este profissional ainda não recebeu avaliações."` |
| Permissões | nenhuma restrição de role/autenticação nesta página | — |

#### Chamadas de API / queries / mutations
- `usePublicProfile(id)` → `GET /professionals/:id`
- `useFavoriteIds()` → hook do módulo `favorites` (consulta lista de favoritos do usuário logado; comportamento quando deslogado não está nesta feature)
- Indiretamente via subcomponentes: `usePortfolio` (`GET /portfolio/:id/items`), `useSlots` (`GET /availability/:id/slots`), `useProfessionalReviews` (feature `reviews`, `GET` endpoint de reviews)
- Mutations disparadas pelos filhos: `useAddFavorite`/`useRemoveFavorite` (via `FavoriteButton` dentro do header), `useCreateRoom` (via header, ao clicar em "Chat")

#### Hooks usados na página
`useParams`, `usePublicProfile`, `useFavoriteIds`.

#### Navegação / links
- Header interno (`ProfessionalProfileHeader`) contém:
  - Botão "Chat" → cria/obtém sala via `useCreateRoom.mutate({ participantId: profile.userId })` e navega para `/chat/:roomId` no `onSuccess`.
  - Botão "Contratar" → `navigate(`/demands/new?professionalId=${profile.id}`)` (navegação direta, sem mutation).
  - `FavoriteButton` → não navega, apenas favorita/desfavorita in-place.
- Nenhum link de volta explícito (breadcrumb/"voltar") nesta página.

#### Responsividade
- Container `max-w-3xl` centralizado (`mx-auto`), `p-6` fixo (não há variação por breakpoint no padding do container).
- `ProfessionalProfileHeader`: `flex flex-col` em mobile, muda para `sm:flex-row sm:items-center sm:justify-between` a partir do breakpoint `sm`.
- `PortfolioGallery`: grid de imagens `grid-cols-3` (mobile) → `sm:grid-cols-4` (≥sm).
- `AvailabilityGrid`: lista `grid-cols-1` (mobile) → `sm:grid-cols-2` (≥sm).
- Não há tratamento de breakpoints `md`/`lg`/`xl` explícitos nesta tela — apenas `sm`.

#### Complexidade, dependências e observações
- Depende de 3 features externas: `favorites` (hook `useFavoriteIds`, componente `FavoriteButton`), `reviews` (componente `ReviewList`, hook `useProfessionalReviews`), `chat` (hook `useCreateRoom`, usado dentro de `ProfessionalProfileHeader`).
- Complexidade de composição é baixa na própria página (poucos condicionais); a complexidade real está distribuída nos componentes filhos.
- A invalidação de favoritos/reviews/chat não é responsabilidade desta página — cada subcomponente gerencia seu próprio estado de servidor.
- Não há paginação em `PortfolioGallery`, `AvailabilityGrid` ou `ReviewList` nesta tela — todas listam o array completo retornado pela API.
- Título da página (`document.title`) não é setado neste arquivo.

---

### Tela: ProfessionalProfileEditPage

- **Arquivo**: `features/professional/pages/ProfessionalProfileEditPage.tsx`
- **Rota**: `/professional/profile`
- **Registro de rota**: dentro do bloco `{ element: <ProtectedRoute />, children: [...] }` em `router/index.tsx` — **sem** restrição de `roles` (o `ProtectedRoute` é chamado sem prop `roles`, diferente de `/demands/new` que exige `roles={['client']}` e `/admin` que exige `roles={['admin']}`).
- **Quem acessa**: qualquer usuário autenticado (`client`, `professional` ou `admin`), já que a rota não define array `roles`. `ProtectedRoute` apenas verifica `user` existente; se não autenticado, redireciona para `/login`.
- **Objetivo**: permitir que o usuário edite seu próprio perfil profissional — dados gerais, portfólio, disponibilidade e áreas de atendimento — tudo em uma única página vertical.
- **Export**: nomeado (`export function ProfessionalProfileEditPage`) **e** default (`export default ProfessionalProfileEditPage`) no mesmo arquivo.

#### Fluxo do usuário
1. Usuário autenticado navega para `/professional/profile`.
2. `useMyProfile()` dispara `GET /professionals/me` (com `retry: false`).
3. Título fixo "Editar perfil" é exibido imediatamente, independente do carregamento do perfil.
4. `ProfileForm` é renderizado sempre (mesmo antes do perfil carregar — controla seu próprio loading internamente via `useMyProfile` novamente).
5. Se `profile` existir (dado já carregado), aparecem os blocos de pré-visualização "Como aparece no seu perfil público" (portfólio) e "Disponibilidade atual", cada um envolvendo o componente somente-leitura correspondente (`PortfolioGallery`, `AvailabilityGrid`).
6. Em seguida, sempre aparecem os gerenciadores editáveis: `PortfolioManager`, `AvailabilityManager` (recebe `professionalId` possivelmente `undefined` até que `profile` carregue), `ServiceAreaManager` (não recebe prop, resolve seu próprio profile internamente).
7. Usuário edita campos/dados em qualquer um dos formulários; cada bloco tem seu próprio botão de submissão e seu próprio estado de mutation independente (não há salvamento único global).

#### Layout e hierarquia visual
Container: `<div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">` — coluna única, mais estreita que a página pública (`max-w-2xl` vs `max-w-3xl`), gap 8.

Ordem vertical:
1. `<h1 className="text-3xl font-bold text-ink">Editar perfil</h1>`
2. `ProfileForm` (Card com formulário de dados gerais)
3. **Bloco condicional** (`{profile && (...)}`) — título "Como aparece no seu perfil público" + `PortfolioGallery` (somente leitura, mesma renderização usada na página pública)
4. `PortfolioManager` (Card com formulário/lista editável de portfólio)
5. **Bloco condicional** (`{profile && (...)}`) — título "Disponibilidade atual" + `AvailabilityGrid` (somente leitura)
6. `AvailabilityManager` (Card com formulário/lista editável de disponibilidade)
7. `ServiceAreaManager` (Card com formulário/lista editável de áreas de atendimento)

Cada seção usa `<h2 className="text-lg font-semibold text-ink">` para os títulos dos blocos de pré-visualização; os Cards internos (`ProfileForm`, `PortfolioManager`, `AvailabilityManager`, `ServiceAreaManager`) têm seus próprios `<h2>` internos.

#### Componentes usados
`ProfileForm`, `PortfolioGallery`, `PortfolioManager`, `AvailabilityGrid`, `AvailabilityManager`, `ServiceAreaManager`.

#### Estados
| Estado | Onde | Comportamento |
|---|---|---|
| Loading do perfil | `useMyProfile()` nesta página | Não há tratamento explícito de loading na própria página — `profile` fica `undefined` e os blocos condicionais (`{profile && ...}`) simplesmente não renderizam até os dados chegarem. Não há skeleton próprio da página. |
| Erro ao carregar perfil | `useMyProfile()` | Não tratado nesta página (sem checagem de `isError`); página segue mostrando título e `ProfileForm` (que também consulta `useMyProfile` e não trata erro visualmente além do que descrito em `ProfileForm`) |
| `profile` ausente (novo profissional sem perfil ainda) | `!profile` | Blocos de pré-visualização de portfólio/disponibilidade não aparecem; `PortfolioManager`/`AvailabilityManager`/`ServiceAreaManager` ainda renderizam (recebem `professionalId: undefined`, e seus hooks internos ficam com `enabled: false` até haver id) |
| Permissões | Rota protegida sem `roles` | Qualquer usuário autenticado (inclusive `client` ou `admin`) acessa a página, embora o conceito de "perfil profissional" só faça sentido para `professional`. Não há redirecionamento/mensagem específica para roles não-profissionais nesta página. |

#### Chamadas de API / queries / mutations
- `useMyProfile()` → `GET /professionals/me` (chamado tanto na página quanto de novo dentro de `ProfileForm` e `ServiceAreaManager` — múltiplas instâncias do mesmo hook compartilham cache do React Query pela mesma query key, então não gera múltiplas requisições simultâneas graças ao cache).
- Delegado aos subcomponentes: `useUpsertProfile`, `usePortfolio`, `useCreatePortfolioItem`, `useRemovePortfolioItem`, `useAddPortfolioImage`, `useRemovePortfolioImage`, `useSlots`, `useAddSlot`, `useRemoveSlot`, `usePublicProfile` (dentro de `ServiceAreaManager`), `useAddServiceArea`, `useRemoveServiceArea`.

#### Hooks usados na própria página
`useMyProfile`.

#### Navegação / links
Nenhum link de navegação nesta página (nem botão "voltar", nem link para visualizar o perfil público correspondente `/professionals/:id`).

#### Responsividade
- Container fixo `max-w-2xl p-6`, sem variação por breakpoint no nível da página.
- Responsividade específica vem de dentro de cada subcomponente (ex.: `PortfolioGallery` usa `grid-cols-3 sm:grid-cols-4`; `AvailabilityGrid` usa `grid-cols-1 sm:grid-cols-2`); os formulários (`ProfileForm`, `AvailabilityManager`, `PortfolioManager`, `ServiceAreaManager`) usam majoritariamente `flex` sem breakpoints — os inputs de `AvailabilityManager`/`PortfolioManager`/`ServiceAreaManager` usam `flex flex-wrap gap-2` (quebra de linha automática em telas estreitas) ou `flex gap-2` com `min-w-0 flex-1` no input de texto.

#### Complexidade, dependências e observações
- Página monta 6 subcomponentes de feature própria (nenhum de outra feature), cada um com seu próprio ciclo de fetch/mutation independente — a página em si não centraliza estado.
- Duplicação de fetch de "meu perfil": `useMyProfile()` é chamado na própria página, dentro de `ProfileForm` e dentro de `ServiceAreaManager` — mitigado por cache do React Query (mesma query key `['professional','me']`), mas replicado em 3 pontos do código.
- `ServiceAreaManager` depende indiretamente de `usePublicProfile(profile?.id)` para obter `serviceAreas` (o próprio perfil do usuário tratado como "perfil público" para ler suas áreas cadastradas) — ou seja, a lista de áreas de atendimento do dono do perfil vem da mesma query `GET /professionals/:id` usada na tela pública, não de um endpoint dedicado "minhas áreas".
- Sem loading/skeleton no nível da página — a ausência de perfil apenas oculta blocos condicionais silenciosamente.
- Não redireciona/bloqueia visualmente usuários com role `client` ou `admin` que acessem a rota.

---

### Formulário: ProfileForm

- **Arquivo**: `features/professional/components/ProfileForm.tsx`
- **Tipo**: formulário controlado por `react-hook-form` + `zodResolver(profileFormSchema)`.
- **Usado em**: `ProfessionalProfileEditPage`.

#### Campos

| Campo | Tipo input | Obrigatório | Placeholder | Registro RHF | Validação (Zod) |
|---|---|---|---|---|---|
| Título (`headline`) | `<input>` texto (sem `type` explícito → `text`) | Sim (min 5 chars) | nenhum | `register('headline')` | `min(5, 'Minimo 5 caracteres')`, `max(255)` |
| Biografia (`bio`) | `<textarea>` | Não (nullable) | nenhum | `register('bio')` | `max(4000)`, nullable, sem mensagem customizada |
| Anos de experiência (`yearsExperience`) | `<input type="number">` | Não (nullable) | nenhum | `register('yearsExperience', { setValueAs: setValueAsNumber })` | inteiro, `min(0)`, `max(80)`, nullable |
| Valor por hora — R$ (`hourlyRate`) | `<input type="number">` | Não (nullable) | nenhum | `register('hourlyRate', { setValueAs: setValueAsNumber })` | `nonnegative()`, nullable |
| Raio de atendimento — km (`serviceRadiusKm`) | `<input type="number">` | Não (nullable) | nenhum | `register('serviceRadiusKm', { setValueAs: setValueAsNumber })` | inteiro, `min(0)`, `max(1000)`, nullable |

`setValueAsNumber` é uma função local: `(value: string) => (value === '' ? null : Number(value))` — converte string vazia em `null` e demais valores em `Number`. Não há máscara de moeda/formatação (ex.: não formata `hourlyRate` como `R$ 1.234,56`; é um `<input type="number">` puro).

#### Comportamento e preenchimento inicial
- `useMyProfile()` busca dados existentes; um `useEffect` chama `reset({...})` com os 5 campos sempre que `data` mudar — popula o formulário com o perfil já salvo.
- Não há valores default explícitos passados ao `useForm` (sem `defaultValues`) — antes do `reset` disparar, os campos ficam undefined/vazios.

#### Mensagens de erro
- Apenas `headline` exibe erro de validação inline: `{errors.headline && <span className="text-xs text-accent">{errors.headline.message}</span>}`.
- Os demais campos (`bio`, `yearsExperience`, `hourlyRate`, `serviceRadiusKm`) não exibem mensagens de erro mesmo que o schema Zod os valide (`errors.bio`, `errors.yearsExperience` etc. não são renderizados em lugar nenhum do JSX).
- Erro de mutation (falha na chamada de API): `{upsert.isError && <p className="text-sm text-accent">Não foi possível salvar o perfil</p>}` — mensagem genérica fixa, sem detalhe da causa.

#### Botão e estados
- `<Button type="submit" disabled={upsert.isPending}>` — texto muda dinamicamente: `"Salvando..."` durante pendência, `"Salvar perfil"` no estado normal.
- `form` tem atributo `noValidate` (desativa validação nativa do navegador, delegando 100% ao Zod/RHF).

#### Mutation
- `useUpsertProfile()` → `PUT /professionals/me` com os 5 campos do formulário.
- `onSuccess`: escreve diretamente no cache (`setQueryData`) sem invalidar/refetch.
- Submissão: `handleSubmit((values) => upsert.mutate(values))`.

---

### Formulário/gerenciador: AvailabilityManager

- **Arquivo**: `features/professional/components/AvailabilityManager.tsx`
- **Tipo**: mini-formulário controlado por `useState` local (não usa react-hook-form nem Zod) + lista com ação de remoção.
- **Props**: `{ professionalId: string | undefined }`.
- **Usado em**: `ProfessionalProfileEditPage`.

#### Campos do formulário de criação

| Campo | Tipo | Obrigatório | Default | Opções/Validação |
|---|---|---|---|---|
| Dia da semana (`weekday`) | `<select>` | implícito (sempre tem valor) | `1` (Segunda) | opções fixas: Domingo(0)...Sábado(6), via array `WEEKDAYS` |
| Início (`startTime`) | `<input type="time">` | implícito | `'08:00'` | validação nativa do `type="time"` do navegador; sem Zod |
| Fim (`endTime`) | `<input type="time">` | implícito | `'18:00'` | idem |

Não há validação client-side de que `endTime > startTime`, nem checagem de sobreposição de horários entre slots — o botão "Adicionar" fica habilitado independentemente dos valores de horário (só depende de `!addSlot.isPending`).

#### Botão
- "Adicionar" (`<Button type="button" disabled={addSlot.isPending}>`) chama `addSlot.mutate({ weekday, startTime, endTime })`. Os campos `useState` não são resetados após o envio (o formulário mantém os últimos valores digitados, diferente de `PortfolioManager` que limpa o campo `title`).

#### Lista / estados
- `isPending` (do `useSlots`) → não renderiza nada (`null`) enquanto carrega — sem skeleton dedicado no manager (diferente do `AvailabilityGrid` somente-leitura, que usa `Skeleton`).
- Lista vazia → `EmptyState title="Nenhum horário cadastrado"`.
- Cada item da lista: `"{Weekday} {start}-{end}"` + botão texto "Remover" (`text-accent underline`) que chama `removeSlot.mutate(slot.id)`.
- Não há confirmação (modal/dialog) antes de remover um slot — clique único remove imediatamente.
- Não há indicação visual de loading por item individual durante a remoção (o botão "Remover" de cada item não fica desabilitado durante `removeSlot.isPending`).

#### Mutations
- `useAddSlot(professionalId)` → `POST /availability/me/slots`, invalida `['professional','slots', professionalId]`.
- `useRemoveSlot(professionalId)` → `DELETE /availability/me/slots/:id`, invalida a mesma key.

---

### Formulário/gerenciador: PortfolioManager

- **Arquivo**: `features/professional/components/PortfolioManager.tsx`
- **Tipo**: composto por dois blocos — criação de item (`useState` local, sem Zod) e sub-componente interno `PortfolioItemRow` para cada item já existente (com upload de imagens).
- **Props**: `{ professionalId: string | undefined }`.
- **Usado em**: `ProfessionalProfileEditPage`.

#### Campo de criação de item

| Campo | Tipo | Obrigatório | Placeholder | Validação |
|---|---|---|---|---|
| Título (`title`) | `<input>` texto | Sim (bloqueia botão se vazio) | "Título do trabalho" | apenas checagem de truthy (`!title`) no `disabled` do botão — sem Zod, sem limite de caracteres client-side |

Campos `categoryId`, `description`, `completedAt` são enviados fixos como `null` na criação — não há inputs para eles na UI (mutation sempre chama `create.mutate({ categoryId: null, title, description: null, completedAt: null })`).

#### Botão de criação
- "Adicionar" (`disabled={!title || create.isPending}`) — ao clicar, dispara a mutation e **limpa o campo** `title` (`setTitle('')`) imediatamente (de forma otimista, antes da resposta da API).

#### Sub-componente: `PortfolioItemRow`
Renderizado por item existente (`item: PortfolioItem`). Estrutura:
- Cabeçalho: nome do item + botão texto "Remover" (chama `onRemoveItem(item.id)`, prop repassada de cima, que por sua vez chama `remove.mutate(id)` no componente pai).
- Se `item.images.length > 0`: lista de miniaturas (`h-16 w-16 rounded-md object-cover`), cada uma com botão "×" sobreposto (`absolute -right-1 -top-1`, `aria-label="Remover foto de {title}"`) que chama `removeImage.mutate(image.id)`.
- Componente `ImageUpload` (de `components/ui/ImageUpload`) sempre visível ao final de cada item, com label `"Adicionar foto a {title}"`; ao concluir upload (`onUploaded`), chama `addImage.mutate({ imageUrl: result.url, position: item.images.length })` — a posição da nova imagem é sempre o índice/comprimento atual do array (append no fim).

#### Estados
- Lista de itens `isPending` → não renderiza nada (`null`).
- Lista vazia → `EmptyState title="Nenhum item no portfólio ainda"` (mesma mensagem usada em `PortfolioGallery`, componente somente-leitura).
- Sem confirmação de exclusão para item nem para imagem — remoção é imediata ao clique.
- `ImageUpload` (componente genérico, não exclusivo desta feature) trata seu próprio estado de `uploading` com `Skeleton` e mostra preview local via `URL.createObjectURL`; em falha de upload, exibe toast de erro "Falha ao enviar imagem" (via hook `useToast`) e descarta o preview.

#### Mutations
- `useCreatePortfolioItem(professionalId)` → `POST /portfolio/me/items`, invalida portfólio.
- `useRemovePortfolioItem(professionalId)` → `DELETE /portfolio/me/items/:id`, invalida portfólio.
- `useAddPortfolioImage(professionalId, itemId)` → `POST /portfolio/me/items/:itemId/images`, invalida portfólio.
- `useRemovePortfolioImage(professionalId)` → `DELETE /portfolio/me/images/:id`, invalida portfólio.

---

### Formulário/gerenciador: ServiceAreaManager

- **Arquivo**: `features/professional/components/ServiceAreaManager.tsx`
- **Tipo**: mini-formulário `useState` local (sem Zod, sem react-hook-form) + lista com remoção.
- **Props**: nenhuma — resolve tudo internamente via hooks (`useMyProfile`, `usePublicProfile`).
- **Usado em**: `ProfessionalProfileEditPage`.

#### Campos

| Campo | Tipo | Obrigatório | Placeholder | Validação |
|---|---|---|---|---|
| Cidade (`city`) | `<input>` texto | Sim (truthy) | "Cidade" | apenas checagem `!city` no botão |
| UF (`state`) | `<input>` texto, `maxLength={2}` | Sim (exatamente 2 chars) | "UF" | checagem `state.length !== 2` no botão; valor é forçado para maiúsculas via `onChange` (`e.target.value.toUpperCase()`) — não há checagem de que sejam letras válidas de UF brasileira (aceita "12", "ZZ" etc.) |

`radiusKm` não tem campo de UI — sempre enviado como `null` na criação (`addArea.mutate({ city, state, radiusKm: null })`).

#### Botão
- "Adicionar" (`disabled={!city || state.length !== 2 || addArea.isPending}`) — ao clicar, dispara mutation e limpa ambos os campos imediatamente (otimista, antes da resposta).

#### Fonte dos dados exibidos
- A lista de áreas **não vem de um hook dedicado de "minhas áreas"**: `const { data: profile } = useMyProfile()` obtém o `id`, depois `usePublicProfile(profile?.id)` é chamado para buscar o perfil público (o mesmo endpoint `GET /professionals/:id` usado na tela pública) e extrai `serviceAreas` de lá (`publicProfile?.serviceAreas ?? []`).

#### Lista / estados
- Lista vazia → `EmptyState title="Nenhuma área de atendimento cadastrada"`.
- Cada item: `"{city} - {state}"` + botão texto "Remover" que chama `removeArea.mutate(area.id)` — sem confirmação, sem estado de loading individual, sem desabilitar o botão durante a remoção em andamento.
- Não existe estado de loading explícito para a própria lista (não checa `isPending` de `usePublicProfile`) — se a query ainda não retornou, `areas` é `[]` (via `?? []`), o que faz a UI mostrar transitoriamente o `EmptyState` "Nenhuma área de atendimento cadastrada" mesmo quando os dados ainda estão carregando (não há distinção visual entre "carregando" e "vazio de fato" nesta lista).

#### Mutations
- `useAddServiceArea()` → `POST /professionals/me/service-areas`; invalida `keys.myProfile` e `['professional','public']` (prefixo — sem id específico, então invalida qualquer perfil público em cache, incluindo o do próprio usuário usado aqui).
- `useRemoveServiceArea()` → `DELETE /professionals/me/service-areas/:id`; mesma invalidação.

---

### Componente: AvailabilityGrid

- **Arquivo**: `features/professional/components/AvailabilityGrid.tsx`
- **Tipo**: componente de exibição somente-leitura (não editável).
- **Props**: `{ professionalId: string }` (obrigatório, tipo string simples — sem `| undefined`).
- **Usado em**: `PublicProfilePage` (com `profile.id`) e `ProfessionalProfileEditPage` (bloco de pré-visualização "Disponibilidade atual", condicionado a `profile` existir).

#### Estrutura interna
- Hook: `useSlots(professionalId)` → `{ data, isPending }`.
- Constante local `WEEKDAY_LABELS` (array de 7 strings em PT-BR, index 0 = Domingo).
- Sem estado interno (`useState`) — componente puramente derivado da query.

#### Variantes de renderização
| Condição | Saída |
|---|---|
| `isPending` | `<Skeleton className="h-24 w-full" aria-label="Carregando disponibilidade" />` |
| `!data \|\| data.length === 0` | `<EmptyState title="Disponibilidade não informada" />` |
| dados presentes | `<ul>` grid de slots, cada `<li>` mostrando `"{Dia}: {startTime} - {endTime}"` |

#### Responsividade
`grid grid-cols-1 gap-2 sm:grid-cols-2` — 1 coluna em mobile, 2 colunas a partir de `sm`.

#### Eventos
Nenhum — componente 100% passivo, sem interação do usuário.

---

### Componente: ProfessionalCard

Tratado como **card de listagem** (usado em telas de busca/listagem fora do escopo desta auditoria, mas o componente em si pertence a esta feature).

- **Arquivo**: `features/professional/components/ProfessionalCard.tsx`
- **Props** (`ProfessionalCardProps`): `id`, `headline`, `bio` (nullable), `hourlyRate` (nullable), `ratingAverage`, `ratingCount`, `isAvailable`, `isFavorite` — todas recebidas de fora (componente não busca dados via hook próprio; é puramente apresentacional).

#### Informações exibidas
1. **Avatar** (`Avatar name={headline} size="md"`) — mostra iniciais do `headline` (sem foto real de perfil, já que não há prop de imagem/avatar URL).
2. **Nome/headline** (`<h3>`), com **badge "Disponível agora"** (`Badge tone="urgent"`) exibido apenas se `isAvailable === true`.
3. **Bio** — `<p className="line-clamp-2">`, renderizada apenas se `bio` truthy (trunca visualmente em 2 linhas via `line-clamp-2`).
4. **Valor/hora** — `"R$ {hourlyRate}/h"` se `hourlyRate !== null`, senão texto fixo `"Sob consulta"`. Não há formatação de moeda (`Intl.NumberFormat`) — valor é interpolado cru na string.
5. **Rating** — ícone `StarIcon` sólido + `"{ratingAverage.toFixed(1)} ({ratingCount})"`.

#### Botões / eventos
- **Card inteiro é clicável**: envolvido por `<Link to={`/professionals/${id}`}>` (exceto a área do `FavoriteButton`, que fica fora do link, posicionado em `absolute right-3 top-3` sobre o card).
- **`FavoriteButton`**: `professionalId={id}`, `isFavorite`, com `preventDefault`/`stopPropagation` no clique interno para não disparar a navegação do `Link` pai ao favoritar.

#### Estados
- Não há estado de loading próprio (dados vêm prontos via props do componente pai/lista).
- Não há estado de erro próprio.
- Estado visual "disponível agora" via badge condicional.
- `FavoriteButton` internamente gerencia `pending` (soma de `isPending` de add/remove favorito) e desabilita o próprio botão durante a mutation.

#### Variantes
- Card usa `Card interactive` (do design system, `components/ui/Card`) — aplica `cursor-pointer` e `hover:shadow-hover` (variante "interactive" vs. cards estáticos usados em outros lugares do app).
- Única variante visual condicional é a badge "Disponível agora"; não há variantes de tamanho/densidade do card.

#### Responsividade
Sem classes responsivas próprias (`sm:`/`md:` etc.) dentro do componente — a responsividade do grid de cards é responsabilidade do componente-pai que o instancia (fora do escopo desta auditoria).

---

### Componente: ProfessionalProfileHeader

- **Arquivo**: `features/professional/components/ProfessionalProfileHeader.tsx`
- **Props** (`ProfessionalProfileHeaderProps`): `profile: PublicProfile` (objeto completo), `isFavorite: boolean`.
- **Usado em**: `PublicProfilePage` (topo da página).

#### Estrutura
Container: `flex flex-col gap-4 rounded-lg bg-surface p-6`, responsivo para `sm:flex-row sm:items-center sm:justify-between` — dois blocos principais lado a lado a partir de `sm`:

**Bloco esquerdo** (identidade):
- `Avatar name={profile.headline} size="lg"`.
- `<h1>{profile.headline}</h1>` (título principal da página).
- Linha de badges: uma `Badge` (tom neutro, padrão) por categoria em `profile.categories`, seguida de rating (`StarIcon` + `"{avg.toFixed(1)} ({count})"`).

**Bloco direito** (ações):
- `FavoriteButton` (`professionalId={profile.id}`, `isFavorite`).
- Botão "Chat" (`variant="ghost"`, `disabled={createRoom.isPending}`) → `handleChat()`.
- Botão "Contratar" (variante padrão do `Button`) → navega para `/demands/new?professionalId={profile.id}`.

#### Estado interno
- `useNavigate()` (roteamento).
- `useCreateRoom()` (mutation da feature `chat`, importada de `../../chat/queries`).

#### Evento `handleChat`
```
createRoom.mutate(
  { participantId: profile.userId },
  { onSuccess: (room) => navigate(`/chat/${room.id}`) }
);
```
Cria (ou obtém, dependendo da semântica do backend) uma sala de chat com o usuário dono do perfil profissional (`profile.userId`, não `profile.id` — distinção entre id do registro profissional e id do usuário) e navega para `/chat/:roomId` em caso de sucesso. Não há tratamento de erro explícito (`onError`) nesta chamada — falha na criação da sala não exibe feedback visual aqui.

#### Variantes
- Não há variantes estruturais do header — é fixo para qualquer perfil público carregado.
- O botão "Contratar" não é desabilitado em nenhuma condição (ex.: não verifica se o próprio usuário logado é o dono do perfil, nem se o usuário é do tipo `client`).

#### Responsividade
`flex-col` em mobile → `sm:flex-row` com `sm:items-center sm:justify-between`; badges e rating usam `flex flex-wrap gap-2` (quebram de linha em telas estreitas).

---

### Componente: PortfolioGallery

- **Arquivo**: `features/professional/components/PortfolioGallery.tsx`
- **Tipo**: somente-leitura, usado tanto na página pública quanto como pré-visualização na página de edição.
- **Props**: `{ professionalId: string }`.
- **Usado em**: `PublicProfilePage` (seção "Portfólio") e `ProfessionalProfileEditPage` (bloco "Como aparece no seu perfil público").

#### Estrutura
- Hook: `usePortfolio(professionalId)` → `{ data, isPending }`.
- Para cada `item` em `data`: `<h3>{item.title}</h3>` seguido de:
  - Se `item.images.length === 0`: texto `"Sem fotos."` (`text-sm text-muted`).
  - Caso contrário: grid de imagens `grid-cols-3 gap-2 sm:grid-cols-4`, cada `<img>` com `aspect-square object-cover rounded-md`, `alt={item.title}` (mesmo alt para todas as imagens do mesmo item — não usa descrição individual por imagem).

#### Estados
| Condição | Saída |
|---|---|
| `isPending` | `<Skeleton className="h-40 w-full" aria-label="Carregando portfólio" />` |
| `!data \|\| data.length === 0` | `<EmptyState title="Nenhum item no portfólio ainda" />` |
| item sem imagens | texto "Sem fotos." |
| dados presentes | grid de itens com suas imagens |

Sem paginação, sem lightbox/zoom ao clicar na imagem, sem lazy-loading explícito (`loading="lazy"` não é setado no `<img>`).

---

### Resumo de padrões observados nesta feature

- Todos os textos de UI estão em português (PT-BR): rótulos, placeholders, mensagens de erro, mensagens de estado vazio.
- Convenção de nomenclatura consistente: arquivos e identificadores em inglês (`ProfileForm`, `professionalId`), textos visíveis ao usuário em português.
- Padrão de card/formulário: quase todos os gerenciadores (`AvailabilityManager`, `PortfolioManager`, `ServiceAreaManager`) seguem a mesma estrutura visual — `Card` com `<h2>` de título, linha de inputs + botão "Adicionar", lista de itens com botão texto "Remover" sublinhado em `text-accent`.
- Nenhum dos três gerenciadores (`AvailabilityManager`, `PortfolioManager`, `ServiceAreaManager`) usa modal de confirmação antes de excluir — toda remoção é de clique único e imediata.
- Apenas `ProfileForm` usa `react-hook-form` + Zod; os demais formulários da feature usam `useState` cru com validação apenas via `disabled` condicional do botão.
- Padrão de loading: componentes somente-leitura (`AvailabilityGrid`, `PortfolioGallery`) mostram `Skeleton`; os gerenciadores editáveis equivalentes (`AvailabilityManager`, `PortfolioManager`) não mostram nada (`null`) durante `isPending` — inconsistência de padrão de loading entre a versão "view" e a versão "manage" do mesmo dado.
- Padrão de mensagens de vazio: todos usam o componente `EmptyState` com apenas `title` (sem `description` nem `action`), exceto a seção "Áreas de atendimento" dentro de `PublicProfilePage`, que usa um `<p>` simples em vez de `EmptyState`.
- `ServiceAreaManager` é o único gerenciador cuja fonte de dados de leitura não é um endpoint dedicado, mas sim reaproveita a query de perfil público (`usePublicProfile`) para extrair as áreas do próprio usuário.

---

### Capítulo: 08-chat

## Domínio 08 — Chat

Auditoria técnica da feature `features/chat/` do frontend (React + TypeScript). Documentação descritiva do estado atual, sem sugestões de melhoria.

Arquivos analisados:
- `src/features/chat/api.ts`
- `src/features/chat/queries.ts`
- `src/features/chat/schemas.ts`
- `src/features/chat/socket.ts`
- `src/features/chat/components/ChatWindow.tsx`
- `src/features/chat/pages/ChatIndexPage.tsx`
- `src/features/chat/pages/ChatPage.tsx`
- Testes (para entender comportamento esperado): `chat.test.tsx`, `components/ChatWindow.test.tsx`, `pages/ChatIndexPage.test.tsx`, `pages/ChatPage.test.tsx`
- Arquivos de apoio inspecionados para contextualizar a feature: `src/router/index.tsx`, `src/router/ProtectedRoute.tsx`, `src/stores/auth.ts`, `src/lib/http.ts`, `src/components/ui/Card.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/Button.tsx`

---

### Visão geral de rotas

Definidas em `src/router/index.tsx` (linhas 53-54), ambas dentro do grupo `{ element: <ProtectedRoute /> }` (sem prop `roles`, ou seja, sem restrição de papel — qualquer usuário autenticado, seja `client`, `professional` ou `admin`, acessa):

```tsx
{ path: '/chat', element: <ChatIndexPage /> },
{ path: '/chat/:roomId', element: <ChatPage /> },
```

`ProtectedRoute` (`src/router/ProtectedRoute.tsx`):
- Enquanto `isBootstrapping` (estado global do `useAuthStore`) for `true`, renderiza `null` (nada é exibido até a store de autenticação terminar de inicializar, por exemplo, restaurar sessão a partir do refresh token).
- Se não houver `user` autenticado, redireciona (`<Navigate replace />`) para `/login`.
- Se `roles` for informado e o papel do usuário não estiver na lista, redireciona para `/forbidden`. Como o grupo de `/chat` e `/chat/:roomId` não define `roles`, essa checagem não se aplica — todo usuário autenticado passa.
- Caso contrário, renderiza `<Outlet />`, que resolve para a página da rota filha.

Não há gate visível de contrato/relação (ex.: cliente só pode falar com o profissional do seu contrato) no código de frontend revisado — a validação de quem pode entrar numa sala específica (`roomId`) não aparece nesses arquivos; presumivelmente fica a cargo do backend ao aceitar/rejeitar o `join_room` ou ao retornar/negar o histórico de mensagens.

---

### ChatIndexPage

**Arquivo:** `src/features/chat/pages/ChatIndexPage.tsx`
**Rota:** `/chat`
**Quem acessa:** qualquer usuário autenticado (`client`, `professional`, `admin`) — protegido apenas por autenticação, sem restrição de papel.
**Objetivo:** servir de página "índice" do chat, ou seja, o destino de quando o usuário navega para `/chat` sem selecionar uma sala específica.

#### Descrição funcional

Componente funcional simples e totalmente estático (sem hooks, sem chamadas de API, sem estado local). Não busca nenhuma lista de conversas do usuário — apesar do nome "ChatIndexPage" sugerir uma listagem de conversas, a implementação atual **não lista conversas existentes**. Ela renderiza incondicionalmente um único estado: um `EmptyState` explicando que nenhuma conversa foi selecionada.

Código completo (14 linhas):
```tsx
export function ChatIndexPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}
```

#### Fluxo do usuário

1. Usuário autenticado navega para `/chat` (por link direto, digitação de URL, ou algum ponto de entrada não presente nesta feature — por exemplo, a partir da tela de contrato, que não foi analisada aqui).
2. A página renderiza imediatamente o `EmptyState` — não há loading, pois não há requisição assíncrona.
3. A descrição do `EmptyState` instrui o usuário, em texto, que deve "abrir o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente" — ou seja, a navegação para uma sala específica (`/chat/:roomId`) parte de fora desta feature (por exemplo, de um botão em `ContractDetailPage`), não é feita a partir do índice de chat.
4. Não há nenhum link, botão ou ação clicável na página. O `EmptyState` é renderizado sem a prop `action` (que existe no componente `EmptyState` mas não é usada aqui).

#### Hierarquia visual / layout / seções

- Container raiz: `div` com `flex flex-col gap-4 p-6` — layout de coluna única, com padding de página padrão (`p-6`) e espaçamento vertical (`gap-4`) entre filhos.
- Único filho: `EmptyState` (componente compartilhado `src/components/ui/EmptyState.tsx`), renderizado com:
  - `title`: "Nenhuma conversa selecionada" (parágrafo em negrito, `text-lg font-semibold text-ink`)
  - `description`: texto explicativo (`text-sm text-muted`)
  - sem `action` (portanto sem botão/CTA)
  - visual do `EmptyState`: `div` centralizado (`flex flex-col items-center gap-2`), fundo `bg-surface`, cantos arredondados (`rounded-lg`), padding generoso (`px-6 py-12`), texto centralizado (`text-center`).
- Não há lista de conversas, sidebar, nem qualquer estrutura de duas colunas nesta página — layout de coluna única e conteúdo mínimo.

#### Componentes usados

- `EmptyState` (`src/components/ui/EmptyState.tsx`) — único componente de UI usado. Props suportadas pelo componente: `title` (obrigatório), `description` (opcional), `action` (ReactNode opcional, não usado aqui), `className` (opcional, não usado aqui).

#### Estados

- **Único estado possível:** o `EmptyState` estático descrito acima. Não há estados de loading, erro, sucesso ou "lista vazia" no sentido de dados assíncronos, porque a página não faz nenhuma chamada de API/query/mutação.
- Não há tratamento de erro, pois não há operação passível de falhar.

#### Chamadas de API / queries / mutações

Nenhuma. A página não importa nem usa `queries.ts`, `api.ts` ou `socket.ts`.

#### Hooks usados

Nenhum hook do React (nem `useState`, `useEffect`, nem hooks customizados da feature).

#### Navegação / links

Nenhum link de saída ou entrada explícito no componente. Não há `<Link>`, `<button onClick={navigate}>`, nem uso de `useNavigate`. A navegação para uma sala real (`/chat/:roomId`) depende inteiramente de outras partes do app (fora do escopo desta auditoria) que devem construir a URL com o `roomId`.

#### Responsividade

Não há classes responsivas (`sm:`, `md:`, `lg:`, etc.) no componente. O layout usa `flex flex-col` e `p-6` fixos, que naturalmente se adaptam a qualquer largura de viewport por ser conteúdo único e centralizado, mas não há tratamento específico mobile vs desktop (nem necessidade, dado o conteúdo mínimo).

#### Complexidade, dependências, observações técnicas

- Complexidade: trivial (componente puramente apresentacional, sem estado, sem efeitos, sem I/O).
- Dependências: apenas `EmptyState` (interno) e o tipo `JSX` do React.
- Teste correspondente (`pages/ChatIndexPage.test.tsx`): verifica apenas a presença do texto "Nenhuma conversa selecionada" — cobre 100% da lógica existente (que é nula/estática).
- Observação de nomenclatura: o nome do arquivo/rota ("index" de chat) sugere uma listagem de conversas do usuário, mas a implementação atual não busca nem exibe nenhuma lista — é efetivamente uma tela de "nenhuma conversa selecionada" fixa, funcionando como placeholder/fallback de rota.

---

### ChatPage

**Arquivo:** `src/features/chat/pages/ChatPage.tsx`
**Rota:** `/chat/:roomId`
**Quem acessa:** qualquer usuário autenticado (`client`, `professional`, `admin`), sujeito apenas ao gate genérico de autenticação do `ProtectedRoute` (sem checagem de papel nem de participação na sala feita no frontend).
**Objetivo:** exibir a conversa (histórico de mensagens + envio de novas mensagens) de uma sala de chat identificada por `roomId` na URL.

#### Descrição funcional

Componente funcional que:
1. Lê o parâmetro de rota `roomId` via `useParams<{ roomId: string }>()` do `react-router-dom`.
2. Se `roomId` for `undefined` (ex.: rota acessada sem o parâmetro, embora a definição de rota `/chat/:roomId` sempre devesse fornecê-lo), renderiza uma mensagem textual simples: `<p className="p-6 text-muted">Selecione uma conversa.</p>` — sem nenhum componente de `EmptyState` reutilizável, apenas texto puro.
3. Caso `roomId` exista, renderiza um cabeçalho fixo ("Conversa") e delega toda a lógica de mensagens/socket ao componente `ChatWindow`, passando `roomId` como prop.

Código completo (23 linhas):
```tsx
export function ChatPage(): JSX.Element {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <p className="p-6 text-muted">Selecione uma conversa.</p>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem-5rem)] max-w-2xl flex-col gap-4 p-6 nav:h-[calc(100vh-4rem-1.5rem)]">
      <h1 className="text-2xl font-semibold text-ink">Conversa</h1>
      <div className="flex-1">
        <ChatWindow roomId={roomId} />
      </div>
    </div>
  );
}
```

#### Fluxo do usuário

1. Usuário chega em `/chat/:roomId` (por navegação externa à feature, ex.: a partir de um contrato, ou digitando/colando a URL).
2. `ProtectedRoute` já garantiu autenticação antes de renderizar esta página.
3. Se o parâmetro de rota não vier preenchido (cenário de borda, coberto por teste com rota `/chat` mapeada para o mesmo componente), a página mostra apenas o texto "Selecione uma conversa." sem qualquer ação subsequente possível a partir daqui.
4. Com `roomId` válido, a página renderiza o título "Conversa" e delega para `ChatWindow`, que por sua vez dispara a query de histórico (`useMessages`) e a conexão de socket (`useChatSocket`) — ver seção `ChatWindow` abaixo para todo o ciclo de carregamento/erro/mensagens/envio.
5. Não há troca de sala dentro da própria página (não há lista de salas, nem botão "voltar ao índice", nem breadcrumb) — a navegação entre salas depende de o usuário mudar a URL por fora desta feature.

#### Hierarquia visual / layout / seções

- Container raiz: `div` centralizado horizontalmente (`mx-auto`), com largura máxima `max-w-2xl`, layout de coluna (`flex flex-col gap-4`), padding `p-6`.
- Altura do container calculada dinamicamente via classe Tailwind arbitrária: `h-[calc(100vh-4rem-5rem)]`, com uma variante em breakpoint customizado `nav:h-[calc(100vh-4rem-1.5rem)]` (o modificador `nav:` sugere um breakpoint definido no tema Tailwind do projeto, provavelmente ligado à presença/ausência de uma barra de navegação lateral ou de rodapé, mas a definição exata do breakpoint `nav` não foi inspecionada nesta auditoria — não está nos arquivos da feature chat). Essas alturas descontam presumivelmente o header fixo (`4rem`) e algum espaço extra de rodapé/margem (`5rem` no caso base, `1.5rem` no breakpoint `nav`).
- Seção 1 — Título: `h1` "Conversa" (`text-2xl font-semibold text-ink`), estático, sem indicação do nome do interlocutor, do papel ou de qualquer metadado da sala (o `roomId` não é exibido nem usado para exibir nome do participante).
- Seção 2 — Corpo do chat: `div` com `flex-1` (ocupa o espaço vertical restante) contendo o componente `ChatWindow`, que internamente implementa a lista de mensagens e o formulário de envio (ver abaixo).
- Não há segunda coluna (ex.: lista de contatos/conversas ao lado) nesta página — o layout é de coluna única e largura limitada a `max-w-2xl`, centrada na tela. Ou seja, a feature de chat **não implementa um layout mestre-detalhe (lista + conversa) na mesma tela**; `ChatIndexPage` (lista/estado vazio) e `ChatPage` (conversa) são páginas de rota totalmente separadas e não são renderizadas simultaneamente lado a lado.

#### Componentes usados

- `ChatWindow` (`src/features/chat/components/ChatWindow.tsx`) — único componente de feature usado, recebe apenas a prop `roomId: string`.
- Nenhum outro componente compartilhado de UI é usado diretamente em `ChatPage` (o `Card`, `Skeleton`, `EmptyState`, `Button` usados na tela vêm de dentro de `ChatWindow`).

#### Estados

- **Sem roomId:** texto simples "Selecione uma conversa." (sem estilização de card/empty state, apenas parágrafo com `text-muted`).
- **Com roomId:** delega estados de loading/erro/sucesso/vazio inteiramente ao `ChatWindow` (ver seção seguinte). `ChatPage` em si não tem estado de loading próprio nem tratamento de erro — não há try/catch, não há verificação de existência da sala, não há redirecionamento em caso de sala inexistente/inacessível.

#### Chamadas de API / queries / mutações

Nenhuma diretamente em `ChatPage`. Toda a busca de dados (histórico de mensagens) e a integração de socket ocorrem dentro de `ChatWindow`.

#### Hooks usados

- `useParams<{ roomId: string }>()` do `react-router-dom` — único hook usado diretamente nesta página.

#### Navegação / links

Nenhum link ou botão de navegação presente na página (não há como voltar à lista de conversas, trocar de sala, ou sair do chat a partir da UI desta tela).

#### Responsividade

- A altura é ajustada via cálculo `calc()` dependente de viewport (`100vh`) combinada com um breakpoint customizado `nav:` — indicando que a altura do container muda conforme o layout de navegação (provavelmente header/nav mobile vs desktop), mas não há classes de grid/flex responsivas para mudar de coluna única para duas colunas.
- `max-w-2xl` limita a largura em telas grandes, centralizando o conteúdo; em mobile a largura ocupa o espaço disponível dentro do padding `p-6`.
- Não há classes de ocultação/exibição condicional por breakpoint (`hidden md:block` etc.) — o layout é o mesmo (coluna única, largura limitada) em qualquer tamanho de tela, mudando apenas a fórmula de altura via o breakpoint `nav`.

#### Complexidade, dependências, observações técnicas

- Complexidade: baixa. Um único hook de rota, um `if` de guarda, e delegação total da lógica de negócio para `ChatWindow`.
- Dependência direta: `ChatWindow`.
- Teste correspondente (`pages/ChatPage.test.tsx`): mocka `ChatWindow` (substitui por `<div>chat-window-{roomId}</div>`) e verifica (1) que o título "Conversa" aparece e o `roomId` da URL é passado corretamente ao `ChatWindow`, e (2) que a mensagem "Selecione uma conversa." aparece quando a rota é `/chat` sem parâmetro (montando a página sob uma rota `/chat` sem `:roomId`, cenário que na prática não ocorre via `router/index.tsx`, pois `/chat` real mapeia para `ChatIndexPage`, não para `ChatPage` — esse teste está exercitando um caso hipotético/defensivo do componente, não um caminho de navegação real do app).
- Observação: não há metadado da sala (nome do outro participante, status online, avatar) exibido no cabeçalho — o título é sempre o texto estático "Conversa", independentemente de quem é o interlocutor.

---

### ChatWindow (componente compartilhado da feature)

**Arquivo:** `src/features/chat/components/ChatWindow.tsx`
**Usado por:** `ChatPage` (único consumidor encontrado no código).

#### Props

```ts
interface ChatWindowProps {
  roomId: string;
}
```
Único parâmetro: `roomId` (string), obrigatório, identifica a sala cujo histórico e canal de tempo real serão carregados.

#### Estado interno

- `draft: string` (via `useState('')`) — texto atualmente digitado no campo de envio de mensagem. É o único estado local do componente.
- `currentUserId` — não é estado local, mas um valor derivado do store global Zustand `useAuthStore`, via seletor `(state) => state.user?.id`, usado para decidir se uma mensagem é "própria" (alinhada à direita, com cor de destaque) ou "do outro" (alinhada à esquerda).
- Dados de mensagens (`data`, `isLoading`) vêm do hook `useMessages(roomId)` (React Query) — não são estado local do componente, mas estado de cache gerenciado pelo React Query.
- Não há estado de "digitando..." (indicador de "usuário está digitando") implementado — não há emissão nem escuta de evento de "typing" em nenhum lugar do código (nem em `socket.ts`, nem em `queries.ts`, nem em `ChatWindow.tsx`).
- Não há estado de scroll controlado programaticamente (sem `useRef` para container de scroll, sem lógica de "scroll to bottom" ao chegar mensagem nova). O efeito de "mensagem mais recente aparece embaixo, próxima ao input" é obtido puramente via CSS: a lista usa `flex flex-col-reverse` (ver layout abaixo) e os itens (`data.items`) são renderizados na ordem em que vêm da API/cache — como o array é invertido visualmente pelo CSS, presumidamente `data.items[0]` é a mensagem mais recente (isso é reforçado pelo comportamento de `useChatSocket`, que insere mensagens novas no início do array — `items: [message, ...prev.items]`).

#### Ciclo de dados / hooks usados

- `useMessages(roomId)` (de `../queries`) — React Query `useQuery` que busca o histórico de mensagens via `fetchMessages(roomId)` (chama `GET /chat/rooms/:roomId/messages` com `params: { page: 1, limit: 20 }` fixos — `ChatWindow` não expõe paginação nem scroll infinito; sempre solicita a primeira página com limite de 20 mensagens).
- `useChatSocket(roomId)` (de `../queries`) — hook customizado que integra o socket em tempo real (ver seção `socket.ts` abaixo) e devolve `{ send }`, função para emitir uma nova mensagem via socket.
- `useAuthStore((state) => state.user?.id)` (de `../../../stores/auth`) — seletor Zustand para obter o id do usuário logado.
- `useState('')` — estado local do rascunho de mensagem.

#### Renderização condicional (estados de tela)

1. **Loading:** se `isLoading` for `true` OU `data` for `undefined`, renderiza `<Skeleton className="h-full w-full" aria-label="Carregando conversa" />` — nenhuma estrutura de card/lista/input é montada durante o carregamento; o skeleton ocupa toda a área do componente.
2. **Lista vazia (sem mensagens):** quando `data.items.length === 0`, renderiza dentro do `<ul>` um único `<li>` contendo `<EmptyState title="Nenhuma mensagem ainda" />` (sem `description` nem `action`).
3. **Sucesso com mensagens:** mapeia `data.items` para bolhas de mensagem (ver layout).
4. **Erro:** não há tratamento de estado de erro. `useMessages` não desestrutura `isError`/`error` do retorno do `useQuery`, então uma falha na requisição não é sinalizada visualmente ao usuário — o componente ficaria preso no estado de loading enquanto `data` for `undefined` (pois a condição de exibição do skeleton é `isLoading || !data`, e em caso de erro do React Query, `isLoading` se torna `false` mas `data` permanece `undefined`, então o skeleton continuaria sendo mostrado indefinidamente, sem mensagem de erro nem tentativa de nova busca visível ao usuário). Este é um comportamento observado diretamente no código-fonte, não uma inferência de teste (não há teste cobrindo esse cenário de erro).

#### Layout / hierarquia visual

- Container: `Card` (`flex h-full flex-col p-0`) — cartão com fundo `bg-bg`, cantos arredondados (via componente `Card`), mas com padding removido (`p-0`) para que a lista de mensagens e o formulário de envio controlem seu próprio espaçamento interno.
- **Seção 1 — Lista de mensagens:** `<ul>` com `flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4`:
  - `flex-1` faz a lista ocupar todo o espaço vertical disponível dentro do card, empurrando o formulário de envio para baixo.
  - `flex-col-reverse` inverte a ordem visual dos itens (o primeiro item do array aparece embaixo, próximo ao formulário de envio) — combinado com o overflow, cria o efeito comum de chat de "mensagens mais recentes embaixo e scroll ancorado no fim".
  - `overflow-y-auto` permite scroll vertical quando o conteúdo excede a altura disponível.
  - `gap-2` entre bolhas de mensagem.
  - Cada mensagem é um `<li>` com alinhamento condicional: `justify-end` se `isOwn` (mensagem do usuário atual), `justify-start` caso contrário.
  - Bolha de mensagem (`div`): `max-w-xs rounded-lg px-4 py-2 text-sm`, cor de fundo `bg-accent text-bg` se própria, `bg-surface text-ink` caso contrário.
  - Dentro da bolha: `<p>{message.content}</p>` (texto da mensagem) e `<p>` com o timestamp formatado via `new Date(message.createdAt).toLocaleString('pt-BR')` (formato de data/hora local pt-BR), com opacidade/cor reduzida (`text-bg/70` se própria, `text-muted` caso contrário) e `mt-1 text-xs`.
- **Seção 2 — Formulário de envio:** `<form>` com `flex gap-2 border-t border-surface p-3` (borda superior separando da lista, padding interno):
  - `<input>` de texto simples (não é `<textarea>`), controlado (`value={draft}`, `onChange` atualiza `draft`), classe `flex-1 rounded-sm border border-surface px-3 py-2 text-sm text-ink`, `placeholder="Mensagem"`. Não há atributo `maxLength`, nem `required`, nem `aria-label` explícito além do placeholder.
  - `<Button type="submit" size="sm">Enviar</Button>` — desabilitado (`disabled={!draft.trim()}`) quando o campo está vazio ou contém apenas espaços em branco.
  - Não há campo de upload de anexo/arquivo, nem botão de emoji, nem qualquer elemento de formatação rica — o formulário é estritamente texto simples de uma linha.

#### Validação e envio de mensagem

- Validação client-side mínima: o botão de envio fica desabilitado enquanto `draft.trim()` for uma string vazia (equivalente a `false`); não há validação de tamanho máximo, nem de conteúdo proibido/sanitização visível no frontend.
- Ao submeter o formulário (`onSubmit`):
  1. `event.preventDefault()` evita reload de página.
  2. Se `draft.trim()` for truthy, chama `send(draft.trim())` (função vinda de `useChatSocket`) e limpa o campo (`setDraft('')`).
  3. Se o draft for vazio/só espaços, o `submit` não faz nada (mas na prática o botão já estaria desabilitado, então o único caminho de submit sem conteúdo seria pressionar Enter dentro do input mesmo com o botão desabilitado — o `preventDefault` ainda ocorre, mas `send` não é chamado).
- O envio **não é uma mutação HTTP/REST** — não há chamada a `api.ts` para enviar mensagem. O envio é feito exclusivamente via emissão de evento de socket (`send_message`), delegando ao backend a responsabilidade de persistir e depois retransmitir a mensagem (via evento `message`) para os participantes da sala, incluindo o próprio remetente (a UI local não insere a mensagem otimisticamente no cache — o texto só aparece na lista quando o servidor ecoa o evento `message` de volta pelo socket).

#### Real-time updates

- Ao montar (via `useChatSocket(roomId)`, chamado dentro de `ChatWindow`), o efeito (`useEffect` dentro do hook, dependências `[roomId, client]`) executa `socket.emit('join_room', roomId)` para entrar na sala, e registra o listener `socket.on('message', onMessage)`.
- `onMessage` faz o parse do payload recebido via `messageSchema.parse(raw)` (validação Zod). Se `message.roomId !== roomId` (mensagem de outra sala, possivelmente entregue por engano ou por reconexão), o handler ignora silenciosamente (return antecipado sem atualizar cache).
- Se a mensagem pertence à sala atual, atualiza diretamente o cache do React Query via `client.setQueryData<MessagesPage>(chatKeys.messages(roomId), (prev) => prev ? { ...prev, items: [message, ...prev.items], total: prev.total + 1 } : prev)` — insere a nova mensagem no início do array `items` e incrementa `total`. Se `prev` for `undefined` (cache ainda não populado), não faz nada (retorna `prev`, ou seja, `undefined`).
- Ao desmontar (cleanup do `useEffect`), remove o listener: `socket.off('message', onMessage)`. Note que **não há `socket.emit('leave_room', roomId)`** no cleanup — a saída da sala no lado do socket não é sinalizada explicitamente ao desmontar o componente; apenas o listener de evento React é removido do lado do cliente.
- Não há nenhum evento de "digitando" (typing indicator), nem de "mensagem lida"/confirmação de leitura, nem de presença online/offline em todo o código analisado.

#### socket.ts — Documentação completa da integração de WebSocket

**Arquivo:** `src/features/chat/socket.ts`

```ts
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/auth';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      auth: { token: useAuthStore.getState().accessToken },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

- **Biblioteca:** `socket.io-client`.
- **Padrão de instância:** singleton em nível de módulo (`let socket: Socket | null = null`). A primeira chamada a `getChatSocket()` (de qualquer lugar do app) cria a conexão; chamadas subsequentes reaproveitam a mesma instância — ou seja, o socket é compartilhado por toda a aplicação (não é recriado por sala/roomId; apenas o `join_room` emitido difere conforme a sala visitada).
- **URL de conexão:** `io('/', ...)` — conecta ao mesmo host/origem da aplicação (URL relativa `/`), presumindo proxy reverso ou mesmo domínio para o servidor de socket.
- **Path customizado:** `path: '/socket.io'` — mesmo valor padrão da biblioteca (implícito), declarado explicitamente aqui.
- **Autenticação do socket:** `auth: { token: useAuthStore.getState().accessToken }` — o token de acesso (JWT presumidamente, mesmo usado nas chamadas HTTP via header `Authorization: Bearer` em `lib/http.ts`) é lido do estado do Zustand **no momento da criação do socket** (chamada síncrona a `getState()`, não reativa). Isso significa que, se o `accessToken` mudar depois (por exemplo, após um refresh de token feito por `refreshAccessToken()` em `lib/http.ts`), o socket já conectado **não** recebe automaticamente o novo token — não há lógica de re-autenticação ou reconexão com token atualizado em `socket.ts`. Um novo token só seria usado se o socket for desconectado (`disconnectChatSocket()`) e reconectado (nova chamada a `getChatSocket()` recriando a instância do zero).
- **Autoconexão:** `autoConnect: true` — a conexão é estabelecida imediatamente ao instanciar o `Socket` (comportamento padrão da lib, declarado explicitamente).
- **Reconexão:** não há nenhuma opção customizada de reconexão configurada (`reconnection`, `reconnectionAttempts`, `reconnectionDelay`, etc.) — o comportamento de reconexão automática usado é inteiramente o padrão da biblioteca `socket.io-client` (que por padrão tenta reconectar automaticamente com backoff). Não há lógica customizada no código do frontend para lidar com eventos de reconexão (`connect`, `disconnect`, `connect_error`, `reconnect_attempt`, etc.) — nenhum desses eventos é escutado em `socket.ts` nem em `queries.ts`/`ChatWindow.tsx`. Portanto não há indicador de UI para "reconectando..." nem tratamento visível de falha de conexão do socket.
- **Eventos emitidos pelo cliente:**
  - `join_room` (payload: `roomId: string`) — emitido em `useChatSocket` ao montar o componente que observa uma sala (dentro do `useEffect`).
  - `send_message` (payload: `{ roomId: string, content: string }`) — emitido pela função `send()` retornada por `useChatSocket`, chamada a partir do `onSubmit` do formulário em `ChatWindow`.
- **Eventos escutados pelo cliente:**
  - `message` — único evento de servidor→cliente tratado. Valida o payload com `messageSchema.parse(raw)` (schema Zod, ver `schemas.ts`) e atualiza o cache do React Query se pertencer à sala atualmente observada.
- **Desconexão:** `disconnectChatSocket()` chama `socket?.disconnect()` e zera a referência do módulo (`socket = null`), permitindo que uma futura chamada a `getChatSocket()` crie uma instância nova (com um token de auth atualizado, se aplicável). Não há nenhum ponto de chamada a `disconnectChatSocket()` encontrado dentro da própria feature `chat` (nem em `ChatWindow`, nem em `ChatPage`, nem em `ChatIndexPage`) — presumivelmente essa função é chamada de outro lugar da aplicação (ex.: fluxo de logout), mas isso está fora do escopo dos arquivos revisados nesta auditoria.
- **Múltiplas salas / múltiplos `join_room`:** como o socket é singleton e não há `leave_room` emitido no cleanup do hook, se o usuário navegar de uma sala para outra (`ChatPage` desmonta e remonta com `roomId` diferente), o cliente permanece "juntado" (`joined`) a todas as salas que visitou na sessão do lado do servidor (do ponto de vista do cliente, apenas o listener React `onMessage` é trocado e o filtro por `message.roomId !== roomId` garante que mensagens de salas antigas não poluam a UI atual, mas o socket como transporte continua recebendo/roteando eventos de todas essas salas).

#### Validação de schema (schemas.ts)

Definido em `src/features/chat/schemas.ts` com Zod:
- `chatRoomSchema`: `{ id: uuid, clientId: uuid, professionalId: uuid, contractId: uuid | null }` — representa uma sala de chat associada a um par cliente/profissional e, opcionalmente, a um contrato.
- `messageSchema`: `{ id: uuid, roomId: uuid, senderId: uuid, content: string, createdAt: string (datetime ISO) }`.
- `messagesPageSchema`: `{ items: Message[], page: number, limit: number, total: number }` — formato de página com paginação (mas, como visto, `ChatWindow` sempre solicita a página 1 com limite 20, sem UI de "carregar mais"/paginação/scroll infinito).
- Tipos inferidos exportados: `ChatRoom`, `Message`, `MessagesPage`.

#### API REST (api.ts)

Duas funções, ambas usando o client HTTP compartilhado `http` (Axios, `src/lib/http.ts`, com interceptors de `Authorization: Bearer <token>` e de refresh automático em 401):
- `fetchMessages(roomId, page = 1, limit = 20)`: `GET /chat/rooms/:roomId/messages` com `params: { page, limit }`; parseia a resposta com `messagesPageSchema`. Usada por `useMessages` (React Query). Note que `ChatWindow` só chama `useMessages(roomId)` sem argumentos de página, então `page`/`limit` sempre assumem os padrões (1 e 20) — os parâmetros existem na função `fetchMessages` mas não são exercitados de fato pela UI atual.
- `createRoom(participantId, contractId?)`: `POST /chat/rooms` com body `{ participantId, contractId: contractId ?? null }`; parseia a resposta com `chatRoomSchema`. Exposta via hook `useCreateRoom()` (`useMutation`) em `queries.ts`, mas **não há nenhum consumidor de `useCreateRoom` em `ChatIndexPage`, `ChatPage` ou `ChatWindow`** — a mutação existe no código mas não é chamada por nenhuma das telas documentadas nesta auditoria (presumivelmente é consumida por outra feature, como a tela de contrato, para iniciar uma conversa e navegar ao `roomId` retornado, mas isso está fora do escopo dos arquivos revisados).

#### React Query — chaves e comportamento de cache

- `chatKeys.messages(roomId)` → `['chat', 'messages', roomId]` — chave de query única por sala.
- `useMessages(roomId)`: `useQuery({ queryKey: chatKeys.messages(roomId), queryFn: () => fetchMessages(roomId) })` — sem opções customizadas de `staleTime`, `gcTime`, `refetchInterval`, `retry`, etc. (usa os padrões globais do `QueryClient` configurados em outro lugar da aplicação, não inspecionado aqui). Sem paginação/`useInfiniteQuery` — apenas uma página fixa é buscada por vez.
- Atualização de cache em tempo real: como descrito, o listener de socket escreve diretamente no cache via `setQueryData`, sem invalidar/refazer a query (`invalidateQueries` não é usado) — ou seja, a lista de mensagens em tela é uma combinação de "uma busca HTTP inicial" + "patches incrementais via socket", nunca re-buscada do zero após o carregamento inicial (a menos que o componente desmonte/remonte ou que outra parte do app invalide essa query explicitamente).

#### Eventos, formulário e upload de anexo

- Não há campo de upload de arquivo/anexo em nenhum lugar da feature — o formulário de `ChatWindow` é texto puro.
- Não há emojis, formatação rica, nem preview de mídia.
- Não há confirmação de "mensagem enviada"/"entregue"/"lida" (sem ticks de status).

#### Complexidade, dependências e observações técnicas gerais da feature Chat

- **Complexidade geral:** moderada — concentrada quase inteiramente em `ChatWindow.tsx` e `queries.ts` (integração híbrida REST + WebSocket). `ChatIndexPage` e `ChatPage` são finas.
- **Dependências externas:** `socket.io-client`, `zod`, `@tanstack/react-query`, `axios` (indireto via `lib/http.ts`), `zustand` (via `stores/auth.ts`), `react-router-dom` (via `useParams`).
- **Dependências internas:** `components/ui/Card`, `components/ui/Skeleton`, `components/ui/EmptyState`, `components/ui/Button`, `lib/utils` (função `cn` para composição de classes condicionais), `lib/http`, `stores/auth`.
- **Pontos observados diretamente no código (sem interpretação/opinião):**
  - Não há tratamento de estado de erro de `useMessages` (fica preso no skeleton indefinidamente em caso de falha HTTP, pois `isLoading` retorna a `false` mas `data` permanece `undefined`).
  - Não há indicador de "digitando..." nem de presença online.
  - Não há emissão de `leave_room` ao desmontar/trocar de sala.
  - O token de autenticação do socket é capturado apenas na criação da instância (não reativo a refresh de token subsequente).
  - `ChatIndexPage` não lista conversas reais — é um estado vazio estático.
  - `ChatPage` não exibe metadados da sala (nome do interlocutor, avatar, status) no cabeçalho, que é sempre o texto fixo "Conversa".
  - Não há layout mestre-detalhe (duas colunas) entre lista de conversas e janela de mensagens — são páginas de rota inteiramente distintas, sem composição lado a lado.
  - `createRoom`/`useCreateRoom` existe na camada de dados mas não é consumido por nenhuma das três telas/componentes desta auditoria.
  - Paginação de histórico (`page`, `limit` em `fetchMessages`) existe na assinatura da função mas não é exercitada pela UI (sempre página 1, limite 20, sem "carregar mais mensagens antigas").
- **Testes existentes:** cobrem os casos de sucesso (histórico renderizado, envio delegado ao socket mock), loading (skeleton) e lista vazia (`EmptyState`) de `ChatWindow`; o estado de "sem `roomId`" de `ChatPage`; e o texto estático de `ChatIndexPage`. Não há testes cobrindo cenário de erro de rede, reconexão de socket, múltiplas salas, ou o hook `useChatSocket`/`useCreateRoom` isoladamente (apenas indiretamente via mocks em `ChatWindow.test.tsx`).

---

### Capítulo: 09-wallet

## Domínio: Wallet (Carteira)

Diretório: `frontend/src/features/wallet/`

Arquivos que compõem a feature:
- `api.ts` — funções de acesso HTTP e tipos de domínio (`Wallet`, `WalletTransaction`, `Withdrawal`, `Paginated<T>`)
- `queries.ts` — hooks React Query (`useWallet`, `useTransactions`, `useWithdrawals`, `useRequestWithdrawal`) e `walletKeys`
- `schemas.ts` — schema Zod do formulário de saque (`withdrawFormSchema`)
- `components/WalletBalanceCard.tsx`
- `components/WalletRevenueChart.tsx`
- `components/TransactionList.tsx`
- `components/WithdrawDialog.tsx`
- `pages/WalletPage.tsx`
- Testes: `wallet.test.tsx`, `components/TransactionList.test.tsx`, `components/WalletBalanceCard.test.tsx`, `components/WalletRevenueChart.test.tsx` (não documentados em detalhe, apenas consultados para entender comportamento esperado)

---

### Tela: WalletPage

- **Nome do componente**: `WalletPage` (export default)
- **Arquivo**: `frontend/src/features/wallet/pages/WalletPage.tsx`
- **Rota**: `/wallet`, registrada em `frontend/src/router/index.tsx` linha 51, dentro do grupo `{ element: <ProtectedRoute /> }` (sem restrição de `roles`).
- **Quem acessa**: qualquer usuário autenticado, independente do `role` (`client`, `professional`, `admin`). O `ProtectedRoute` (`frontend/src/router/ProtectedRoute.tsx`) só verifica:
  - se `isBootstrapping` está true → renderiza `null` (aguardando resolução do estado de auth);
  - se `user` é `null` → redireciona para `/login`;
  - se `roles` prop está definida e o role do usuário não está incluído → redireciona para `/forbidden`.
  Como a rota `/wallet` não passa `roles`, **não há bloqueio por papel** no nível de rota. É acessível a `client`, `professional` e `admin` igualmente.
- **Presença na navegação por role** (`frontend/src/lib/navConfig.ts`):
  - `clientNav`: item "Carteira" → `/wallet` (ícone `BanknotesIcon`)
  - `professionalNav`: item "Carteira" → `/wallet` (ícone `BanknotesIcon`)
  - `adminNav`: item "Pagamentos/Carteira" → `/wallet` (ícone `CreditCardIcon`, rótulo diferente dos outros dois papéis)
  Ou seja, os três papéis têm um link de menu apontando para a mesma rota/página, apenas com o rótulo do item de admin diferente ("Pagamentos/Carteira" em vez de "Carteira").
- **Objetivo funcional**: exibir o saldo da carteira do usuário logado, um gráfico de receita dos últimos 6 meses e a lista de movimentações (transações), além de permitir abrir um diálogo para solicitar saque.
- **Diferenciação de comportamento por role dentro do componente**: **não existe** nenhuma lógica condicional por `role` dentro de `WalletPage.tsx`, `WithdrawDialog.tsx`, `WalletBalanceCard.tsx`, `WalletRevenueChart.tsx` ou `TransactionList.tsx`. Não há checagem de `user.role`, nem import de `useAuthStore`/hook de autenticação em nenhum arquivo da feature. O botão "Sacar" e o diálogo de saque ficam disponíveis para qualquer usuário autenticado que acesse a tela, sem distinção visual ou funcional entre client, professional ou admin. Toda a diferenciação (se houver) dependeria do backend (dados retornados por `/wallet`, `/wallet/transactions`, `/withdrawals`), não há evidência disso no código frontend.

#### Estrutura do componente (linha a linha)

```tsx
export default function WalletPage(): JSX.Element {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const wallet = useWallet();
  const transactions = useTransactions(1);
  ...
}
```

- Estado local único: `showWithdraw` (boolean), controla a visibilidade do `WithdrawDialog`. Inicializado em `false`.
- `useWallet()` — query do saldo da carteira.
- `useTransactions(1)` — query de transações, página fixa `1` (sem parâmetro de página vindo de estado/URL; a página está hardcoded como `1`, portanto a WalletPage sempre busca a primeira página com `limit` padrão de 20).

#### Layout e hierarquia visual

Container raiz: `<div className="flex flex-col gap-6 p-6">` — layout em coluna única, com espaçamento vertical de `gap-6` e padding `p-6` em todos os lados. Não há grid ou divisão em colunas; todas as seções são empilhadas verticalmente.

Ordem das seções, de cima para baixo:

1. **Cabeçalho** (`<div className="flex items-center justify-between">`):
   - `<h1 className="text-3xl font-bold text-ink">Carteira</h1>` — título da página.
   - `<Button onClick={() => setShowWithdraw(true)}>Sacar</Button>` — botão que abre o `WithdrawDialog`. Usa variante padrão do `Button` (`primary`, tamanho `md`).
   - Layout: título à esquerda, botão à direita (`justify-between`).

2. **Card de saldo** (`WalletBalanceCard`):
   - Renderizado condicionalmente: se `wallet.isPending` for `true` OU `wallet.data` for falsy → renderiza `<Skeleton className="h-24 w-full" aria-label="Carregando carteira" />`.
   - Caso contrário, renderiza `<WalletBalanceCard balance={wallet.data.balance} pendingBalance={wallet.data.pendingBalance} />`.
   - **Não há tratamento de estado de erro** (`wallet.isError`) — se a query falhar, o componente permanece preso no branch de skeleton para sempre (pois `wallet.isPending` seria `false` após erro, mas `wallet.data` continua `undefined`/falsy, então a condição `wallet.isPending || !wallet.data` ainda é `true` — na prática, em caso de erro definitivo, o skeleton de carregamento fica exibido indefinidamente, sem mensagem de erro visível ao usuário).

3. **Gráfico de receita** (`WalletRevenueChart`):
   - Renderizado sempre, sem condicional na `WalletPage` (o componente cuida internamente do seu próprio loading).

4. **Seção "Movimentações"** (`<section className="flex flex-col gap-3">`):
   - `<h2 className="text-lg font-semibold text-ink">Movimentações</h2>` — título de seção.
   - Condicional: se `transactions.isPending` → `<Skeleton className="h-24 w-full" aria-label="Carregando movimentações" />`.
   - Caso contrário → `<TransactionList transactions={transactions.data?.items ?? []} />` (usa `?? []` como fallback, portanto se `data` for `undefined` após erro, a lista é tratada como vazia e cai no `EmptyState` interno do `TransactionList`, mascarando um possível erro de rede como "nenhuma movimentação").
   - Também aqui: **nenhum tratamento explícito de `isError`**.

5. **Diálogo de saque** (`WithdrawDialog`):
   - Renderização condicional por curto-circuito: `{showWithdraw && <WithdrawDialog onClose={() => setShowWithdraw(false)} />}`.
   - Só é montado no DOM quando `showWithdraw === true` (ou seja, o componente `WithdrawDialog` é desmontado, não apenas escondido via CSS, quando fechado).

#### Estados da tela

| Estado | Condição | Comportamento visual |
|---|---|---|
| Loading do saldo | `wallet.isPending \|\| !wallet.data` | `Skeleton` de altura `h-24 w-full` no lugar do `WalletBalanceCard` |
| Loading das transações | `transactions.isPending` | `Skeleton` de altura `h-24 w-full` no lugar da `TransactionList` |
| Sucesso (saldo) | dados carregados | `WalletBalanceCard` renderizado com `balance` e `pendingBalance` |
| Sucesso (transações) | dados carregados | `TransactionList` renderizado com o array `items` |
| Lista vazia | `transactions.data.items` é array vazio (ou `data` é `undefined`) | `TransactionList` renderiza internamente `EmptyState` com título "Nenhuma movimentação ainda" |
| Erro (saldo ou transações) | `isError` true | **Não tratado explicitamente.** Não existe branch de erro; a UI permanece no estado de skeleton (saldo) ou cai silenciosamente em "lista vazia" (transações via `?? []`). Nenhuma mensagem de erro, toast ou retry é exibido nesta tela para essas duas queries. |
| Modal de saque aberto | `showWithdraw === true` | `WithdrawDialog` montado sobre a página via portal |

#### Componentes usados por WalletPage

- `WalletBalanceCard` (`../components/WalletBalanceCard`)
- `TransactionList` (`../components/TransactionList`)
- `WithdrawDialog` (`../components/WithdrawDialog`)
- `WalletRevenueChart` (`../components/WalletRevenueChart`)
- `Button` (`../../../components/ui/Button`)
- `Skeleton` (`../../../components/ui/Skeleton`)

#### Hooks usados

- `useState` (React) — controle do modal de saque.
- `useWallet()` (de `../queries`) — `useQuery` com `queryKey: ['wallet']`, `queryFn: fetchWallet`.
- `useTransactions(1)` (de `../queries`) — `useQuery` com `queryKey: ['wallet', 'transactions', page, limit]` (aqui `page=1`, `limit` default `20`), `queryFn: () => fetchTransactions(page, limit)`.

#### Chamadas de API / queries / mutations relacionadas à tela

Definidas em `frontend/src/features/wallet/api.ts`, todas usando o cliente `http` de `frontend/src/lib/http`:

- `fetchWallet(): Promise<Wallet>` → `GET /wallet` (sem parâmetros).
- `fetchTransactions(page, limit = 20): Promise<Paginated<WalletTransaction>>` → `GET /wallet/transactions` com query params `{ page, limit }`.
- `fetchWithdrawals(): Promise<Withdrawal[]>` → `GET /withdrawals` (usado pelo hook `useWithdrawals`, que **não é consumido por nenhum componente da feature** — nem `WalletPage`, nem `WithdrawDialog`, nem outro arquivo, segundo checagem de uso; existe apenas como hook exportado em `queries.ts` sem consumidor atual).
- `requestWithdrawal(input): Promise<Withdrawal>` → `POST /withdrawals` com corpo `input` (usado por `WithdrawDialog` via `useRequestWithdrawal`).

Hooks em `queries.ts`:
- `useWallet()` → `useQuery({ queryKey: walletKeys.wallet, queryFn: fetchWallet })`
- `useTransactions(page, limit = 20)` → `useQuery({ queryKey: walletKeys.transactions(page, limit), queryFn: () => fetchTransactions(page, limit) })`
- `useWithdrawals()` → `useQuery({ queryKey: walletKeys.withdrawals, queryFn: fetchWithdrawals })` (não utilizado por nenhum componente atualmente)
- `useRequestWithdrawal()` → `useMutation` que chama `requestWithdrawal`; no `onSuccess`, invalida `walletKeys.wallet` e `walletKeys.withdrawals` (via `queryClient.invalidateQueries`). Não invalida `walletKeys.transactions`.

`walletKeys` (chaves de cache do React Query):
```ts
export const walletKeys = {
  wallet: ['wallet'] as const,
  transactions: (page: number, limit: number) => ['wallet', 'transactions', page, limit] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
};
```

#### Navegação / links

- A própria tela é acessada via item de menu lateral/nav (rótulo "Carteira" para client/professional, "Pagamentos/Carteira" para admin), todos apontando para `/wallet`.
- A tela `WalletPage` **não contém links de saída** (nenhum `<Link>`/`navigate` para outras rotas). A única navegação interna é a abertura/fechamento do modal de saque, que não altera a URL.
- Outras telas do sistema que referenciam `/wallet` (fora da própria feature): `features/professional-dashboard/components/DashboardRevenueWidget.tsx` e `features/contracts/components/PaymentDialog.tsx` (fora do escopo desta auditoria, mas mencionados por completude de contexto de navegação).

#### Responsividade

- Não há classes responsivas (`sm:`, `md:`, `lg:`) em nenhum ponto da `WalletPage` nem dos seus subcomponentes diretos. O layout é fixo em coluna única (`flex flex-col gap-6 p-6`), o que naturalmente se adapta a telas estreitas por ser vertical, mas não possui breakpoints explícitos para reorganizar em múltiplas colunas em telas largas.
- No cabeçalho (`flex items-center justify-between`), título e botão "Sacar" ficam sempre lado a lado, sem quebra de linha condicional para mobile.
- O gráfico de receita (`WalletRevenueChart`) usa `flex items-end gap-3` com `flex-1` em cada barra/mês, o que distribui os 6 meses uniformemente na largura disponível, encolhendo proporcionalmente em telas estreitas, mas sem breakpoint dedicado.

#### Complexidade, dependências e observações técnicas

- Complexidade baixa a moderada: a página em si é um componente simples de orquestração (busca dois recursos, renderiza 4 subcomponentes, controla um boolean de modal).
- Dependências diretas: `@tanstack/react-query` (via hooks), componentes de UI compartilhados (`Button`, `Skeleton`, `Card`, `Modal`, `EmptyState`), `zod` + `@hookform/resolvers/zod` + `react-hook-form` (via `WithdrawDialog`).
- Pontos observados no código (apenas descritivos, sem sugestão de correção):
  - Nenhuma das três queries (`useWallet`, `useTransactions`, e indiretamente `useWithdrawals` que não é usada) trata explicitamente `isError`/`error` na UI da wallet.
  - `useTransactions(1)` na `WalletPage` está com página fixa em `1`; não há paginação de fato acionável nesta tela (não há botões de "próxima página" nem estado de página controlado por UI) — ver seção `TransactionList` abaixo para mais detalhes sobre a ausência de paginação client-side.
  - O hook `useWithdrawals` existe em `queries.ts` e a função `fetchWithdrawals` em `api.ts`, mas não há nenhum consumidor visível dentro da feature (nem em `WalletPage`, nem em `WithdrawDialog`) — não é exibido histórico de saques na tela.
  - O `WalletRevenueChart` executa sua própria chamada a `useTransactions(1, 100)` (página 1, limit 100), **independente e duplicada** em relação à chamada `useTransactions(1)` (limit padrão 20) feita pela `WalletPage` para a lista de transações — são duas chaves de cache diferentes (`['wallet','transactions',1,20]` vs `['wallet','transactions',1,100]`), portanto duas requisições HTTP distintas ao mesmo endpoint `GET /wallet/transactions` ocorrem ao carregar a tela.

---

### Card: WalletBalanceCard

- **Arquivo**: `frontend/src/features/wallet/components/WalletBalanceCard.tsx`
- **Tipo**: componente puro de apresentação (sem estado, sem hooks de dados) — recebe os dados via props.
- **Props**: `{ balance: number; pendingBalance: number }`.
- **Estrutura**:
  - Envolvido em `<Card>` (componente genérico `frontend/src/components/ui/Card.tsx`, que renderiza `<div className="rounded-lg bg-bg p-6">`, sem variante `interactive` aqui, portanto sem cursor pointer nem hover shadow).
  - Linha 1: `<p className="text-sm text-muted">Saldo disponível</p>` — rótulo.
  - Linha 2: `<p className="text-3xl font-bold text-ink">{formatCurrency(balance)}</p>` — valor principal, formatado via `formatCurrency` (utilitário de `frontend/src/lib/utils.ts`).
  - Linha 3: `<p className="mt-2 text-sm text-muted">Pendente: {formatCurrency(pendingBalance)}</p>` — saldo pendente, com margem superior `mt-2`.
- **Botões**: nenhum. O card é puramente informativo; o botão "Sacar" que abre o `WithdrawDialog` vive no cabeçalho da `WalletPage`, não dentro do `WalletBalanceCard`.
- **Estados**: não há estados próprios (loading/erro/vazio) dentro do componente — esses estados são tratados no nível da `WalletPage` (via `Skeleton` condicional antes de renderizar o card). O card em si sempre assume que `balance` e `pendingBalance` já são números válidos.
- **Formatação**: usa `formatCurrency` de `frontend/src/lib/utils.ts` (linha 14), que aceita `string | number`.

---

### Gráfico: WalletRevenueChart

- **Arquivo**: `frontend/src/features/wallet/components/WalletRevenueChart.tsx`
- **Tipo de gráfico**: **gráfico de barras verticais construído manualmente com `div`s e CSS** (não usa nenhuma biblioteca de gráficos como Recharts, Chart.js, Victory, etc.). Cada barra é um `<div>` com `style={{ height: '${heightPercent}%' }}` dentro de um container de altura fixa `h-32` (128px).
- **Biblioteca usada**: nenhuma biblioteca externa de charting. Apenas React + Tailwind (classes utilitárias) + `Intl.DateTimeFormat` nativo do JS para formatar nomes de mês.
- **Fonte de dados**: hook próprio `useTransactions(1, 100)` — busca até 100 transações da página 1 (chamada independente da que a `WalletPage` faz para a `TransactionList`, gerando uma segunda requisição HTTP a `/wallet/transactions` com `limit=100`).
- **Processamento dos dados** (client-side, dentro do próprio componente, sem lib de agregação):
  - `MONTH_COUNT = 6` — janela fixa de 6 meses.
  - `buildLastMonths(6)` gera os últimos 6 meses (incluindo o atual), cada um com uma `key` no formato `"ano-mêsIndex"` (ex.: `"2026-6"`) e um `label` formatado em português abreviado (`month: 'short'`) via `Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })`, ex. "jul".
  - Para cada transação retornada, se `tx.type !== 'credit'` ela é **ignorada** (o gráfico só soma créditos, ou seja, apenas receita entrando, não débitos/retenções/liberações).
  - Soma o `amount` das transações do tipo `credit` no mês correspondente (`monthKey(new Date(tx.createdAt))`), acumulando em um `Map<string, number>` (`totals`).
  - Transações fora da janela de 6 meses (chave não presente em `totals`) são silenciosamente descartadas (`if (totals.has(key))`).
  - `maxValue = Math.max(1, ...valores)` — evita divisão por zero quando todos os totais são 0 (piso mínimo de 1).
- **Eixos**: não há eixo Y numérico nem labels de valor visíveis por padrão — a altura da barra é proporcional (`heightPercent = (value / maxValue) * 100`), e o valor exato só aparece via atributo nativo `title` (tooltip do navegador ao passar o mouse), formatado com `formatCurrency`. O eixo X é composto pelos rótulos de mês abaixo de cada barra (`<span className="text-xs capitalize text-muted">{month.label}</span>`), com `capitalize` via CSS (já que `Intl.DateTimeFormat` retorna minúsculo, ex. "jul").
- **Título do card**: `<h2 className="mb-3 text-lg font-semibold text-ink">Receita nos últimos 6 meses</h2>`.
- **Estrutura visual**: `<Card>` contendo o título e, abaixo, uma linha flex (`flex items-end gap-3`) com uma coluna por mês (`flex-1 flex-col items-center gap-1`); dentro de cada coluna, um container de altura fixa `h-32` alinhado ao fim (`items-end`) contendo a barra (`div` com `bg-primary`, `rounded-t-sm`, altura dinâmica via inline style).
- **Estado de loading**: `isPending` do `useTransactions` → renderiza `<Skeleton className="h-40 w-full" aria-label="Carregando gráfico de receita" />` no lugar do gráfico (mas o título "Receita nos últimos 6 meses" permanece visível acima do skeleton, pois está fora do bloco condicional).
- **Estado vazio**: não há um estado vazio dedicado — se não houver transações do tipo `credit` nos últimos 6 meses, o gráfico ainda renderiza as 6 colunas, todas com altura 0% (barras "achatadas", já que `totals` é inicializado com todos os meses zerados e `maxValue` mínimo é 1).
- **Estado de erro**: não tratado — não há verificação de `isError` neste componente; em caso de falha da query, o comportamento seria o mesmo de "sem dados" após a fase de loading (pois `data` fica `undefined`, e `data?.items ?? []` resulta em array vazio, gerando barras zeradas silenciosamente).

---

### Lista: TransactionList

- **Arquivo**: `frontend/src/features/wallet/components/TransactionList.tsx`
- **Tipo**: componente puro de apresentação, recebe `transactions: WalletTransaction[]` via props (não busca dados por si mesmo — quem busca é a `WalletPage`, que passa `transactions.data?.items ?? []`).
- **Origem dos dados**: prop `transactions`, populada pela `WalletPage` a partir de `useTransactions(1)` (página 1, limit padrão 20, definido em `api.ts`).
- **Elemento de lista**: `<ul className="flex flex-col gap-2">`, cada item é um `<li>` (não usa `Card` nem elemento próprio de "linha" reutilizável — é uma `li` estilizada diretamente).
- **Estrutura de cada linha** (`<li className="flex items-center justify-between rounded-lg bg-surface p-3">`):
  - Bloco esquerdo: `<p className="text-sm font-medium text-ink">{tx.description ?? TYPE_LABELS[tx.type]}</p>` (usa a descrição da transação se existir, senão cai no rótulo traduzido do tipo) e, abaixo, `<p className="text-xs text-muted">{formatDate(tx.createdAt)}</p>`.
  - Bloco direito: `<span className={tx.type === 'credit' ? 'text-accent' : 'text-ink'}>` com sinal `+` para `credit` e `-` para qualquer outro tipo (`debit`, `hold`, `release`), seguido do valor formatado via `formatCurrency(tx.amount)`. Nota: apenas `credit` recebe cor de destaque (`text-accent`); os demais três tipos (`debit`, `hold`, `release`) usam a mesma cor padrão `text-ink` e o mesmo sinal `-`, sem diferenciação visual entre si.
  - Mapa de rótulos de tipo (`TYPE_LABELS`): `credit` → "Crédito", `debit` → "Débito", `hold` → "Retenção", `release` → "Liberação".
- **Paginação**: **não implementada nesta lista/componente**. O componente apenas renderiza o array recebido, sem nenhum controle de paginação (sem botões "anterior/próxima", sem infinite scroll, sem indicador de página). A paginação existe apenas no nível da API (`fetchTransactions(page, limit)` aceita `page`/`limit` e retorna `Paginated<T>` com `page`, `limit`, `total`), mas a `WalletPage` sempre chama com `page=1` fixo e nunca expõe controle de mudança de página na UI — portanto, na prática, o usuário só vê a primeira página (até 20 itens) e não tem como navegar para mais transações através desta tela.
- **Filtro**: não há filtro nenhum (por tipo, por data, por texto) implementado na UI desta lista.
- **Ordenação**: não há lógica de ordenação no frontend; a ordem exibida é exatamente a ordem em que o array `items` chega da API (presumivelmente ordenado pelo backend, sem controle client-side).
- **Estado vazio**: quando `transactions.length === 0`, renderiza `<EmptyState title="Nenhuma movimentação ainda" />` (sem `description` nem `action`, apenas o título). Esse componente `EmptyState` (`frontend/src/components/ui/EmptyState.tsx`) exibe um bloco centralizado com fundo `bg-surface`, padding vertical generoso (`py-12`).
- **Estados de loading/erro**: **não tratados dentro do próprio `TransactionList`** — o componente não recebe nem verifica `isPending`/`isError`; esses estados são responsabilidade exclusiva da `WalletPage`, que decide renderizar um `Skeleton` genérico (`h-24 w-full`) *antes* de montar o `TransactionList`, ou renderizar o `TransactionList` diretamente quando os dados chegam (mesmo em caso de erro, pois `data?.items ?? []` mascara o erro como lista vazia, como descrito acima).

---

### Modal/Dialog: WithdrawDialog

- **Arquivo**: `frontend/src/features/wallet/components/WithdrawDialog.tsx`
- **Quem abre**: a `WalletPage`, ao clicar no botão "Sacar" do cabeçalho (`onClick={() => setShowWithdraw(true)}`). O componente `WithdrawDialog` só é montado no DOM quando `showWithdraw === true` (renderização condicional, não apenas ocultação via CSS).
- **Quem fecha**: o próprio `WithdrawDialog` recebe a prop `onClose: () => void` da `WalletPage` (que seta `showWithdraw` para `false`). Formas de fechamento disponíveis:
  1. Botão "×" no cabeçalho do `Modal` (aria-label "Fechar"), implementado dentro do componente genérico `Modal` (`frontend/src/components/ui/Modal.tsx`).
  2. Tecla `Escape`, tratada por um `useEffect` dentro do `Modal` genérico que escuta `keydown` no `document` enquanto `open` for `true`.
  3. Botão "Cancelar" (`variant="ghost"`, `type="button"`) dentro do formulário, que chama `onClose` diretamente.
  4. Fechamento automático em caso de sucesso da mutation: `mutation.mutate(values, { onSuccess: onClose })` — ou seja, ao concluir o saque com sucesso, o modal fecha sozinho.
  - Não fecha ao clicar no backdrop/overlay: o `Modal` genérico não implementa `onClick` no `<div>` de fundo (`fixed inset-0 ... bg-ink/40`), portanto clicar fora do card do modal **não** fecha o diálogo (apenas Escape, botão "×" ou botão "Cancelar"/sucesso da submissão fecham).
- **Objetivo**: permitir que o usuário logado solicite um saque de valores da carteira, informando valor, método de pagamento e destino.
- **Renderização/portal**: usa o componente genérico `Modal` (`frontend/src/components/ui/Modal.tsx`), que renderiza via `createPortal` diretamente em `document.body`, com `role="dialog"`, `aria-modal="true"`, `aria-label={title}` (aqui `title="Solicitar saque"`). O backdrop é `fixed inset-0 z-modal-backdrop flex items-center justify-center bg-ink/40 p-4`; o conteúdo do modal usa `z-modal w-full max-w-lg rounded-lg bg-bg p-6 shadow-modal`.
- **Cabeçalho do modal**: título "Solicitar saque" (`text-lg font-semibold`) à esquerda, botão "×" (aria-label "Fechar") à direita.

#### Campos do formulário

Gerenciado com `react-hook-form` (`useForm<WithdrawFormInput>`) + `zodResolver(withdrawFormSchema)`. Valores padrão: `{ amount: 0, paymentMethod: 'pix', destination: '' }`.

1. **Valor (`amount`)**
   - `<input id="withdraw-amount" type="number" step="0.01" {...register('amount')} />`
   - Label: "Valor" (associado via `htmlFor`/`id`).
   - Validação (Zod, `schemas.ts`): `z.coerce.number().positive('Informe um valor maior que zero')` — coage string do input para número e exige valor positivo (> 0). Mensagem de erro exibida: "Informe um valor maior que zero" (renderizada em `<span className="text-xs text-accent">` logo abaixo do campo, condicionada a `formState.errors.amount`).

2. **Método de pagamento (`paymentMethod`)**
   - `<select id="withdraw-method" {...register('paymentMethod')}>` com duas opções:
     - `value="pix"` → rótulo "PIX"
     - `value="bank_transfer"` → rótulo "Transferência bancária"
   - Label: "Método".
   - Validação: `z.enum(['pix', 'bank_transfer'])` — restringe aos dois valores possíveis; como é um `<select>` com apenas essas duas opções, na prática não há erro de validação alcançável pela UI (não há mensagem de erro renderizada para este campo no JSX).

3. **Destino (`destination`)**
   - `<input id="withdraw-destination" {...register('destination')} />` — campo de texto livre (sem `type` explícito, portanto `type="text"` implícito).
   - Label: "Destino".
   - Validação: `z.string().min(3, 'Informe o destino').max(255, 'Destino muito longo')` — mínimo 3 caracteres, máximo 255. Mensagens de erro correspondentes exibidas condicionalmente (`formState.errors.destination`).
   - Não há placeholder explicando o formato esperado (ex.: chave PIX ou dados bancários) — o campo é um texto livre genérico sem máscara ou dica de formato.

#### Botões

- **Cancelar** (`<Button type="button" variant="ghost">Cancelar</Button>`): fecha o modal chamando `onClose` diretamente, sem submeter o formulário.
- **Confirmar** (`<Button type="submit" disabled={mutation.isPending}>Confirmar</Button>`): dispara `onSubmit` (via `handleSubmit`), que roda a validação Zod e, se válida, chama `mutation.mutate(values, { onSuccess: onClose })`. O botão fica desabilitado (`disabled`) enquanto `mutation.isPending` for `true`, mas **não exibe nenhum indicador visual de carregamento** (sem spinner, sem texto alternativo tipo "Enviando...") — apenas o estado `disabled` (que, via classe global do `Button`, aplica `disabled:cursor-not-allowed disabled:opacity-50`).
- Ambos os botões ficam alinhados à direita do formulário (`<div className="flex justify-end gap-2">`).

#### Mutation

- Hook: `useRequestWithdrawal()` (de `../queries`), que encapsula `useMutation` chamando `requestWithdrawal(input)` → `POST /withdrawals`.
- `onSuccess` da mutation (definido dentro do hook, em `queries.ts`): invalida as queries `walletKeys.wallet` (`['wallet']`) e `walletKeys.withdrawals` (`['wallet', 'withdrawals']`) via `queryClient.invalidateQueries`. **Não invalida** `walletKeys.transactions(...)`, portanto a lista de transações e o gráfico de receita na `WalletPage` **não são automaticamente atualizados** após um saque bem-sucedido (apenas o saldo, se a query de saldo refletir o saque, seria atualizado; a lista de movimentações exibiria a nova transação de saque somente após um refetch manual/nova navegação).
- No componente `WithdrawDialog`, o `onSuccess` local (passado para `mutation.mutate`) apenas chama `onClose` — fechando o modal.

#### Estados do WithdrawDialog

| Estado | Origem | Comportamento |
|---|---|---|
| Formulário limpo (inicial) | `defaultValues` do `useForm` | `amount: 0`, `paymentMethod: 'pix'`, `destination: ''` |
| Erro de validação (amount) | `formState.errors.amount` | Mensagem "Informe um valor maior que zero" abaixo do campo |
| Erro de validação (destination) | `formState.errors.destination` | Mensagem "Informe o destino" (se vazio/curto) ou "Destino muito longo" (se >255 caracteres) |
| Envio em andamento | `mutation.isPending` | Botão "Confirmar" desabilitado (sem spinner/texto de loading) |
| Sucesso | `mutation.mutate(..., { onSuccess: onClose })` | Modal fecha automaticamente; queries de saldo e saques são invalidadas/refeitas |
| Erro da mutation (falha de rede/servidor) | `mutation.isError` | **Não tratado na UI** — não há bloco condicional para `mutation.isError`/`mutation.error` em `WithdrawDialog.tsx`; se a requisição falhar, o modal permanece aberto (pois `onSuccess` não é chamado), o botão volta a ficar habilitado (`isPending` retorna a `false`), mas **nenhuma mensagem de erro é exibida ao usuário** informando a falha. |

#### Complexidade e dependências específicas do modal

- Depende de: `react-hook-form`, `@hookform/resolvers/zod`, `zod` (via `schemas.ts`), componentes genéricos `Modal` e `Button`.
- Complexidade baixa: formulário simples de 3 campos, sem lógica condicional entre campos (ex.: destino não muda de formato/validação conforme o método de pagamento escolhido — o mesmo campo de texto livre "Destino" serve tanto para PIX quanto para transferência bancária).
- Não há máscara de valor monetário (o campo `amount` é um `<input type="number">` puro, sem formatação de moeda em tempo real durante a digitação).
- Não há confirmação adicional (ex.: segunda etapa de "revisar e confirmar", ou senha/2FA) antes de submeter o saque — um único clique em "Confirmar" após preencher os campos válidos já dispara a mutation.

---

### Resumo de dependências externas da feature Wallet

- `@tanstack/react-query` — todas as queries e mutations (`useQuery`, `useMutation`, `useQueryClient`).
- `react-hook-form` + `@hookform/resolvers/zod` + `zod` — formulário e validação do `WithdrawDialog`.
- `react-dom` (`createPortal`) — usado indiretamente via componente genérico `Modal`.
- Utilitários internos: `formatCurrency`, `formatDate`, `cn` (de `frontend/src/lib/utils.ts`), `http` (cliente HTTP em `frontend/src/lib/http`).
- Componentes de UI compartilhados: `Card`, `Modal`, `Button`, `Skeleton`, `EmptyState` (todos em `frontend/src/components/ui/`).
- Nenhuma biblioteca de gráficos (Recharts, Chart.js, Victory, Nivo etc.) é usada — o gráfico de receita é implementado manualmente com `div`s e CSS.

### Pontos de integração observados (fora da feature, mas referenciando `/wallet`)

- `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx` — referencia `/wallet` (fora do escopo desta auditoria).
- `frontend/src/features/contracts/components/PaymentDialog.tsx` — referencia `/wallet` (fora do escopo desta auditoria).
- `frontend/src/lib/navConfig.ts` — três entradas de menu apontando para `/wallet` (uma por role: client, professional, admin).

---

### Capítulo: 10-notif-reviews-favorites

## Auditoria Frontend — Domínio: Notificações, Avaliações (Reviews) e Favoritos

Diretórios das features:
- `frontend/src/features/notifications/`
- `frontend/src/features/reviews/`
- `frontend/src/features/favorites/`

Arquivos auditados:
- `features/notifications/api.ts`
- `features/notifications/queries.ts`
- `features/notifications/schemas.ts`
- `features/notifications/components/NotificationBell.tsx`
- `features/notifications/pages/NotificationsPage.tsx`
- `features/reviews/api.ts`
- `features/reviews/queries.ts`
- `features/reviews/schemas.ts`
- `features/reviews/components/ReviewForm.tsx`
- `features/reviews/components/ReviewList.tsx`
- `features/favorites/api.ts`
- `features/favorites/queries.ts`
- `features/favorites/components/FavoriteButton.tsx`
- Arquivos relacionados inspecionados para contexto (consumidores e roteamento): `router/index.tsx`, `router/ProtectedRoute.tsx`, `components/layout/Topbar.tsx`, `features/contracts/pages/ContractDetailPage.tsx`, `features/professional/pages/PublicProfilePage.tsx`, `features/professional/components/ProfessionalCard.tsx`, `features/professional/components/ProfessionalProfileHeader.tsx`, `features/professional-dashboard/components/DashboardReviewsWidget.tsx`. Arquivos `*.test.ts`/`*.test.tsx` foram espiados apenas para confirmar comportamento, não documentados linha a linha.

---

### Visão geral de arquitetura das três features

Todas seguem o mesmo padrão de camadas do projeto:
- `api.ts`: funções assíncronas que chamam `http` (instância axios/wrapper em `lib/http.ts`) e retornam dados tipados/validados.
- `queries.ts`: hooks do TanStack Query (`useQuery`/`useMutation`) que envolvem as funções de `api.ts`, com `queryKey`s próprios e invalidação de cache no `onSuccess` das mutations.
- `schemas.ts` (presente em `notifications` e `reviews`, ausente em `favorites`): schemas Zod para validação/tipagem.
- `components/`: componentes de UI reutilizáveis (bell, form, list, button).
- `pages/` (apenas em `notifications`): página de rota própria.

Diferença estrutural notável: `notifications` usa Zod (`schemas.ts` com `notificationSchema`/`notificationsPageSchema`) tanto para tipar quanto para **validar em runtime** a resposta da API (`notificationsPageSchema.parse(data)` dentro de `fetchNotifications`). Já `reviews` também tem `schemas.ts`, mas ali o Zod é usado **apenas para o formulário** (`reviewFormSchema`, validação client-side de input do usuário via `zodResolver`), não para validar a resposta da API — o tipo `Review`/`Paginated<Review>` em `reviews/api.ts` é uma interface TypeScript pura, sem `.parse()` na resposta do `http.get`. `favorites` não tem `schemas.ts` nenhum — usa apenas interfaces TypeScript (`Favorite`, `Paginated<T>`) sem validação Zod.

---

### Tela: NotificationsPage

- **Nome do componente**: `NotificationsPage` (named export e também `export default`)
- **Arquivo**: `frontend/src/features/notifications/pages/NotificationsPage.tsx`
- **Rota**: `/notifications`, registrada em `router/index.tsx` linha 52, dentro do grupo `{ element: <ProtectedRoute />, children: [...] }` (sem restrição de `roles` — qualquer usuário autenticado, de qualquer papel, acessa).
- **Quem acessa**: Qualquer usuário logado (client, professional ou admin), já que a rota está sob `ProtectedRoute` sem prop `roles`. `ProtectedRoute` (`router/ProtectedRoute.tsx`) verifica `useAuthStore` — se `isBootstrapping` retorna `null` (nada renderizado enquanto a sessão carrega), se não há `user` redireciona para `/login` via `<Navigate replace>`, senão renderiza `<Outlet />` (a página em si).
- **Objetivo**: Listar as notificações do usuário logado e permitir marcá-las como lidas individualmente.

#### Fluxo funcional
1. Componente monta e chama `useNotifications()` (sem argumento de página explícito, logo `page = 1` por padrão do hook).
2. Enquanto `notifications.isLoading` for `true` OU `notifications.data` ainda não existir, renderiza um estado de carregamento simplificado (ver seção "Estados").
3. Assim que os dados chegam, extrai `items = notifications.data.items` e renderiza a lista completa (sem paginação de UI — ver observação abaixo).
4. Para cada notificação sem `readAt` (não lida), exibe um `Badge` "Não lida" e um botão "Marcar lida".
5. Ao clicar em "Marcar lida", dispara `markRead.mutate(notification.id)`, que chama `PATCH /notifications/:id/read`; o botão fica desabilitado (`disabled={markRead.isPending}`) durante a mutation.
6. `onSuccess` da mutation invalida a query key `['notifications']` inteira (todas as páginas), forçando refetch da lista — o item lido deixa de exibir o badge/botão automaticamente após o refetch.

Não há botão de "marcar todas como lidas", não há exclusão/dismissal de notificação, e não há navegação/deep-link a partir do clique na notificação em si (o clique útil é apenas no botão "Marcar lida"; o restante do item não é clicável).

#### Layout e hierarquia visual
Estrutura raiz: `<div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">` — conteúdo centralizado, largura máxima `max-w-2xl` (mais estreito que muitas outras páginas do app, formato "coluna única" típico de lista de notificações/feed).

- `<h1 className="text-2xl font-semibold text-ink">Notificações</h1>` — título fixo da página.
- Corpo condicional por estado (loading / vazio / lista), descrito abaixo.

**Card de lista** (quando há itens): `<Card className="flex flex-col gap-0 divide-y divide-surface p-0">` — um único `Card` (componente de design system, `components/ui/Card`) que funciona como container de lista, com `divide-y` criando linhas divisórias entre itens e `p-0`/`gap-0` para que cada item interno controle seu próprio padding.

**Item de notificação** (`<div key={notification.id} className="flex items-start justify-between gap-4 p-4">`):
- Lado esquerdo (`flex flex-col gap-1`):
  - Linha com `título` (`<p className="text-sm font-medium text-ink">{notification.title}</p>`) + `Badge tone="urgent"` com texto "Não lida" (renderizado apenas se `!notification.readAt`).
  - `body` opcional (`<p className="text-sm text-muted">{notification.body}</p>`), renderizado somente se `notification.body` for truthy (campo é `nullable` no schema).
  - Data de criação formatada via `new Date(notification.createdAt).toLocaleString('pt-BR')` (não usa o helper `formatDate` de `lib/utils`, diferente de `ReviewList`).
- Lado direito: botão "Marcar lida" (`Button variant="ghost" size="sm"`), renderizado apenas se a notificação não estiver lida.

#### Estados
- **Carregamento**: condição `notifications.isLoading || !notifications.data`. Renderiza apenas o `<h1>` fixo + um único `<Skeleton className="h-16 w-full" aria-label="Carregando notificações" />` — não simula múltiplos itens de lista (diferente de `ReviewList`, que renderiza 2 skeletons). Não há skeleton por item nem shimmer de lista completa.
- **Vazio**: quando `items.length === 0`, renderiza `<EmptyState title="Nenhuma notificação ainda" />` (sem `description` nem ação/CTA).
- **Erro**: **não há tratamento explícito de erro** — não há checagem de `notifications.isError` na página; se a query falhar, o componente permanece preso na condição de loading (`!notifications.data` continua `true` mesmo após erro, já que `isLoading` do React Query vira `false` mas `data` nunca chega), efetivamente mostrando o skeleton indefinidamente sem qualquer mensagem de erro ao usuário.
- **Sucesso com dados**: lista renderizada conforme layout acima.
- **Erro na mutation de marcar como lida**: não há tratamento de `onError` na chamada `markRead.mutate(...)` dentro da página — nenhum toast, nenhuma mensagem; o único efeito visível seria o botão voltar a ficar habilitado após a mutation falhar (via `isPending` retornando a `false`).

#### Dados, API e hooks
- Hook de leitura: `useNotifications(page = 1)` (de `features/notifications/queries.ts`) — `useQuery` com `queryKey: notificationKeys.list(page)` = `['notifications', page]`, `queryFn: () => fetchNotifications(page)`.
- Hook de mutation: `useMarkNotificationRead()` — `useMutation` com `mutationFn: (id) => markNotificationRead(id)`, invalida `queryKey: ['notifications']` (chave parcial, cobre todas as páginas) no `onSuccess`.
- API (`features/notifications/api.ts`):
  - `fetchNotifications(page = 1, limit = 20)`: `GET /notifications?page=&limit=`, resposta validada em runtime por `notificationsPageSchema.parse(data)`.
  - `markNotificationRead(id)`: `PATCH /notifications/:id/read`, sem corpo, sem retorno de dado (`Promise<void>`).
- Schemas (`features/notifications/schemas.ts`, Zod):
  - `notificationSchema`: `id` (uuid), `type` (string livre, sem enum), `title` (string), `body` (string nullable), `channel` (enum `'push' | 'in_app' | 'email'`), `readAt` (string datetime nullable — `null` = não lida), `createdAt` (string datetime).
  - `notificationsPageSchema`: `items` (array de `notificationSchema`), `page`, `limit`, `total` (números) — shape de paginação padrão do projeto, mas a `NotificationsPage` (componente) não usa `page`/`total`/`limit` para renderizar nenhum controle de paginação (não há botões "próxima página"/"anterior", nem indicador "mostrando X de Y").
  - Campo `channel` é lido no schema mas **não é exibido em nenhum lugar da UI** (nem na página nem no bell) — não há filtro nem ícone diferenciando notificações push/in-app/email.
  - Campo `type` também não é usado na renderização — todas as notificações são exibidas de forma idêntica independente do `type`.

#### Navegação
- Chegada: via clique no `NotificationBell` (que é um `<Link to="/notifications">`) no `Topbar`, ou navegação direta por URL.
- Saída: não há botão de "voltar" explícito na página; a navegação de saída depende da navegação global do app (sidebar/topbar).

#### Responsividade
Não há classes responsivas (`sm:`, `md:`, etc.) em `NotificationsPage` — o layout é fixo em `max-w-2xl` com padding `p-6`, comportando-se de forma fluida (a coluna encolhe naturalmente em telas estreitas até o limite do `max-w-2xl`), mas sem breakpoints dedicados. O item de notificação usa `flex items-start justify-between gap-4`, que em telas muito estreitas pode comprimir o botão "Marcar lida" contra o texto, já que não há `flex-wrap` nem stack vertical alternativo abaixo de um breakpoint.

#### Complexidade
Página simples: um único hook de leitura, uma única mutation, três estados de renderização (loading/vazio/lista), sem paginação de UI, sem filtros, sem busca, sem seleção em lote. É a tela mais simples dentre as documentadas neste domínio.

---

### Componente: NotificationBell

- **Arquivo**: `frontend/src/features/notifications/components/NotificationBell.tsx`
- **Onde aparece**: exclusivamente em `components/layout/Topbar.tsx` (linha 9, entre o título "Services Marketplace" e o `ProfileMenu`). O `Topbar` é renderizado globalmente pelo layout autenticado do app (fora do escopo desta auditoria, mas confirmado via grep que é o único ponto de uso).
- **Props**: nenhuma — `NotificationBell` não recebe props, é um componente autocontido (`function NotificationBell(): JSX.Element`).
- **Estado interno**: nenhum `useState` local; todo o estado vem do hook `useNotifications()` (React Query), que traz `data`/`isLoading`/etc., mas o componente só consome `notifications.data`.
- **Contador de não lidas**: calculado inline, sem memoização: `notifications.data?.items.filter((n) => !n.readAt).length ?? 0`. Como `useNotifications()` é chamado sem argumento de página, ele busca apenas a **primeira página** (20 itens, `limit` padrão) — ou seja, o contador de não lidas é um count sobre os itens carregados na página 1, não um total real do backend. Se houver mais de 20 notificações não lidas distribuídas além da primeira página, o badge subestimará o total.
- **Renderização**:
  - `<Link to="/notifications" className="relative inline-flex items-center text-ink" aria-label="Notificações">` — todo o sino é um link de navegação (não um botão com dropdown).
  - Ícone `BellIcon` (heroicons outline, `h-6 w-6`).
  - Badge de contagem: `<span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-bg">{unread}</span>`, renderizado somente se `unread > 0` (posicionado no canto superior direito do ícone via `absolute`/`relative`).
- **Dropdown/popover de notificações recentes**: **não existe**. O componente não abre popover, menu ou lista suspensa ao clicar/passar o mouse — o clique simplesmente navega via React Router para a rota `/notifications` (a página completa documentada acima). Não há preview de notificações recentes no próprio sino.
- **Real-time**: **não há WebSocket nem qualquer mecanismo de push em tempo real** neste componente. Também **não há polling automático** configurado explicitamente (`useNotifications` não define `refetchInterval` no `useQuery`). A atualização do contador depende inteiramente do comportamento padrão de cache/refetch do TanStack Query (refetch ao montar o componente, ao reconectar rede, ao focar a janela — conforme configuração global do `QueryClient` do projeto, não local a este hook) e de invalidações manuais disparadas por `useMarkNotificationRead` (que invalida `['notifications']` após marcar como lida). Não foi encontrado nenhum `EventSource`, `socket.io`, `WebSocket` ou `setInterval` relacionado a notificações neste domínio.
- **Eventos**: o único evento de interação é o clique no `Link`, que é navegação de rota padrão — não há `onClick` customizado, `preventDefault` ou lógica adicional.
- **Acessibilidade**: `aria-label="Notificações"` no link; o número dentro do badge não tem texto alternativo próprio (é lido como parte do link/label geral).

---

### Componentes de Reviews (sem página própria)

`features/reviews/` não possui pasta `pages/` — `ReviewForm` e `ReviewList` são componentes incorporáveis, consumidos por outras features. Confirmado via grep:
- `ReviewForm` é usado em `features/contracts/pages/ContractDetailPage.tsx` (linha 131).
- `ReviewList` é usado em `features/professional/pages/PublicProfilePage.tsx` (linha 58, seção "Avaliações" do perfil público) e em `features/professional-dashboard/components/DashboardReviewsWidget.tsx` (linha 16, dentro de um `Card` "Avaliações recentes" no dashboard do profissional).

#### Contexto de uso — ReviewForm dentro de ContractDetailPage
Em `ContractDetailPage.tsx`, uma variável `canReview` é calculada como `!reviewDone && contract.status === 'completed' && (isClient || isProfessional)` (linha 68) — ou seja, o formulário de avaliação só aparece quando o contrato está com status `completed` e o usuário logado é uma das partes do contrato (cliente ou profissional), e some assim que uma avaliação for enviada com sucesso na sessão atual (`reviewDone` é state local da página, setado via callback `onDone`). Quando `canReview` é verdadeiro, renderiza uma seção com `<h2>Avaliar</h2>` seguida do `<ReviewForm contractId={contract.id} onDone={() => setReviewDone(true)} />`.

#### Contexto de uso — ReviewList dentro de PublicProfilePage e DashboardReviewsWidget
Em `PublicProfilePage.tsx`, `ReviewList` é renderizado dentro de uma `<section>` com título "Avaliações" (última seção da página, após Sobre/Áreas de atendimento/Portfólio/Disponibilidade), recebendo `professionalId={profile.id}`.
Em `DashboardReviewsWidget.tsx` (usado no dashboard do profissional), `ReviewList` é envolvido por um `Card` com título "Avaliações recentes", recebendo `professionalId={profile.id}` do próprio profissional logado (via `useMyProfile()`) — mostra as avaliações que ele mesmo recebeu.

---

### Formulário: ReviewForm

- **Arquivo**: `frontend/src/features/reviews/components/ReviewForm.tsx`
- **Props**: `contractId: string` (obrigatório, identifica o contrato sendo avaliado) e `onDone: () => void` (callback chamado após envio bem-sucedido, sem argumentos).
- **Biblioteca de formulário**: `react-hook-form` com resolver Zod (`@hookform/resolvers/zod`) usando `reviewFormSchema`.

#### Campos
1. **Nota (rating)** — seletor de estrelas, não é um `<input type="number">` nativo nem um `<select>`. Renderizado como 5 botões (`Array.from({ length: 5 })`), cada um um `<button type="button">` contendo um `StarIcon` (heroicons, variante `solid`). O valor visual é controlado por comparação `value <= rating`: estrelas cujo índice+1 seja `<=` à nota atual ficam com classe `text-accent` (preenchidas/coloridas), as demais `text-muted` (acinzentadas). Ao clicar em uma estrela, chama `setValue('rating', value, { shouldValidate: true })` do react-hook-form — não usa `register` diretamente para este campo, e sim `setValue` imperativo, já que o campo não é um input HTML nativo. `watch('rating')` é usado para ler o valor atual e re-renderizar o preenchimento das estrelas.
   - Tipo de dado: `number` inteiro, 1 a 5.
   - Obrigatório: sim — validação via schema (`z.number().int().min(1, 'Selecione uma nota').max(5)`). Valor padrão do form é `0` (nenhuma estrela selecionada), que já é inválido pelo `min(1)`, forçando o usuário a escolher explicitamente.
   - Erro exibido: `{errors.rating && <span className="text-xs text-accent">{errors.rating.message}</span>}` (mensagem "Selecione uma nota").
2. **Comentário (comment)** — `<textarea id="review-comment" rows={3} className="rounded-sm border border-surface px-3 py-2 text-ink">`, registrado via `{...register('comment')}`, com `<label htmlFor="review-comment">` contendo texto auxiliar "Comentário" (`text-sm text-muted`).
   - Tipo de dado: `string`.
   - Obrigatório: sim, com limites — schema `z.string().min(3, 'Mínimo 3 caracteres').max(2000)`.
   - Erro exibido: `{errors.comment && <span className="text-xs text-accent">{errors.comment.message}</span>}`.

#### Validação (schemas.ts)
`reviewFormSchema` (Zod):
```
rating: z.number().int().min(1, 'Selecione uma nota').max(5)
comment: z.string().min(3, 'Mínimo 3 caracteres').max(2000)
```
Validação client-side executada via `zodResolver` no submit (e em `setValue` com `shouldValidate: true` para o campo `rating`, disparando validação imediata ao clicar numa estrela).

#### Botões
- Único botão de ação: `<Button type="submit" disabled={isPending}>Enviar avaliação</Button>` — desabilitado enquanto a mutation de criação está pendente. Não há botão de "cancelar" dentro do próprio formulário (o cancelamento, se existir, é responsabilidade do componente pai).

#### Mutation e fluxo de submit
- Hook usado: `useCreateReview()` (de `features/reviews/queries.ts`), que expõe `mutate`/`isPending`.
- `onSubmit = handleSubmit((values) => {...})`: antes de mutar, reseta `setDuplicateError(false)`; chama `mutate({ contractId, ...values }, { onSuccess, onError })`.
- `onSuccess`: chama `onDone()` (prop) — não mostra mensagem de sucesso própria; a UI de sucesso (ex: esconder o formulário) é responsabilidade do componente pai (visto em `ContractDetailPage`, que seta `reviewDone = true` e some com a seção "Avaliar").
- `onError`: verifica se o erro tem `response?.status === 409` (via cast local `ApiError`) — se sim, seta `duplicateError = true`, exibindo a mensagem fixa "Você já avaliou este contrato." (`<span className="text-xs text-accent">`) logo acima do botão de envio. Para qualquer outro código de erro, não há tratamento nem mensagem — o erro é silenciosamente ignorado na UI (apenas o estado de `isPending` volta a `false`, reabilitando o botão).
- Mutation em si: `createReview(input)` de `features/reviews/api.ts` → `POST /reviews` com corpo `{ contractId, rating, comment }`, retorna o objeto `Review` criado. `onSuccess` da definição do hook (`useCreateReview`) invalida `queryKey: ['reviews']` (todas as listas de reviews em cache), garantindo que qualquer `ReviewList` montada na tela seja atualizada após a criação.

#### Estados
- **Padrão/idle**: formulário vazio, nota em 0 (nenhuma estrela preenchida), botão habilitado.
- **Validação client-side falhou**: mensagens de erro por campo (`errors.rating`, `errors.comment`), botão permanece habilitado (não há bloqueio visual do botão em si além do disparo de validação no submit).
- **Enviando**: `isPending` verdadeiro, botão desabilitado (texto do botão não muda para algo como "Enviando...", permanece "Enviar avaliação").
- **Erro de duplicidade (409)**: mensagem fixa exibida.
- **Outro erro de API**: nenhum feedback visual.
- **Sucesso**: nenhum feedback visual próprio do form — delega ao `onDone` do pai.

---

### Lista: ReviewList

- **Arquivo**: `frontend/src/features/reviews/components/ReviewList.tsx`
- **Props**: `professionalId: string` (obrigatório) — identifica de qual profissional buscar as avaliações.
- **Origem dos dados**: hook `useProfessionalReviews(professionalId)` (de `features/reviews/queries.ts`), que por sua vez chama `fetchProfessionalReviews(professionalId, page)` → `GET /professionals/:professionalId/reviews?page=&limit=` (limit padrão 20, page padrão 1 — sem controle de paginação exposto pelo componente, chamado sempre com página fixa 1 já que `ReviewList` não passa `page` para o hook).
- **Habilitação condicional da query**: `useProfessionalReviews` usa `enabled: Boolean(professionalId)` no `useQuery` — a chamada só é disparada se `professionalId` estiver definido (relevante porque o hook aceita `professionalId: string | undefined` para acomodar telas onde o id pode não estar pronto ainda, embora `ReviewListProps` exija `professionalId: string` obrigatório no componente em si).
- **Item/card usado**: não usa o componente `Card` do design system — cada review é um `<li>` dentro de um `<ul className="flex flex-col gap-3">`, com estilo próprio inline: `<li className="rounded-lg bg-surface p-4">`. Conteúdo de cada item:
  - Linha de estrelas: 5 `StarIcon` (heroicons solid), preenchidas (`text-accent`) até o índice `< review.rating`, demais acinzentadas (`text-muted`) — mesma lógica visual do seletor do `ReviewForm`, mas aqui é somente leitura (sem `button`, sem interação).
  - Comentário: `{review.comment && <p className="text-sm text-ink">{review.comment}</p>}` — renderizado só se houver comentário (campo é `string | null`).
  - Data: `<p className="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>` — usa o helper `formatDate` de `lib/utils` (diferente de `NotificationsPage`, que formata a data inline com `toLocaleString`).
- **Paginação**: não há nenhum controle de paginação na UI (sem botões "carregar mais", sem números de página, sem scroll infinito) — apenas a primeira página (até 20 itens) é exibida, mesmo que o backend retorne um `total` maior (`data.total` não é lido em lugar nenhum do componente).
- **Estados**:
  - **Loading**: `isPending` verdadeiro → renderiza dois `<Skeleton className="h-20 w-full" aria-label="Carregando avaliações" />` empilhados em `flex flex-col gap-3` (simula dois cards de review fantasma).
  - **Vazio**: `!data || data.items.length === 0` → `<EmptyState title="Nenhuma avaliação ainda" description="Este profissional ainda não recebeu avaliações." />` (com descrição, diferente do `EmptyState` de `NotificationsPage` que não tem `description`).
  - **Erro**: **não há tratamento explícito de erro** — não há checagem de `isError`; em caso de falha de rede/API, o componente permanece com `isPending` eventualmente `false` e `data` `undefined`, caindo no mesmo branch do estado "vazio" (`!data`), exibindo "Nenhuma avaliação ainda" mesmo que a causa real seja um erro de requisição, não ausência de dados.
  - **Sucesso com itens**: lista de `<li>` conforme acima.

---

### Componentes de Favorites (sem página própria)

`features/favorites/` também não tem `pages/` — apenas `api.ts`, `queries.ts` e o componente `FavoriteButton`. Confirmado via grep que `FavoriteButton` é usado em:
- `features/professional/components/ProfessionalCard.tsx` (linha 32) — card de resultado de busca/listagem de profissionais, botão posicionado com `className="absolute right-3 top-3"` (canto superior direito do card).
- `features/professional/components/ProfessionalProfileHeader.tsx` (linha 45) — cabeçalho do perfil público de um profissional (`PublicProfilePage`).

Em ambos os casos, o valor da prop `isFavorite` vem do hook `useFavoriteIds()` (de `features/favorites/queries.ts`), consultado no componente pai (`ProfessionalCard`/`PublicProfilePage`/lista de busca) e repassado como prop booleana já calculada — `FavoriteButton` em si não decide sozinho se o item é favorito, apenas recebe e reage.

Não há página dedicada de "Meus favoritos" nesta auditoria — embora exista a função `fetchFavorites`/hook `useFavorites` (paginado, com `favoriteKeys.list(page, limit)`) em `queries.ts`, não foi encontrado nenhum componente de página que os consuma como lista navegável (não há rota `/favorites` em `router/index.tsx`); `useFavorites` parece não ter consumidor de UI dentro do código auditado — apenas `useFavoriteIds` (que reutiliza a mesma função `fetchFavorites`, mas com `limit=100` e derivando um `Set` de `professionalId`s) é efetivamente usado pelos componentes visuais.

---

### Componente: FavoriteButton

- **Arquivo**: `frontend/src/features/favorites/components/FavoriteButton.tsx`
- **Props**:
  - `professionalId: string` (obrigatório) — id do profissional a favoritar/desfavoritar.
  - `isFavorite: boolean` (obrigatório) — estado atual controlado externamente pelo componente pai (via `useFavoriteIds()`), o botão não busca esse dado sozinho.
  - `className?: string` (opcional) — permite ao pai posicionar o botão (ex: `absolute right-3 top-3` no `ProfessionalCard`).
- **Estado interno**: nenhum `useState` local. O único estado combinado é derivado das duas mutations: `const pending = addFavorite.isPending || removeFavorite.isPending`.
- **Evento de toggle**: `handleClick(event)` chama `event.preventDefault()` e `event.stopPropagation()` antes de qualquer lógica — necessário porque o botão costuma estar dentro de um `<Link>` clicável (o `ProfessionalCard` inteiro é um link para `/professionals/:id`), então o clique no coração não deve disparar a navegação do card. Em seguida:
  - Se `isFavorite` é `true` → `removeFavorite.mutate(professionalId)` (chama `DELETE /favorites/:professionalId`).
  - Se `isFavorite` é `false` → `addFavorite.mutate(professionalId)` (chama `POST /favorites` com corpo `{ professionalId }`).
- **Mutations**: `useAddFavorite()` e `useRemoveFavorite()` (de `features/favorites/queries.ts`), cada uma invalidando `queryKey: ['favorites']` (todas as listas/ids em cache) no `onSuccess` — não há atualização otimista (optimistic update); o ícone só reflete o novo estado depois que a mutation resolve e o componente pai refaz a leitura de `useFavoriteIds()` (que refetcha por causa da invalidação) e repassa a nova prop `isFavorite`. Durante o intervalo entre o clique e a invalidação, o ícone permanece no estado anterior, apenas com o botão desabilitado (`disabled={pending}`).
- **Feedback visual**:
  - Ícone preenchido (`HeartIcon` de `@heroicons/react/24/solid`, classe `h-5 w-5 text-accent`) quando `isFavorite` é `true`.
  - Ícone vazio/contorno (`HeartIcon` de `@heroicons/react/24/outline`, classe `h-5 w-5 text-muted`) quando `isFavorite` é `false`.
  - Botão com `rounded-full p-2 hover:bg-surface`, foco visível via `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`, e `disabled:opacity-50` durante mutations pendentes.
  - `aria-label` dinâmico: "Remover dos favoritos" ou "Adicionar aos favoritos" conforme `isFavorite`; `aria-pressed={isFavorite}` (semântica de toggle button).
- **Toast**: **não há nenhum toast/notificação de confirmação** disparado por este componente nem pelos hooks de mutation associados — nem em sucesso, nem em erro. O único feedback é a troca do ícone (após refetch) e o estado `disabled` temporário do botão.
- **Tratamento de erro**: nenhum — não há `onError` passado a `mutate()`, nem checagem de `isError` das mutations no componente. Uma falha na chamada (ex: rede, 500, 409 de favorito duplicado) não produz nenhuma mensagem visível; o botão apenas volta a ficar habilitado com o ícone no estado anterior (já que sem sucesso não há invalidação de cache nem mudança de prop).

---

### Observações transversais (apenas descritivas, sem juízo de melhoria)

- Nenhuma das três features usa toasts/notificações globais para confirmar ações (marcar notificação como lida, criar avaliação, favoritar/desfavoritar) — o feedback ao usuário é sempre implícito (mudança de estado visual/refetch) ou, em alguns poucos casos, uma mensagem de texto inline (caso 409 no `ReviewForm`).
- Nenhuma das três features trata explicitamente `isError`/estado de erro de query nas telas ou listas — em todos os casos (`NotificationsPage`, `ReviewList`, `FavoriteButton`), uma falha de API cai em um dos estados existentes (loading perpétuo, ou "vazio") sem uma mensagem de erro dedicada.
- Paginação de backend existe nos três domínios (parâmetros `page`/`limit` e campo `total` na resposta), mas nenhuma das UIs documentadas (`NotificationsPage`, `ReviewList`) expõe controles de paginação — todas mostram apenas a primeira página de resultados.
- Não há real-time (WebSocket/SSE) em nenhuma das três features — toda atualização de dados depende de refetch do TanStack Query disparado por invalidação de cache após mutations, ou pelo comportamento padrão de refetch do React Query (montagem/foco/reconexão).

---

### Capítulo: 11-settings-admin-uploads

## Auditoria Técnica — Settings, Admin e Uploads

> Documento descritivo do estado atual do código. Sem sugestões, sem crítica, sem redesenho.

---

### Visão geral das três áreas

| Área | Arquivos | Rota | Quem acessa |
|---|---|---|---|
| `features/settings/` | `api.ts`, `queries.ts`, `schemas.ts`, `components/ConsentsPanel.tsx`, `components/DeleteAccountPanel.tsx`, `components/PreferencesForm.tsx`, `pages/SettingsPage.tsx` | `/settings` | Qualquer usuário autenticado (rota protegida sem `roles`) |
| `features/admin/` | `api.ts`, `queries.ts`, `schemas.ts`, `components/DisputesTable.tsx`, `components/ReportsTable.tsx`, `pages/AdminDashboardPage.tsx` | `/admin` | Apenas usuários com `role === 'admin'` |
| `features/uploads/` | `api.ts` (sem página/componente próprio) | — (usado por outras features) | Consumido por `components/ui/ImageUpload.tsx`, que por sua vez é usado em `PortfolioManager.tsx` (professional) e `DemandForm.tsx` (demands) |

Definição de rotas em `router/index.tsx`:
```
{ path: '/settings', element: <SettingsPage /> }   // dentro de <ProtectedRoute /> sem roles
...
{ element: <ProtectedRoute roles={['admin']} />, children: [{ path: '/admin', element: <AdminDashboardPage /> }] }
```

O controle de acesso é feito por `router/ProtectedRoute.tsx`:
- Se `isBootstrapping` (estado de carregamento inicial do auth store) é `true`, retorna `null` (não renderiza nada).
- Se não há `user` no `useAuthStore`, redireciona para `/login` via `<Navigate replace />`.
- Se a prop `roles` foi passada e `user.role` não está incluído nela, redireciona para `/forbidden`.
- Caso contrário, renderiza o `<Outlet />` (rota filha).

Para `/settings` não há restrição de `roles` — qualquer papel (`client`, `professional`, `admin`) que esteja autenticado acessa. Para `/admin`, apenas `role === 'admin'`; qualquer outro papel autenticado que tente acessar `/admin` é redirecionado para `/forbidden`.

Todas as chamadas HTTP usam a instância `http` de `lib/http.ts`, um `AxiosInstance` com `baseURL: '/api'`.

---

## PARTE 1 — SettingsPage (`/settings`)

### SettingsPage

**Arquivo:** `features/settings/pages/SettingsPage.tsx`
**Rota:** `/settings`
**Quem acessa:** Qualquer usuário logado (client, professional ou admin) — rota protegida genérica, sem `roles` especificado.
**Objetivo:** Tela única de configurações de conta do usuário, agregando três painéis independentes: preferências, consentimentos (LGPD) e exclusão de conta.

#### Estrutura / Layout

Componente funcional simples, sem estado próprio, que apenas compõe três subcomponentes dentro de um contêiner:

```tsx
<div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
  <h1 className="text-2xl font-semibold text-ink">Configurações</h1>
  <PreferencesForm />
  <ConsentsPanel />
  <DeleteAccountPanel />
</div>
```

- Contêiner central com `max-w-lg` (largura máxima pequena/média, ~32rem), centralizado horizontalmente (`mx-auto`), com padding `p-6` e espaçamento vertical `gap-6` entre as seções.
- Layout em coluna única (`flex-col`) — não há grid, não há tabs, não há navegação lateral. As três seções aparecem empilhadas verticalmente, cada uma dentro de sua própria seção/`Card`.
- Título de página `<h1>` fixo: "Configurações".
- Não há nenhum estado local na página em si (`useState`, `useEffect`); toda a lógica de dados vive dentro de cada painel filho.
- Não há navegação interna (sem tabs, sem breadcrumbs, sem botões de navegação) — é uma página estática que soma três blocos.

#### Responsividade

Como a página usa apenas `max-w-lg` + `flex-col` + `p-6`, o layout é inerentemente responsivo por ser de coluna única e largura limitada — não há breakpoints (`sm:`, `md:` etc.) explícitos na própria página. A responsividade real depende do comportamento interno de cada painel (nenhum dos três usa breakpoints Tailwind explícitos também).

#### Complexidade

Baixa na página em si (component puramente estrutural/composição). A complexidade real está distribuída nos três painéis filhos, documentados abaixo.

#### Componentes usados
- `PreferencesForm` (local, `../components/PreferencesForm`)
- `ConsentsPanel` (local, `../components/ConsentsPanel`)
- `DeleteAccountPanel` (local, `../components/DeleteAccountPanel`)

#### Hooks / dados
Nenhum hook é chamado diretamente em `SettingsPage`. Os hooks de dados (`usePreferences`, `useConsents`, `useDeletionStatus` etc.) são chamados dentro de cada painel filho — ver seções específicas abaixo.

#### API / queries / mutations (camada `features/settings/`)

**Arquivo `api.ts`** define o objeto `settingsApi` com os seguintes métodos, todos usando `http` (axios, baseURL `/api`):

| Método | Verbo HTTP | Endpoint | Payload | Retorno |
|---|---|---|---|---|
| `getPreferences()` | GET | `/account/preferences` | — | `Preferences` |
| `updatePreferences(payload)` | PATCH | `/account/preferences` | `Partial<Preferences>` | `Preferences` |
| `listConsents()` | GET | `/account/consents` | — | `Consent[]` |
| `recordConsent(payload)` | POST | `/account/consents` | `{ type: ConsentType; granted: boolean; version: string }` | `Consent` |
| `requestDeletion()` | POST | `/account/deletion` | — | `DeletionRequest` |
| `cancelDeletion()` | DELETE | `/account/deletion` | — | `void` |
| `getDeletionStatus()` | GET | `/account/deletion` | — | `DeletionRequest \| null` |

**Tipos definidos em `api.ts`:**
```ts
interface Preferences {
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

type ConsentType = 'terms' | 'privacy' | 'marketing' | 'data_processing';

interface Consent {
  id: string;
  type: ConsentType;
  granted: boolean;
  version: string;
  grantedAt: string;
  createdAt: string;
}

type DeletionStatus = 'pending' | 'cancelled' | 'completed';

interface DeletionRequest {
  id: string;
  status: DeletionStatus;
  requestedAt: string;
  scheduledFor: string;
}
```

Nenhum dos tipos acima é validado por Zod em `api.ts` — a validação com Zod (`schemas.ts`) existe apenas para o formulário de preferências (formulário do lado do cliente), não para a resposta da API.

**Arquivo `queries.ts`** — hooks React Query construídos sobre `settingsApi`:

```ts
const keys = {
  preferences: ['settings', 'preferences'],
  consents: ['settings', 'consents'],
  deletion: ['settings', 'deletion'],
};
```

- `usePreferences()` — `useQuery` com `queryKey: keys.preferences`, `queryFn: settingsApi.getPreferences`.
- `useUpdatePreferences()` — `useMutation` que chama `settingsApi.updatePreferences`; no `onSuccess`, escreve diretamente o resultado no cache via `client.setQueryData(keys.preferences, data)` (não invalida, substitui o cache diretamente).
- `useConsents()` — `useQuery` com `queryKey: keys.consents`, `queryFn: settingsApi.listConsents`.
- `useRecordConsent()` — `useMutation` que chama `settingsApi.recordConsent`; no `onSuccess`, invalida (`invalidateQueries`) a query de consentimentos, forçando um novo fetch.
- `useDeletionStatus()` — `useQuery` com `queryKey: keys.deletion`, `queryFn: settingsApi.getDeletionStatus`.
- `useRequestDeletion()` — `useMutation` que chama `settingsApi.requestDeletion`; no `onSuccess`, escreve o resultado direto no cache de `keys.deletion`.
- `useCancelDeletion()` — `useMutation` que chama `settingsApi.cancelDeletion`; no `onSuccess`, seta o cache de `keys.deletion` para `null` diretamente.

Nenhum desses hooks expõe callbacks de erro (`onError`) — falhas de mutação não são tratadas centralmente aqui (tratamento de erro, se existir, ficaria a cargo do componente consumidor, mas nenhum dos três painéis trata erro de mutação explicitamente, exceto renderização padrão do estado `isPending`).

---

### PreferencesForm

**Arquivo:** `features/settings/components/PreferencesForm.tsx`
**Tipo:** Formulário controlado por `react-hook-form` + resolver Zod.

#### Campos

| Campo | Tipo de input | Obrigatório | Validação (Zod, `schemas.ts`) |
|---|---|---|---|
| `language` | `<input type="text">` | Sim (string não vazia) | `z.string().min(1, 'Informe o idioma')` |
| `timezone` | `<input type="text">` | Sim (string não vazia) | `z.string().min(1, 'Informe o fuso horario')` |
| `emailNotifications` | `<input type="checkbox">` | Booleano (sempre presente) | `z.boolean()` |
| `pushNotifications` | `<input type="checkbox">` | Booleano (sempre presente) | `z.boolean()` |
| `smsNotifications` | `<input type="checkbox">` | Booleano (sempre presente) | `z.boolean()` |

Schema completo (`schemas.ts`):
```ts
export const preferencesFormSchema = z.object({
  language: z.string().min(1, 'Informe o idioma'),
  timezone: z.string().min(1, 'Informe o fuso horario'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});
```

Nenhum campo de mensagem de validação é renderizado no JSX do formulário — apesar do schema definir mensagens customizadas (`'Informe o idioma'`, `'Informe o fuso horario'`), não há bloco de exibição de erros (`formState.errors`) no componente. O `register` é chamado mas `formState` não é desestruturado nem usado.

#### Fluxo

1. `usePreferences()` busca os dados atuais via GET `/account/preferences`.
2. Um `useEffect` observa `data` (resultado da query) e, quando disponível, chama `reset(data)` do react-hook-form para popular o formulário com os valores vindos do servidor (substituindo os valores default do formulário).
3. Ao submeter (`handleSubmit(onSubmit)`), os valores validados são passados para `update.mutate(values)`, disparando o PATCH `/account/preferences`.
4. Não há redirecionamento nem fechamento de modal após sucesso — o formulário permanece na tela; o cache React Query é atualizado via `setQueryData` (ver `queries.ts`), então os campos continuam refletindo os valores mais recentes por causa do próprio `useEffect` de reset (embora o reset só dispare quando o objeto `data` mudar).

#### Estados
- `update.isPending` — desabilita o botão "Salvar" durante o envio (`<Button type="submit" disabled={update.isPending}>`).
- Não há estado de loading explícito para o carregamento inicial das preferências (`usePreferences()` não expõe `isLoading` sendo tratado no JSX) — antes dos dados chegarem, o formulário simplesmente renderiza vazio (valores default do `useForm`, que são `undefined`/vazio, já que nenhum `defaultValues` foi passado ao `useForm`).
- Não há tratamento de erro visível (nem de carregamento nem de mutação).

#### Botões
- Um único botão: `<Button type="submit">Salvar</Button>`, variante padrão (nenhuma prop `variant` explícita, portanto usa o default do componente `Button`).

#### Mutation
`useUpdatePreferences()` → PATCH `/account/preferences` com o payload completo do formulário (`Partial<Preferences>` mas na prática o formulário sempre envia os 5 campos).

---

### ConsentsPanel

**Arquivo:** `features/settings/components/ConsentsPanel.tsx`
**Tipo:** Painel de consentimentos LGPD, renderizado dentro de um `Card`.

#### Dados e lógica

- `useConsents()` busca a lista de consentimentos via GET `/account/consents`, retornando um array de `Consent` (pode conter múltiplos registros históricos por tipo, já que cada `recordConsent` gera um novo registro, não substitui o anterior).
- Uma constante fixa `CONSENT_VERSION = '2026-07-01'` é usada como versão do consentimento enviada em toda gravação.
- Um `Map<ConsentType, boolean>` (`latestByType`) é construído a partir do array `data`, mantendo apenas o **primeiro** registro encontrado para cada tipo (assume-se que a API retorna os registros em ordem do mais recente para o mais antigo, já que o código faz `if (!latestByType.has(consent.type))`).

#### Campos / tipos de consentimento

Quatro tipos fixos, com rótulos em português:
```ts
const CONSENT_LABELS: Record<ConsentType, string> = {
  terms: 'Termos de uso',
  privacy: 'Política de privacidade',
  marketing: 'Comunicações de marketing',
  data_processing: 'Tratamento de dados pessoais',
};
```

Cada tipo é renderizado como um `<label>` com um `<input type="checkbox">`:
- `checked={latestByType.get(type) ?? false}` — reflete o estado mais recente conhecido (ou `false` se não houver registro).
- `onChange` dispara imediatamente `record.mutate({ type, granted: event.target.checked, version: CONSENT_VERSION })` — **não há confirmação, não há botão de "salvar" separado**; cada clique no checkbox já envia a mutation instantaneamente (POST `/account/consents`).

#### Histórico

Abaixo dos checkboxes, uma lista (`<ul>`) mostra o histórico completo (`data?.map`), sem filtro de tipo mais recente — isto é, mostra **todos** os registros retornados pela API, cada um com o rótulo do tipo, se foi "concedido" ou "revogado", e a data/hora formatada (`toLocaleString()`) de `createdAt`.

#### Estados
- Nenhum estado de loading explícito é tratado (nem para `useConsents` nem para `useRecordConsent`) — os checkboxes não são desabilitados durante o `record.isPending`.
- Nenhum tratamento de erro visível.

#### Mutation
`useRecordConsent()` → POST `/account/consents`; no sucesso, invalida a query `['settings', 'consents']`, disparando novo GET.

#### Botões
Não há botão de submit — a interação é toda via checkbox com efeito imediato (mutation on-change).

---

### DeleteAccountPanel

**Arquivo:** `features/settings/components/DeleteAccountPanel.tsx`
**Tipo:** Painel de exclusão de conta, dentro de um `Card`, com fluxo de confirmação via `Modal`.

#### Estados locais
- `confirming: boolean` (via `useState`) — controla a exibição do modal de confirmação.
- `data` (via `useDeletionStatus()`) — status atual de uma solicitação de exclusão pendente (ou `null`/`undefined` se não houver).

#### Fluxo condicional (dois estados de UI)

**Caso 1 — já existe uma solicitação de exclusão (`data` truthy):**
- Mostra texto: "Exclusão agendada para {data.scheduledFor formatada como data local}. Você pode cancelar durante a carência."
- Mostra botão "Cancelar exclusão" (`variant="ghost"`), que chama `cancel.mutate()` diretamente (sem modal de confirmação para o cancelamento) e fica desabilitado durante `cancel.isPending`.

**Caso 2 — nenhuma solicitação pendente:**
- Mostra apenas o botão "Solicitar exclusão" (`variant="accent"`), que ao ser clicado apenas seta `confirming = true` (abre o modal, ainda não dispara a mutation).

#### Modal de confirmação (`confirming === true`)

Renderizado apenas quando `confirming` é `true`, usando o componente `Modal` (`open`, `onClose`, `title="Confirmar exclusão de conta"`).

Conteúdo do modal:
- Texto de aviso: "A conta será excluída após o período de carência. Você poderá cancelar antes desse prazo, mas essa é uma ação séria e irreversível após a carência terminar."
- Dois botões:
  - "Cancelar" (`variant="ghost"`) — apenas fecha o modal (`setConfirming(false)`), sem chamada de API.
  - "Confirmar exclusão" (`variant="accent"`, `disabled={request.isPending}`) — ao clicar, dispara `request.mutate()` (POST `/account/deletion`) e **imediatamente** fecha o modal (`setConfirming(false)`), sem aguardar a resposta da mutation.

**Importante sobre o mecanismo de confirmação:** não há campo de digitação de senha nem de texto de confirmação (como digitar "EXCLUIR" ou a senha da conta) — a confirmação é puramente por modal com texto de aviso e um segundo clique em botão. Não há verificação adicional de identidade nesse fluxo do frontend.

O `Modal` (componente compartilhado `components/ui/Modal.tsx`) fecha também via tecla Escape (`onClose` acionado por `keydown === 'Escape'`) e via botão "Fechar" (aria-label) no canto superior.

#### Mutations
- `useRequestDeletion()` → POST `/account/deletion`; no sucesso, escreve o resultado (`DeletionRequest`) diretamente no cache de `['settings', 'deletion']`, fazendo o painel re-renderizar automaticamente para o "Caso 1" acima (sem necessidade de refetch).
- `useCancelDeletion()` → DELETE `/account/deletion`; no sucesso, seta o cache de `['settings', 'deletion']` para `null`, revertendo o painel para o "Caso 2".

#### Componentes usados
`Card`, `Button` (variantes `ghost` e `accent`), `Modal` — todos de `components/ui/`.

---

## PARTE 2 — AdminDashboardPage (`/admin`)

### AdminDashboardPage

**Arquivo:** `features/admin/pages/AdminDashboardPage.tsx`
**Rota:** `/admin`, protegida com `roles={['admin']}` (única rota do app com essa restrição de papel exclusiva para admin).
**Objetivo:** Painel único de moderação, agregando duas tabelas de trabalho para administradores: denúncias (reports) e disputas (disputes).

#### Layout

```tsx
<div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
  <h1 className="text-2xl font-semibold text-ink">Moderação</h1>
  <Card>
    <h2>Denúncias</h2>
    <ReportsTable />
  </Card>
  <Card>
    <h2>Disputas</h2>
    <DisputesTable />
  </Card>
</div>
```

- Contêiner central com `max-w-4xl` (mais largo que o de Settings, adequado para tabelas), `flex-col`, `gap-8`, `p-6`.
- Não há tabs — as duas tabelas (Denúncias e Disputas) aparecem simultaneamente, empilhadas verticalmente, cada uma dentro de seu próprio `Card` com título de seção (`<h2>`).
- Título de página `<h1>` fixo: "Moderação".
- Nenhum estado local na página; toda a lógica reside nos dois componentes de tabela filhos.
- Nenhuma navegação interna, nenhum roteamento aninhado, nenhuma paginação exposta na página (embora a API suporte paginação — ver abaixo).

#### Responsividade

Sem breakpoints Tailwind explícitos na página. As tabelas internas usam `<table className="w-full ...">`, o que significa que em telas estreitas as tabelas não têm tratamento de overflow horizontal explícito (sem `overflow-x-auto` visível no código lido) — a tabela ocupa 100% da largura do contêiner pai (`Card`, que por sua vez está dentro do `max-w-4xl`).

#### Complexidade
Página em si é puramente estrutural (baixa complexidade); a lógica de negócio e interação está nas duas tabelas.

#### Componentes usados
- `ReportsTable` (local)
- `DisputesTable` (local)
- `Card` (compartilhado, `components/ui/Card`)

#### API / queries / mutations (camada `features/admin/`)

**Arquivo `api.ts`:**

| Função | Verbo | Endpoint | Parâmetros | Validação de resposta |
|---|---|---|---|---|
| `fetchReports(page = 1, limit = 20)` | GET | `/admin/reports` | query params `page`, `limit` | `reportsPageSchema.parse(data)` (Zod) |
| `resolveReport(id, resolution, note?)` | PATCH | `/admin/reports/${id}` | body `{ resolution, note }` | — |
| `fetchDisputes(page = 1, limit = 20)` | GET | `/admin/disputes` | query params `page`, `limit` | `disputesPageSchema.parse(data)` (Zod) |
| `resolveDispute(id, outcome, note)` | PATCH | `/admin/disputes/${id}` | body `{ outcome, note }` (note obrigatória por tipo) | — |

Diferente da camada de `settings`, aqui as respostas de listagem **são** validadas em runtime com Zod (`reportsPageSchema.parse` / `disputesPageSchema.parse`), lançando exceção se a resposta não corresponder ao schema.

**Schemas (`schemas.ts`):**
```ts
reportStatusSchema = z.enum(['pending', 'reviewed', 'dismissed', 'actioned']);
reportResolutionSchema = z.enum(['reviewed', 'dismissed', 'actioned']);

disputeStatusSchema = z.enum(['open', 'under_review', 'resolved', 'rejected']);
disputeOutcomeSchema = z.enum(['refund_client', 'release_professional', 'split']);

adminReportSchema = z.object({ id: z.string().uuid(), status: reportStatusSchema });
adminDisputeSchema = z.object({
  id: z.string().uuid(),
  status: disputeStatusSchema,
  outcome: disputeOutcomeSchema.nullable(),
});

reportsPageSchema = z.object({ items: z.array(adminReportSchema), page: z.number(), limit: z.number(), total: z.number() });
disputesPageSchema = z.object({ items: z.array(adminDisputeSchema), page: z.number(), limit: z.number(), total: z.number() });
```

Nota: os objetos `AdminReport`/`AdminDispute` validados possuem **apenas** `id` e `status` (e `outcome` no caso de disputa) — nenhum outro campo (ex.: descrição da denúncia, nome do denunciante, valor do contrato em disputa, datas) é validado ou tipado nesta camada. As tabelas exibem literalmente apenas o `id` como texto na coluna "Disputa"/"Denúncia".

**Arquivo `queries.ts`:**
```ts
adminKeys = {
  reports: (page) => ['admin', 'reports', page],
  disputes: (page) => ['admin', 'disputes', page],
};
```
- `useReports(page = 1)` — `useQuery` com `queryFn: () => fetchReports(page)`.
- `useResolveReport()` — `useMutation` chamando `resolveReport(id, resolution, note)`; no sucesso, invalida todas as queries com prefixo `['admin', 'reports']` (qualquer página).
- `useDisputes(page = 1)` — `useQuery` com `queryFn: () => fetchDisputes(page)`.
- `useResolveDispute()` — `useMutation` chamando `resolveDispute(id, outcome, note)`; no sucesso, invalida `['admin', 'disputes']`.

Ambos os componentes de tabela (`ReportsTable`, `DisputesTable`) chamam os hooks **sem** passar `page`, então sempre usam o default `page = 1` — não há nenhum controle de UI (botões "próxima página", seletor de página, input de página) implementado nos componentes lidos, apesar da API e dos hooks suportarem paginação por parâmetro.

---

### ReportsTable

**Arquivo:** `features/admin/components/ReportsTable.tsx`

#### Colunas exibidas
| Coluna | Conteúdo |
|---|---|
| Denúncia | `report.id` (UUID cru, como texto) |
| Status | `Badge` com rótulo traduzido e tom (`urgent` se pendente, `neutral` caso contrário) |
| Ação | Botões de ação por linha |

#### Rótulos de status
```ts
STATUS_LABELS = {
  pending: 'Pendente',
  reviewed: 'Revisada',
  dismissed: 'Descartada',
  actioned: 'Ação aplicada',
};
PENDING_STATUSES = ['pending'];
```
O `Badge` usa tom `urgent` apenas quando `status === 'pending'`; todos os demais status usam tom `neutral`.

#### Origem dos dados
`useReports()` (sem argumento de página → página 1 fixa) → GET `/admin/reports?page=1&limit=20`.

#### Paginação
Não há controle de paginação na UI — apesar do backend/API suportar `page`/`limit`/`total` (presentes no schema `reportsPageSchema`), o componente não expõe nenhum botão ou input para navegar entre páginas. Sempre exibe a primeira página (20 itens, conforme default).

#### Filtro / Ordenação
Nenhum filtro (por status, por data, por busca textual) nem controle de ordenação de colunas está implementado no componente. A ordem de exibição é a ordem em que os itens vêm da API.

#### Ações por linha
Duas ações disponíveis para cada denúncia, ambas abrindo o mesmo modal de confirmação com nota:
1. **"Aplicar ação"** (`variant="accent"`) → abre modal com `resolution: 'actioned'`.
2. **"Descartar"** (`variant="ghost"`) → abre modal com `resolution: 'dismissed'`.

Ambos os botões ficam desabilitados quando `resolve.isPending` (mutação em andamento, para qualquer linha — não há tratamento por linha individual do estado de pending).

#### Modal de resolução
- Estado local: `pendingAction: { id, resolution, label } | null` e `note: string`.
- Ao clicar em um botão de ação, `openAction(id, resolution, label)` limpa a nota (`setNote('')`) e seta `pendingAction`.
- O `Modal` (`open`, `onClose=closeAction`, `title=pendingAction.label`) contém:
  - Um `<textarea>` rotulado "Nota (opcional)" — **a nota aqui é opcional**, diferente da tabela de disputas.
  - Botão "Cancelar" (`variant="ghost"`) → `closeAction()`, apenas fecha, sem chamada de API.
  - Botão "Confirmar" (`variant="accent"`, `disabled={resolve.isPending}` — **não valida se a nota está vazia**, pois a nota é opcional) → `confirmAction()`, que chama `resolve.mutate({ id, resolution, note: note || undefined })` e fecha o modal imediatamente (sem esperar resposta).

#### Estados de tela
- **Loading:** `if (reports.isLoading || !reports.data) return <p className="text-sm text-muted">Carregando denúncias...</p>;` — texto simples, sem skeleton.
- **Vazio:** `if (reports.data.items.length === 0) return <p className="text-sm text-muted">Nenhuma denúncia pendente.</p>;`
- **Erro:** Não há tratamento explícito de estado de erro (`reports.isError`/`reports.error`) — se a query falhar, o componente permanece preso no estado de "Carregando..." indefinidamente (pois a condição de loading é `isLoading || !data`, e em erro `data` continua `undefined`).

---

### DisputesTable

**Arquivo:** `features/admin/components/DisputesTable.tsx`

Estrutura quase idêntica à `ReportsTable`, com diferenças pontuais.

#### Colunas exibidas
| Coluna | Conteúdo |
|---|---|
| Disputa | `dispute.id` (UUID cru, como texto) |
| Status | `Badge` com rótulo traduzido e tom (`urgent` se `open` ou `under_review`, `neutral` caso contrário) |
| Ação | Botões de ação por linha |

#### Rótulos de status
```ts
STATUS_LABELS = {
  open: 'Aberta',
  under_review: 'Em revisão',
  resolved: 'Resolvida',
  rejected: 'Rejeitada',
};
PENDING_STATUSES = ['open', 'under_review'];
```

#### Origem dos dados
`useDisputes()` (página fixa 1) → GET `/admin/disputes?page=1&limit=20`.

#### Paginação / Filtro / Ordenação
Mesma ausência de controles de paginação, filtro e ordenação descrita para `ReportsTable`.

#### Ações por linha
Três ações disponíveis por disputa (mais uma que a tabela de denúncias):
1. **"Reembolsar cliente"** (`variant="accent"`) → `outcome: 'refund_client'`.
2. **"Liberar profissional"** (`variant="accent"`) → `outcome: 'release_professional'`.
3. **"Dividir"** (`variant="ghost"`) → `outcome: 'split'`.

Todos desabilitados durante `resolve.isPending`.

#### Modal de resolução — diferença importante
Igual ao de `ReportsTable`, mas aqui a nota é **obrigatória**:
- Rótulo do textarea: apenas "Nota" (sem "(opcional)").
- Botão "Confirmar" tem `disabled={resolve.isPending || !note.trim()}` — ou seja, o botão de confirmação fica desabilitado enquanto o campo de nota estiver vazio ou só com espaços.
- A função `confirmAction()` também tem uma guarda extra: `if (!pendingAction || !note.trim()) return;` — dupla proteção contra envio de nota vazia.

#### Estados de tela
- **Loading:** `if (disputes.isLoading || !disputes.data) return <p>Carregando disputas...</p>;`
- **Vazio:** `if (disputes.data.items.length === 0) return <p>Nenhuma disputa em aberto.</p>;`
- **Erro:** Mesmo comportamento de `ReportsTable` — nenhum tratamento explícito de erro; em caso de falha na query, a UI fica presa no texto de "Carregando...".

---

## PARTE 3 — features/uploads/api.ts

### API de upload

**Arquivo:** `features/uploads/api.ts`
**Endpoint:** POST `/uploads/images` (relativo à `baseURL: '/api'` do axios, portanto efetivamente `/api/uploads/images`)

```ts
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<UploadResult>('/uploads/images', formData);
  return data;
}
```

- Envio via `multipart/form-data` (`FormData` nativo do browser), campo do formulário chamado `file`.
- Não há validação de tipo de arquivo, tamanho máximo ou dimensões feita no lado do `api.ts` em si — a única função exportada apenas envia o arquivo recebido, sem checagens.
- Não há schema Zod validando a resposta `UploadResult` (diferente de `admin/api.ts`) — a tipagem é apenas via `interface` TypeScript, sem verificação em runtime.
- Não há parâmetro de progresso de upload (`onUploadProgress` do axios não é utilizado).
- Não existe nenhum componente próprio dentro de `features/uploads/` — o diretório contém apenas o arquivo de API (e seu teste `api.test.ts`).

#### Consumo — `components/ui/ImageUpload.tsx`

Este é o único ponto de consumo direto de `uploadImage` encontrado no código (componente compartilhado de UI, fora de `features/`):

- Aceita apenas os tipos MIME especificados no atributo `accept` do `<input type="file">`: `ACCEPTED_MIME = 'image/jpeg,image/png,image/webp'` — ou seja, JPEG, PNG e WebP. Essa restrição é apenas uma dica de UI do navegador (atributo `accept`), **não** uma validação client-side reforçada em JavaScript antes do envio — o navegador pode ainda permitir selecionar outros tipos dependendo do SO/navegador, e não há checagem adicional de `file.type` no código antes do `uploadImage(file)`.
- Não há limite de tamanho de arquivo verificado no frontend (nenhuma checagem de `file.size`).
- Fluxo:
  1. Usuário seleciona arquivo via input (`handleChange`).
  2. Um preview local é gerado com `URL.createObjectURL(file)` e exibido imediatamente (antes da resposta do servidor).
  3. Estado `uploading = true` é setado, exibindo um `Skeleton` (24x24, `aria-label="Enviando imagem"`) no lugar do preview enquanto o upload está em andamento.
  4. Após sucesso, chama a prop `onUploaded(result)` (callback fornecido pelo componente pai) com o `UploadResult` retornado.
  5. Em caso de falha (`catch`), dispara um toast de erro ("Falha ao enviar imagem", tipo `error`) via `useToast()` e limpa o preview (`setPreview(null)`).
  6. No `finally`, seta `uploading = false` e limpa o valor do `<input>` (`inputRef.current.value = ''`), permitindo reenviar o mesmo arquivo novamente se necessário.
  7. Ao desmontar o componente, um `useEffect` de cleanup revoga a URL de objeto local (`URL.revokeObjectURL`) para evitar vazamento de memória.

#### Outros consumidores (uso indireto via `ImageUpload`)
- `features/professional/components/PortfolioManager.tsx` — usa `<ImageUpload onUploaded={(result) => addImage.mutate({ imageUrl: result.url, position: item.images.length })} />` para adicionar imagens ao portfólio profissional.
- `features/demands/components/DemandForm.tsx` — também importa e usa `ImageUpload` (não detalhado em profundidade aqui, pois está fora do escopo direto desta auditoria, mas confirma que o componente de upload é reutilizado em pelo menos duas features distintas além das mencionadas no escopo).

---

### Resumo de complexidade por tela/componente

| Item | Linhas aprox. | Complexidade relativa | Observações |
|---|---|---|---|
| `SettingsPage` | 15 | Muito baixa | Apenas composição |
| `PreferencesForm` | 51 | Baixa | Form simples com react-hook-form + Zod, sem exibição de erros |
| `ConsentsPanel` | 54 | Baixa-média | Lógica de "latest by type" via Map, mutation on-change sem confirmação |
| `DeleteAccountPanel` | 67 | Média | Dois estados condicionais + modal de confirmação com texto de aviso (sem campo de senha/digitação) |
| `AdminDashboardPage` | 23 | Muito baixa | Apenas composição |
| `ReportsTable` | 122 | Média | Modal de ação com nota opcional, sem paginação/filtro na UI |
| `DisputesTable` | 138 | Média | Igual a ReportsTable + terceira ação + nota obrigatória com dupla validação |
| `features/uploads/api.ts` | 15 | Muito baixa | Função única, sem validação de tipo/tamanho no próprio arquivo |

---

# 03 — Inventário de Formulários, Modais e Cards

> Documento de síntese. Tabelas consolidadas a partir dos 12 arquivos de domínio. Descrição factual, sem sugestões de melhoria.

---

## 7. Inventário Completo dos Formulários

| Formulário | Arquivo | Domínio | Biblioteca | Campos | Observações-chave |
|---|---|---|---|---|---|
| Login | `features/auth/pages/LoginPage.tsx` (usa `AuthField`) | 01-auth | RHF + Zod (`loginSchema`) | email, password | Erro de API: mensagem fixa "Credenciais invalidas" |
| Register | `features/auth/pages/RegisterPage.tsx` | 01-auth | RHF + Zod (`registerSchema`) | name, email, phone, password, confirmPassword, role (`<select>` nativo) | `confirmPassword` validado mas não enviado à API |
| Forgot Password | `features/auth/pages/ForgotPasswordPage.tsx` | 01-auth | RHF + Zod (`forgotPasswordSchema`) | email | Usa `mutate` (não `mutateAsync`); sem tratamento de erro de API |
| Reset Password | `features/auth/pages/ResetPasswordPage.tsx` | 01-auth | RHF + Zod (`resetPasswordSchema`) | token (hidden), password, confirmPassword | Duas variantes de UI conforme presença de `?token=` na URL |
| SearchBar | `features/landing/components/SearchBar.tsx` | 02-landing | RHF + Zod (`searchFormSchema`) | q, city, state (UF) | Sem exibição de erros de validação no JSX |
| SearchFilters | `features/landing/components/SearchFilters.tsx` | 02-landing | `useState` controlado, sem RHF/Zod | q, city, state, categoryId, onlyAvailable (checkbox) | `state` não valida regex de UF (diferente de SearchBar) |
| DemandForm | `features/demands/components/DemandForm.tsx` | 03-demands | RHF + Zod (`demandFormSchema`) | categoryId, title, description, budgetMin, budgetMax, imagens (`ImageUpload`) | Usa paleta de cores "crua" (`slate-*`), não os tokens de design system |
| QuoteForm | `features/demands/components/QuoteForm.tsx` | 03-demands | RHF + Zod (`quoteFormSchema`) + `useFieldArray` | message, validUntil, items[] (description, quantity, unitPrice) | Itens dinâmicos; paleta de cores "crua" |
| InviteProfessionalDialog (form) | `features/demands/components/InviteProfessionalDialog.tsx` | 03-demands | `useState`, sem RHF/Zod | ID do profissional (texto livre) | Sem validação de formato; erro da mutation não tratado |
| ProgressUpdateForm | `features/contracts/components/ProgressUpdateForm.tsx` | 04-contracts | RHF + Zod (`progressFormSchema`) | description, percentage | `reset()` chamado de forma otimista, antes da mutation resolver |
| DisputeDialog (form) | `features/contracts/components/DisputeDialog.tsx` | 04-contracts | RHF + Zod (`disputeFormSchema`) | reason | Sem exibição de erro de mutation |
| PaymentDialog (form) | `features/contracts/components/PaymentDialog.tsx` | 04-contracts | `useState`, sem RHF/Zod | method (radio: wallet/credit_card/pix/boleto) | Valida saldo insuficiente apenas para `wallet` |
| ProfileForm | `features/professional/components/ProfileForm.tsx` | 07-professional | RHF + Zod (`profileFormSchema`) | headline, bio, yearsExperience, hourlyRate, serviceRadiusKm | Só `headline` exibe erro de validação inline |
| AvailabilityManager (form) | `features/professional/components/AvailabilityManager.tsx` | 07-professional | `useState`, sem RHF/Zod | weekday (select), startTime, endTime (`type="time"`) | Sem validação de `endTime > startTime` nem sobreposição |
| PortfolioManager (form) | `features/professional/components/PortfolioManager.tsx` | 07-professional | `useState`, sem RHF/Zod | title (demais campos fixos em `null`) | Campo limpo de forma otimista ao criar |
| ServiceAreaManager (form) | `features/professional/components/ServiceAreaManager.tsx` | 07-professional | `useState`, sem RHF/Zod | city, state (UF) | `radiusKm` sempre `null`; UF não valida sigla real |
| ChatWindow (envio de mensagem) | `features/chat/components/ChatWindow.tsx` | 08-chat | `useState`, sem RHF/Zod | draft (texto único) | Envio via socket (`send_message`), não é mutation HTTP |
| WithdrawDialog (form) | `features/wallet/components/WithdrawDialog.tsx` | 09-wallet | RHF + Zod (`withdrawFormSchema`) | amount, paymentMethod (select: pix/bank_transfer), destination | Sem máscara de moeda; sem indicador de loading textual |
| ReviewForm | `features/reviews/components/ReviewForm.tsx` | 10-notif-reviews-favorites | RHF + Zod (`reviewFormSchema`) | rating (seletor de estrelas via `setValue`), comment | Trata erro 409 (avaliação duplicada) com mensagem específica |
| PreferencesForm | `features/settings/components/PreferencesForm.tsx` | 11-settings-admin-uploads | RHF + Zod (`preferencesFormSchema`) | language, timezone, emailNotifications, pushNotifications, smsNotifications (checkboxes) | `register` chamado mas `formState.errors` nunca renderizado |
| ConsentsPanel (checkboxes) | `features/settings/components/ConsentsPanel.tsx` | 11-settings-admin-uploads | `useState` implícito via React Query, sem RHF/Zod | 4 checkboxes de consentimento (terms, privacy, marketing, data_processing) | Mutation dispara on-change, sem botão de salvar |
| ReportsTable (modal de resolução) | `features/admin/components/ReportsTable.tsx` | 11-settings-admin-uploads | `useState`, sem RHF/Zod | note (opcional) | Nota opcional |
| DisputesTable (modal de resolução) | `features/admin/components/DisputesTable.tsx` | 11-settings-admin-uploads | `useState`, sem RHF/Zod | note (obrigatória) | Dupla validação (disabled + guarda na função) |

**Resumo por biblioteca**: 11 formulários usam `react-hook-form` + `zod`; 9 usam `useState` cru sem validação de schema; 1 (`ChatWindow`) não usa nem RHF nem Zod (envio via socket).

---

## 8. Inventário Completo dos Modais

| Modal | Arquivo | Domínio | Base técnica | Quem abre | Quem fecha |
|---|---|---|---|---|---|
| Modal (primitivo) | `components/ui/Modal.tsx` | 00-foundation | `createPortal` para `document.body` | prop `open` | Escape, botão "×", clique fora **não fecha** |
| Drawer (primitivo, não usado) | `components/ui/Drawer.tsx` | 00-foundation | `createPortal`, lateral (esquerda/direita) | prop `open` | Escape, backdrop, botão "×" (mas **zero usos** em `features/`/`pages/`) |
| CommandPalette | `components/layout/CommandPalette.tsx` | 00-foundation | Construído sobre `Modal` | `Ctrl+K`/`Cmd+K`, botão "Buscar" | Escape (herdado), `closePalette()` |
| InviteProfessionalDialog | `features/demands/components/InviteProfessionalDialog.tsx` | 03-demands | Overlay próprio (`fixed inset-0`), **não** usa `Modal` compartilhado | Botão "Convidar profissional" em `DemandDetailPage` | Botão "Cancelar", sucesso da mutation. **Sem** Escape, **sem** clique fora |
| DisputeDialog | `features/contracts/components/DisputeDialog.tsx` | 04-contracts | `Modal` compartilhado | Botão "Abrir disputa" em `ContractDetailPage` (sem checagem de posse/status) | Botão "Cancelar", "×", Escape, sucesso da mutation |
| PaymentDialog | `features/contracts/components/PaymentDialog.tsx` | 04-contracts | `Modal` compartilhado | Botão "Pagar" (`canPay`) em `ContractDetailPage` | Botão "Cancelar", "×", Escape, sucesso da mutation |
| WithdrawDialog | `features/wallet/components/WithdrawDialog.tsx` | 09-wallet | `Modal` compartilhado | Botão "Sacar" em `WalletPage` | Botão "Cancelar", "×", Escape, sucesso da mutation |
| DeleteAccountPanel (modal de confirmação) | `features/settings/components/DeleteAccountPanel.tsx` | 11-settings-admin-uploads | `Modal` compartilhado | Botão "Solicitar exclusão" | Botão "Cancelar", "×", Escape, confirmação (fecha antes da resposta da mutation) |
| ReportsTable (modal de ação) | `features/admin/components/ReportsTable.tsx` | 11-settings-admin-uploads | `Modal` compartilhado | Botões "Aplicar ação"/"Descartar" por linha | Botão "Cancelar", confirmação |
| DisputesTable (modal de ação) | `features/admin/components/DisputesTable.tsx` | 11-settings-admin-uploads | `Modal` compartilhado | Botões "Reembolsar cliente"/"Liberar profissional"/"Dividir" por linha | Botão "Cancelar", confirmação (nota obrigatória) |

**Observações consolidadas**:
- O `Modal` compartilhado (`components/ui/Modal.tsx`) não implementa focus trap nem retorno de foco ao elemento que abriu — comportamento idêntico em todos os 7 modais que o utilizam.
- Nenhum modal fecha ao clicar no backdrop/fora da área de conteúdo (nem o `Modal` genérico, nem o `InviteProfessionalDialog`, que tem overlay próprio).
- `InviteProfessionalDialog` é o único modal que não reutiliza o componente `Modal` compartilhado — implementa seu próprio overlay `fixed inset-0 bg-black/40` com paleta de cores "crua" (`bg-white`, `bg-slate-900`), diferente dos demais que usam tokens de design system (`bg-bg`, `bg-ink/40`).
- `CommandPalette` é o único "modal" construído para funcionalidade própria de app (busca/navegação global), não para CRUD de uma entidade.

---

## 9. Inventário Completo dos Cards

| Card | Arquivo | Domínio | Base | Conteúdo |
|---|---|---|---|---|
| Card (primitivo) | `components/ui/Card.tsx` | 00-foundation | `div` com `rounded-lg bg-bg p-6`, prop `interactive` opcional | Container genérico reutilizado por quase todos os cards abaixo |
| DemandCard | `features/demands/components/DemandCard.tsx` | 03-demands | `<button>` de largura total (não usa `Card`) | Título, status traduzido (badge), faixa de orçamento |
| QuoteCard | `features/demands/components/QuoteCard.tsx` | 03-demands | `Card` | Headline do profissional, status do orçamento, itens, total, botões Conversar/Aceitar |
| ContractListItem (inline) | dentro de `ContractListPage.tsx` | 04-contracts | `<button>` de largura total (não usa `Card`) | Nome da outra parte, badge de status, valor total |
| DashboardDemandsWidget (card) | `features/dashboard/components/DashboardDemandsWidget.tsx` | 05-dashboard-client | `Card` | Lista de até 3 demandas abertas + link "Ver todas" |
| DashboardContractsWidget (card) | `features/dashboard/components/DashboardContractsWidget.tsx` | 05-dashboard-client | `Card` | Contagem de contratos ativos/concluídos |
| DashboardScheduleWidget (card) | `features/dashboard/components/DashboardScheduleWidget.tsx` | 05-dashboard-client | `Card` (ou `null`) | Próximo agendamento futuro |
| DashboardFavoritesWidget (card) | `features/dashboard/components/DashboardFavoritesWidget.tsx` | 05-dashboard-client | `Card` | Lista de profissionais favoritos (com Avatar) |
| DashboardNotificationsWidget (card) | `features/dashboard/components/DashboardNotificationsWidget.tsx` | 05-dashboard-client | `Card` | Até 5 notificações recentes (texto simples, não clicável) |
| DashboardRevenueWidget (card) | `features/professional-dashboard/components/DashboardRevenueWidget.tsx` | 06-professional-dashboard | `Card` | Saldo disponível, pendente, receita do mês (sem gráfico) |
| DashboardAgendaWidget (card) | `features/professional-dashboard/components/DashboardAgendaWidget.tsx` | 06-professional-dashboard | `Card` | Próximo compromisso + contagem de dias com disponibilidade |
| DashboardActiveContractsWidget (card) | `features/professional-dashboard/components/DashboardActiveContractsWidget.tsx` | 06-professional-dashboard | `Card` | Lista de contratos ativos (só valor, sem nome do cliente) |
| DashboardProfileSummaryCard | `features/professional-dashboard/components/DashboardProfileSummaryCard.tsx` | 06-professional-dashboard | `Card` | Headline + rating + link "Editar perfil" |
| DashboardReviewsWidget (card) | `features/professional-dashboard/components/DashboardReviewsWidget.tsx` | 06-professional-dashboard | `Card` | Envolve `ReviewList` |
| ProfessionalCard | `features/professional/components/ProfessionalCard.tsx` | 07-professional | `Card interactive` | Avatar, headline, badge "Disponível agora", bio truncada, preço/hora, rating, `FavoriteButton` |
| ProfessionalProfileHeader | `features/professional/components/ProfessionalProfileHeader.tsx` | 07-professional | `div` com `bg-surface` (não usa `Card`) | Avatar, headline, badges de categoria, rating, ações (Favoritar/Chat/Contratar) |
| WalletBalanceCard | `features/wallet/components/WalletBalanceCard.tsx` | 09-wallet | `Card` | Saldo disponível + saldo pendente |
| WalletRevenueChart (card) | `features/wallet/components/WalletRevenueChart.tsx` | 09-wallet | `Card` | Gráfico de barras manual (6 meses) |
| TransactionList (itens) | `features/wallet/components/TransactionList.tsx` | 09-wallet | `<li>` com `bg-surface` (não usa `Card`) | Descrição/tipo, data, valor com sinal |
| NotificationsPage (item, inline) | `features/notifications/pages/NotificationsPage.tsx` | 10-notif-reviews-favorites | `Card` como lista com `divide-y`; item é `div` interno | Título, badge "Não lida", corpo opcional, data, botão "Marcar lida" |
| ReviewList (itens) | `features/reviews/components/ReviewList.tsx` | 10-notif-reviews-favorites | `<li>` com `bg-surface` (não usa `Card`) | 5 estrelas, comentário opcional, data |
| PortfolioGallery (itens) | `features/professional/components/PortfolioGallery.tsx` | 07-professional | Sem wrapper `Card`, grid de imagens | Título do item + grid de imagens ou "Sem fotos." |

**Observações consolidadas**:
- Nem todo "card" visual usa o componente `Card` primitivo — `DemandCard`, `ContractListItem`, `TransactionList` (itens), `ReviewList` (itens), `ProfessionalProfileHeader` usam `<button>`/`<li>`/`<div>` estilizados diretamente com `bg-surface`/`rounded-lg` sem importar `Card`.
- Todos os widgets de dashboard (10 ao todo, 5 por dashboard) usam `Card` de forma uniforme, sem variação de tamanho (`col-span`/`row-span`).
- `ProfessionalCard` é o único card que usa a prop `interactive` do `Card` primitivo de forma explícita entre os cards documentados.

---

# 04 — Inventário de Hooks e Componentes Compartilhados

> Documento de síntese. Tabelas consolidadas a partir dos 12 arquivos de domínio. Descrição factual, sem sugestões de melhoria.

---

## 10. Inventário Completo dos Hooks

### 10.1 Hooks de dados (React Query) por feature

| Feature | Hook | Tipo | Endpoint | Domínio |
|---|---|---|---|---|
| auth | `useLogin()` | mutation | `POST /auth/login` | 01-auth |
| auth | `useRegister()` | mutation | `POST /auth/register` | 01-auth |
| auth | `useForgotPassword()` | mutation | `POST /auth/password/forgot` | 01-auth |
| auth | `useResetPassword()` | mutation | `POST /auth/password/reset` | 01-auth |
| landing | `useSearchProfessionals(params)` | query | `GET /search/professionals` | 02-landing |
| landing/professional | `useCategories()` | query | `GET /categories` (via `professionalApi.listPublicCategories`) | 02-landing / 07-professional |
| demands | `useDemands(mine?, options?)` | query | `GET /demands` | 03-demands |
| demands | `useDemand(id)` | query | `GET /demands/:id` | 03-demands |
| demands | `usePublishDemand()` | mutation | `POST /demands` | 03-demands |
| demands | `useDemandQuotes(id)` | query | `GET /demands/:id/quotes` | 03-demands |
| demands | `useAcceptQuote(demandId)` | mutation | `POST /quotes/:quoteId/accept` | 03-demands |
| demands | `useInviteProfessional(demandId)` | mutation | `POST /demands/:id/invitations` | 03-demands |
| demands | `useCreateQuote(demandId)` | mutation | `POST /demands/:id/quotes` | 03-demands |
| contracts | `useContracts()` | query | `GET /contracts` | 04-contracts |
| contracts | `useContract(id)` | query | `GET /contracts/:id` | 04-contracts |
| contracts | `useContractProgress(id)` | query | `GET /contracts/:id/progress` | 04-contracts |
| contracts | `useAddProgress(id)` | mutation | `POST /contracts/:id/progress` | 04-contracts |
| contracts | `useStartContract(id)` | mutation | `POST /contracts/:id/start` | 04-contracts |
| contracts | `useCompleteContract(id)` | mutation | `POST /contracts/:id/complete` | 04-contracts |
| contracts | `useOpenDispute(id)` | mutation | `POST /contracts/:id/disputes` | 04-contracts |
| contracts | `usePayment(contractId)` | query | `GET /contracts/:id/payment` | 04-contracts |
| contracts | `usePayContract(contractId)` | mutation | `POST /contracts/:id/payment` | 04-contracts |
| professional | `useMyProfile()` | query | `GET /professionals/me` (`retry: false`) | 07-professional |
| professional | `useTags()` | query | `GET /tags` | 07-professional |
| professional | `usePublicProfile(id)` | query | `GET /professionals/:id` | 07-professional |
| professional | `usePortfolio(professionalId)` | query | `GET /portfolio/:id/items` | 07-professional |
| professional | `useSlots(professionalId)` | query | `GET /availability/:id/slots` | 07-professional |
| professional | `useUpsertProfile()` | mutation | `PUT /professionals/me` | 07-professional |
| professional | `useSetCategories()` | mutation | `PUT /professionals/me/categories` (sem consumidor de UI) | 07-professional |
| professional | `useSetTags()` | mutation | `PUT /professionals/me/tags` (sem consumidor de UI) | 07-professional |
| professional | `useCreatePortfolioItem(professionalId)` | mutation | `POST /portfolio/me/items` | 07-professional |
| professional | `useRemovePortfolioItem(professionalId)` | mutation | `DELETE /portfolio/me/items/:id` | 07-professional |
| professional | `useAddSlot(professionalId)` | mutation | `POST /availability/me/slots` | 07-professional |
| professional | `useRemoveSlot(professionalId)` | mutation | `DELETE /availability/me/slots/:id` | 07-professional |
| professional | `useAddServiceArea()` | mutation | `POST /professionals/me/service-areas` | 07-professional |
| professional | `useRemoveServiceArea()` | mutation | `DELETE /professionals/me/service-areas/:id` | 07-professional |
| professional | `useAddPortfolioImage(professionalId, itemId)` | mutation | `POST /portfolio/me/items/:itemId/images` | 07-professional |
| professional | `useRemovePortfolioImage(professionalId)` | mutation | `DELETE /portfolio/me/images/:id` | 07-professional |
| chat | `useMessages(roomId)` | query | `GET /chat/rooms/:roomId/messages` | 08-chat |
| chat | `useCreateRoom()` | mutation | `POST /chat/rooms` (sem consumidor dentro da própria feature) | 08-chat |
| chat | `useChatSocket(roomId)` | hook customizado (socket) | eventos `join_room`/`send_message`/`message` | 08-chat |
| wallet | `useWallet()` | query | `GET /wallet` | 09-wallet |
| wallet | `useTransactions(page, limit=20)` | query | `GET /wallet/transactions` | 09-wallet |
| wallet | `useWithdrawals()` | query | `GET /withdrawals` (sem consumidor de UI) | 09-wallet |
| wallet | `useRequestWithdrawal()` | mutation | `POST /withdrawals` | 09-wallet |
| notifications | `useNotifications(page=1)` | query | `GET /notifications` | 10-notif-reviews-favorites |
| notifications | `useMarkNotificationRead()` | mutation | `PATCH /notifications/:id/read` | 10-notif-reviews-favorites |
| reviews | `useProfessionalReviews(professionalId)` | query | `GET /professionals/:id/reviews` | 10-notif-reviews-favorites |
| reviews | `useCreateReview()` | mutation | `POST /reviews` | 10-notif-reviews-favorites |
| favorites | `useFavorites(page)` | query | `GET /favorites` (sem consumidor de página de UI) | 10-notif-reviews-favorites |
| favorites | `useFavoriteIds()` | query | `GET /favorites` (limit=100, deriva `Set`) | 10-notif-reviews-favorites |
| favorites | `useAddFavorite()` | mutation | `POST /favorites` | 10-notif-reviews-favorites |
| favorites | `useRemoveFavorite()` | mutation | `DELETE /favorites/:professionalId` | 10-notif-reviews-favorites |
| settings | `usePreferences()` | query | `GET /account/preferences` | 11-settings-admin-uploads |
| settings | `useUpdatePreferences()` | mutation | `PATCH /account/preferences` | 11-settings-admin-uploads |
| settings | `useConsents()` | query | `GET /account/consents` | 11-settings-admin-uploads |
| settings | `useRecordConsent()` | mutation | `POST /account/consents` | 11-settings-admin-uploads |
| settings | `useDeletionStatus()` | query | `GET /account/deletion` | 11-settings-admin-uploads |
| settings | `useRequestDeletion()` | mutation | `POST /account/deletion` | 11-settings-admin-uploads |
| settings | `useCancelDeletion()` | mutation | `DELETE /account/deletion` | 11-settings-admin-uploads |
| admin | `useReports(page=1)` | query | `GET /admin/reports` | 11-settings-admin-uploads |
| admin | `useResolveReport()` | mutation | `PATCH /admin/reports/:id` | 11-settings-admin-uploads |
| admin | `useDisputes(page=1)` | query | `GET /admin/disputes` | 11-settings-admin-uploads |
| admin | `useResolveDispute()` | mutation | `PATCH /admin/disputes/:id` | 11-settings-admin-uploads |

Total: ~60 hooks de dados distribuídos em 15 features. Hooks existentes mas **sem consumidor de UI** identificado nos domínios: `useSetCategories`, `useSetTags` (professional), `useCreateRoom` dentro da própria feature chat (usado por outras features), `useWithdrawals` (wallet), `useFavorites` (favorites, só `useFavoriteIds` é usado).

### 10.2 Hooks de estado global (Zustand)

| Store | Arquivo | Estado | Consumida por |
|---|---|---|---|
| `useAuthStore` | `stores/auth.ts` | `user`, `accessToken`, `refreshToken`, `isBootstrapping` | `ProtectedRoute`, `Sidebar`, `MobileNav`, `ProfileMenu`, `CommandPalette`, `HomeRoute`, `lib/http.ts`, `bootstrap.ts`, `ContractDetailPage`, `ChatWindow`, várias outras telas |
| `useSidebarStore` | `stores/sidebar.ts` | `collapsed` (persistido via middleware `persist`, chave `sidebar-collapsed`) | `Sidebar` (único consumidor) |
| `useCommandPaletteStore` | `stores/commandPalette.ts` | `open` | `CommandPalette`, `Sidebar`, `MobileNav` |
| `useToastStore` | `components/ui/Toast.tsx` | `toasts: ToastItem[]` | `ToastProvider`, `useToast()` (consumido apenas por `ImageUpload.tsx`) |

### 10.3 Hooks utilitários/customizados (fora de React Query/Zustand)

| Hook | Local | Descrição |
|---|---|---|
| `useToast()` | `components/ui/Toast.tsx` | Expõe `{ toast: push }` da store de toasts |
| `useDebouncedValue` (interno) | `components/layout/CommandPalette.tsx` | Debounce de 300ms para a busca da paleta de comandos |
| `useChatSocket(roomId)` | `features/chat/queries.ts` | Integra socket.io ao React Query (join_room, listener de `message`, função `send`) |

---

## 11. Inventário dos Componentes Compartilhados

### 11.1 Primitivos de UI (`components/ui/`)

| Componente | Arquivo | Props principais | Reutilização real (conforme domínios) |
|---|---|---|---|
| Avatar | `components/ui/Avatar.tsx` | `name`, `src?`, `size?` (sm/md/lg) | Usado em `ProfileMenu`, `DashboardFavoritesWidget`, `ProfessionalCard`, `ProfessionalProfileHeader` |
| Badge | `components/ui/Badge.tsx` | `tone?` (neutral/urgent) | Usado em `DemandCard`, `DemandDetailPage`, `QuoteCard`, `ContractListPage`, `ContractDetailPage`, `ProfessionalCard`, `ProfessionalProfileHeader`, `NotificationsPage`, `ReportsTable`, `DisputesTable` |
| Button | `components/ui/Button.tsx` | `variant?` (primary/accent/ghost), `size?` (sm/md) | Usado amplamente (29+ arquivos) — praticamente toda tela com ação |
| Card | `components/ui/Card.tsx` | `interactive?` | Base de quase todos os widgets/cards (ver seção 9) |
| Drawer | `components/ui/Drawer.tsx` | `open`, `onClose`, `title`, `side?` | **Nenhum uso real** em `features/`/`pages/` |
| EmptyState | `components/ui/EmptyState.tsx` | `title`, `description?`, `action?` | Um dos mais reutilizados — usado em praticamente toda feature para estado vazio/erro mascarado |
| ImageUpload | `components/ui/ImageUpload.tsx` | `onUploaded`, `label?` | Usado em `DemandForm` (demands) e `PortfolioManager` (professional) |
| Modal | `components/ui/Modal.tsx` | `open`, `onClose`, `title`, `className?` | `DisputeDialog`, `PaymentDialog`, `WithdrawDialog`, `DeleteAccountPanel`, `ReportsTable`, `DisputesTable`, `CommandPalette` (base) |
| Skeleton | `components/ui/Skeleton.tsx` | `className`, `aria-label?` | Um dos mais reutilizados (24+ arquivos) — padrão de loading em quase toda feature |
| Toast (+ store + provider) | `components/ui/Toast.tsx` | `useToast()`, `ToastProvider` | Infraestrutura montada globalmente em `AppShell`; consumo real restrito a `ImageUpload` |
| Tooltip | `components/ui/Tooltip.tsx` | `label`, `children` | Uso real restrito a `Sidebar` (itens colapsados) |

### 11.2 Utilitários de biblioteca (`lib/`)

| Utilitário | Arquivo | Função |
|---|---|---|
| `cn` | `lib/utils.ts` | Composição condicional de classes Tailwind — usado em praticamente todo componente |
| `formatCurrency` | `lib/utils.ts` | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` — usado em `QuoteCard`, `ContractListPage`, `ContractDetailPage`, `WalletBalanceCard`, `TransactionList`, `DashboardRevenueWidget`, `DashboardActiveContractsWidget`, `WalletRevenueChart` |
| `formatDate` | `lib/utils.ts` | `Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })` — usado em `ContractProgress`, `ContractDetailPage`, `DashboardScheduleWidget`, `DashboardAgendaWidget`, `ReviewList` |
| `toNumber` | `lib/utils.ts` | Conversão numérica auxiliar de `formatCurrency` |
| `http` | `lib/http.ts` | Instância Axios única com interceptors de auth/refresh — usada por toda camada `api.ts` de todas as features |
| `navConfig` | `lib/navConfig.ts` | Fonte única de itens de navegação por role — `Sidebar`, `MobileNav`, `CommandPalette` |
| `authStorage` | `lib/authStorage.ts` | Persistência do refresh token — `stores/auth.ts`, `lib/http.ts`, `features/auth/bootstrap.ts` |
| `queryClient` | `lib/queryClient.ts` | Instância única do `QueryClient` (retry:1, refetchOnWindowFocus:false, staleTime:30s) — `main.tsx` |

### 11.3 Componentes de feature reaproveitados por outras features (acoplamento cruzado)

| Componente/hook | Feature de origem | Consumido por |
|---|---|---|
| `ReviewForm` | `reviews` | `features/contracts/pages/ContractDetailPage.tsx` |
| `ReviewList` | `reviews` | `features/professional/pages/PublicProfilePage.tsx`, `features/professional-dashboard/components/DashboardReviewsWidget.tsx` |
| `FavoriteButton` | `favorites` | `features/professional/components/ProfessionalCard.tsx`, `features/professional/components/ProfessionalProfileHeader.tsx` |
| `useFavoriteIds` | `favorites` | `features/landing/components/ProfessionalResults.tsx`, `features/professional/pages/PublicProfilePage.tsx` |
| `ProfessionalCard` | `professional` | `features/landing/components/ProfessionalResults.tsx` |
| `useCreateRoom` | `chat` | `features/demands/components/QuoteCard.tsx`, `features/contracts/pages/ContractDetailPage.tsx`, `features/professional/components/ProfessionalProfileHeader.tsx` |
| `useCategories` | `professional` (`professionalApi.listPublicCategories`) | `features/landing/components/CategoryGrid.tsx`, `features/landing/components/SearchFilters.tsx` |
| `usePublicProfile` | `professional` | `features/demands/components/QuoteCard.tsx`, `features/dashboard/components/DashboardFavoritesWidget.tsx` (via `FavoriteProfessionalPreview`), `features/professional/components/ServiceAreaManager.tsx` (perfil do próprio usuário) |
| `useWallet` | `wallet` | `features/contracts/components/PaymentDialog.tsx`, `features/professional-dashboard/components/DashboardRevenueWidget.tsx` |
| `useContracts` | `contracts` | `features/dashboard/components/DashboardContractsWidget.tsx`, `features/dashboard/components/DashboardScheduleWidget.tsx`, `features/professional-dashboard/components/DashboardAgendaWidget.tsx`, `features/professional-dashboard/components/DashboardActiveContractsWidget.tsx` |
| `useDemands` | `demands` | `features/dashboard/components/DashboardDemandsWidget.tsx`, `components/layout/CommandPalette.tsx` |
| `useMyProfile` | `professional` | `features/professional-dashboard/components/DashboardAgendaWidget.tsx`, `DashboardProfileSummaryCard.tsx`, `DashboardReviewsWidget.tsx` |

---

# 05 — Fluxos Funcionais

> Documento de síntese. Passo a passo dos fluxos funcionais do sistema, citando telas e componentes reais documentados nos 12 arquivos de domínio. Descrição factual, sem sugestões de melhoria.

---

## 12.1 Login

1. Usuário acessa `/login` (`LoginPage`, `features/auth/pages/LoginPage.tsx`), rota pública.
2. Preenche e-mail e senha nos campos `AuthField` (dentro de um `Card` único, container `mx-auto max-w-sm p-6`).
3. Submete; validação client-side via Zod (`loginSchema`) roda antes do envio.
4. `useLogin()` dispara `POST /auth/login`; botão mostra "Entrando..." e fica desabilitado (`isPending`).
5. Sucesso: `setAuth(user, accessToken, refreshToken)` (store `useAuthStore`) e `navigate('/')`.
6. Erro: mensagem fixa "Credenciais invalidas" (não distingue tipos de erro).
7. Ao chegar em `/`, `HomeRoute` decide a tela seguinte conforme `role` (ver fluxo 05.14 "Navegação pós-login").

## 12.2 Cadastro (Registro)

1. Usuário acessa `/register` (`RegisterPage`), a partir do link "Criar conta" em `LoginPage`.
2. Preenche Nome, E-mail, Telefone, Senha, Confirmar senha, e escolhe Perfil (`<select>` nativo: Cliente/Profissional, default "Cliente").
3. Validação Zod (`registerSchema`, com `.refine` de senha==confirmação) roda no submit.
4. `useRegister()` dispara `POST /auth/register` (payload sem `confirmPassword`).
5. Sucesso: `setAuth` já autentica o usuário recém-criado; `navigate('/verify-email')`.
6. Em `VerifyEmailPage` (`/verify-email`), sem `token` na URL: mensagem "Abra o link enviado ao seu e-mail." + botão "Ignorar por enquanto" (chama `authApi.skipEmailVerification()` e depois `navigate('/')`) + link "Ir para o login".
7. Se o usuário abrir o link do e-mail (`/verify-email?token=...`): `useEffect` chama `authApi.verifyEmail(token)` automaticamente; estado `pending` → `done`/`error`.

## 12.3 Recuperação de senha

1. Usuário clica "Esqueci a senha" em `LoginPage` → `/forgot-password` (`ForgotPasswordPage`).
2. Informa e-mail; `useForgotPassword()` dispara `POST /auth/password/forgot` via `.mutate` (fire-and-forget, sem navegação).
3. Mensagem genérica "Se o e-mail existir, enviamos as instrucoes." (não confirma nem nega existência da conta).
4. Usuário abre o e-mail recebido → `/reset-password?token=XYZ` (`ResetPasswordPage`).
5. Sem `token` válido: `Card` alternativo só com mensagem de erro, sem formulário.
6. Com `token`: preenche Nova senha + Confirmar senha; `useResetPassword()` dispara `POST /auth/password/reset`.
7. Sucesso: `navigate('/login')` direto (sem tela de confirmação intermediária).

## 12.4 Publicação de demanda

1. Cliente autenticado clica "Publicar demanda" (em `DashboardQuickActions` do dashboard cliente, no CTA de `EmptyState` de `DemandListPage`, ou em "Contratar" a partir de `PublicProfilePage`/`ProfessionalProfileHeader`, que leva a `/demands/new?professionalId=...`).
2. Chega em `/demands/new` (`PublishDemandPage`), rota restrita a `role='client'` (`ProtectedRoute roles={['client']}`).
3. Preenche `DemandForm`: categoria (UUID), título, descrição, orçamento mínimo/máximo, fotos opcionais via `ImageUpload` (que chama `uploadImage` de `features/uploads/api.ts`, `POST /uploads/images`).
4. Submete; `usePublishDemand()` dispara `POST /demands` (payload inclui `addressId: null`, `tagIds: []`, imagens como `{url, position}`).
5. Se a URL tinha `?professionalId=`, a página tenta silenciosamente (`catch` vazio) convidar esse profissional via `inviteProfessional` chamado diretamente da API (bypassando o hook `useInviteProfessional`).
6. Sucesso: `navigate('/demands/${demand.id}')` — chega em `DemandDetailPage`.

## 12.5 Busca de profissionais

1. Usuário (autenticado ou visitante) preenche `SearchBar` em `LandingPage` (`/`, quando não há dashboard aplicável) — campos `q`, `city`, `state`, validados via Zod (`searchFormSchema`).
2. Submete → `navigate('/search?q=...&city=...&state=...')`; alternativamente, clica em um card de `CategoryGrid` → `navigate('/search?categoryId=...')`.
3. Em `SearchPage` (`/search`), os parâmetros da URL alimentam `SearchFilters` (coluna esquerda, sem RHF/Zod) e `ProfessionalResults` (coluna direita).
4. Qualquer alteração em `SearchFilters` reconstrói a `URLSearchParams` inteira (`handleChange` em `SearchPage`), disparando novo fetch via `useSearchProfessionals`.
5. Filtros "Disponível agora" (`onlyAvailable`) e "Ordenar por" (`sort`) são aplicados **client-side**, sobre os itens já retornados pela API (não refletidos na URL, perdidos ao recarregar).
6. `ProfessionalResults` renderiza `ProfessionalCard`s (com `FavoriteButton`, via `useFavoriteIds()`), cada um linkando para `/professionals/:id`.

## 12.6 Contratação (do orçamento à aceitação)

1. Cliente acessa `DemandDetailPage` (`/demands/:id`) e vê os orçamentos recebidos (`QuoteCard`, via `useDemandQuotes(id)`).
2. Cliente pode clicar em "Convidar profissional" (abre `InviteProfessionalDialog`, envia `POST /demands/:id/invitations`) para solicitar orçamento a um profissional específico.
3. Profissional autenticado, ao acessar a mesma `DemandDetailPage` de uma demanda `open`, vê o `QuoteForm` (só aparece se `role === 'professional'`) e envia um orçamento: mensagem, validade, lista dinâmica de itens (`useFieldArray`) — `useCreateQuote(demandId)` dispara `POST /demands/:id/quotes`.
4. Cliente (ou qualquer usuário, pois a tela não valida posse/role para esse botão) clica "Aceitar" em um `QuoteCard` quando `canAccept = quote.status === 'pending' && demand.status === 'open'`.
5. `useAcceptQuote(demandId)` dispara `POST /quotes/:quoteId/accept` (body `{ schedule: null }`), criando um `Contract`.
6. A partir daqui, o fluxo segue em `ContractDetailPage` (`/contracts/:id`) — ver fluxo 05.7.
7. Em qualquer momento, dentro de `QuoteCard`, o botão "Conversar" cria/abre uma sala de chat com o profissional autor do orçamento (`useCreateRoom` → `navigate('/chat/:roomId')`).

## 12.7 Execução do serviço (contrato)

1. Ambas as partes acessam `ContractDetailPage` (`/contracts/:id`), rota acessível a qualquer autenticado (diferenciação de ações é interna, via flags calculadas a partir de `role` + comparação de IDs).
2. Profissional dono do contrato (`isOwnProfessionalContract`), com `status === 'active'` e `startedAt === null`, vê botão "Iniciar contrato" (`useStartContract` → `POST /contracts/:id/start`).
3. Após iniciado (`startedAt !== null`), o profissional vê `ProgressUpdateForm` (registra descrição + percentual, `useAddProgress` → `POST /contracts/:id/progress`) e o botão "Concluir contrato" (`useCompleteContract` → `POST /contracts/:id/complete`).
4. As atualizações de progresso aparecem em `ContractProgress` (lista simples, sem stepper visual), para ambas as partes.
5. Botões "Chat" e "Abrir disputa" (`DisputeDialog`, `useOpenDispute` → `POST /contracts/:id/disputes`) ficam disponíveis para qualquer usuário/status, sem checagem de posse.
6. Quando `status === 'completed'`, aparece o bloco "Avaliar" (`canReview`) com `ReviewForm` (`features/reviews`), que dispara `useCreateReview()` → `POST /reviews`.

## 12.8 Pagamento

1. Dentro de `ContractDetailPage`, cliente (`isClient`) vê o botão "Pagar" quando `canPay` (`status` não é `cancelled`/`disputed` e ainda não há pagamento `captured`).
2. Abre `PaymentDialog` — exibe valor total, permite escolher método (`wallet`, `credit_card`, `pix`, `boleto` via radio, default `wallet`).
3. Se método `wallet`, valida saldo suficiente via `useWallet()` (feature `wallet`); se insuficiente, desabilita o botão de confirmação com aviso.
4. Confirma → `usePayContract(contractId)` dispara `POST /contracts/:id/payment`; sucesso invalida `payment` e `detail` do contrato e fecha o modal.
5. Erro da mutation é a única mensagem de erro tratada explicitamente em toda a feature `contracts` (texto inline no modal).

## 12.9 Carteira (Wallet)

1. Qualquer usuário autenticado acessa `/wallet` (`WalletPage`) pelo item de menu "Carteira"/"Pagamentos-Carteira" (rótulo varia por role, mesma rota).
2. Vê `WalletBalanceCard` (saldo disponível + pendente, via `useWallet()`), `WalletRevenueChart` (gráfico de barras manual dos últimos 6 meses, via `useTransactions(1, 100)`, soma só créditos) e `TransactionList` (via `useTransactions(1)`, limit 20, sem paginação de UI).
3. Botão "Sacar" abre `WithdrawDialog`.

## 12.10 Saque

1. Em `WithdrawDialog`, usuário informa valor (`amount`), método (`pix`/`bank_transfer`) e destino (texto livre, sem máscara).
2. Validação Zod (`withdrawFormSchema`): valor positivo, destino 3–255 caracteres.
3. Confirma → `useRequestWithdrawal()` dispara `POST /withdrawals`; sucesso invalida `wallet` e `withdrawals` (mas **não** `transactions`) e fecha o modal.
4. Erro da mutation não é tratado visualmente (sem mensagem ao usuário).

## 12.11 Chat

1. Uma sala de chat é sempre criada/aberta a partir de **fora** da feature chat: botão "Conversar" em `QuoteCard` (`features/demands`), botão "Chat" em `ContractDetailPage` (`features/contracts`) ou em `ProfessionalProfileHeader` (`features/professional`) — todos via `useCreateRoom()` (`POST /chat/rooms`) seguido de `navigate('/chat/:roomId')`.
2. `ChatPage` (`/chat/:roomId`) lê `roomId` da URL e delega tudo a `ChatWindow`.
3. `ChatWindow` busca histórico via `useMessages(roomId)` (`GET /chat/rooms/:roomId/messages`, sempre página 1, limit 20 fixos) e conecta ao socket via `useChatSocket(roomId)` (`join_room` ao montar).
4. Envio de mensagem: campo de texto único → `send(draft.trim())`, emitido via evento de socket `send_message` (não é chamada HTTP/mutation).
5. Recebimento: listener `message` no socket insere a mensagem no início do cache do React Query (`setQueryData`), filtrando por `roomId`.
6. `ChatIndexPage` (`/chat`, sem `roomId`) é um estado vazio estático — não lista conversas existentes, apenas instrui o usuário a abrir o chat a partir de um contrato/conversa iniciada.

## 12.12 Notificações

1. `NotificationBell` (no `Topbar`, sempre visível) mostra contagem de não lidas calculada sobre a página 1 de `useNotifications()` (pode subestimar o total se houver mais de 20 não lidas).
2. Clique navega para `/notifications` (`NotificationsPage`) — não há popover/preview.
3. Lista de notificações (via `useNotifications()`) mostra título, corpo opcional, data e badge "Não lida" (`!notification.readAt`).
4. Clique em "Marcar lida" dispara `useMarkNotificationRead()` (`PATCH /notifications/:id/read`), que invalida toda a query `['notifications']`.
5. Não há botão de "marcar todas como lidas", nem exclusão, nem navegação a partir do próprio item da notificação.

## 12.13 Disputa

1. Dentro de `ContractDetailPage`, qualquer usuário logado que acesse a tela (sem checagem de posse/status) pode clicar "Abrir disputa".
2. `DisputeDialog` abre; usuário informa `reason` (mínimo 10 caracteres, Zod `disputeFormSchema`).
3. `useOpenDispute(id)` dispara `POST /contracts/:id/disputes`; sucesso invalida `contractKeys.detail(id)` e fecha o modal (o `status` do contrato muda para `disputed` a partir do backend).
4. Do lado do admin: `DisputesTable` (dentro de `AdminDashboardPage`, `/admin`) lista disputas via `useDisputes()` (página 1 fixa), exibindo apenas `id` e `status` (badge). Ações por linha: "Reembolsar cliente" (`refund_client`), "Liberar profissional" (`release_professional`), "Dividir" (`split`) — cada uma abre um modal com campo de nota **obrigatória**, disparando `useResolveDispute()` (`PATCH /admin/disputes/:id`).

## 12.14 Administração (moderação)

1. Usuário `admin` acessa `/admin` (`AdminDashboardPage`), única rota exclusiva desse papel.
2. Duas tabelas empilhadas: `ReportsTable` (denúncias, via `useReports()`) e `DisputesTable` (disputas, ver 05.13).
3. Em `ReportsTable`, ações por linha: "Aplicar ação" (`resolution: 'actioned'`) e "Descartar" (`resolution: 'dismissed'`), cada uma com modal contendo nota **opcional**; `useResolveReport()` dispara `PATCH /admin/reports/:id`.
4. Nenhuma das duas tabelas expõe paginação, filtro ou ordenação de UI (sempre página 1, `limit=20`, apesar de a API suportar).

## 12.15 Configurações (Settings)

1. Qualquer usuário autenticado acessa `/settings` (`SettingsPage`), que empilha três painéis independentes:
   - `PreferencesForm`: idioma, fuso horário, notificações (e-mail/push/SMS) — `useUpdatePreferences()` (`PATCH /account/preferences`), sem exibição de mensagens de erro no JSX.
   - `ConsentsPanel`: 4 checkboxes de consentimento LGPD (termos, privacidade, marketing, tratamento de dados) — cada clique já dispara `useRecordConsent()` (`POST /account/consents`) imediatamente, sem botão de confirmação.
   - `DeleteAccountPanel`: fluxo de exclusão de conta com `Modal` de confirmação (texto de aviso, sem campo de senha/digitação de confirmação) — `useRequestDeletion()` (`POST /account/deletion`) e `useCancelDeletion()` (`DELETE /account/deletion`) durante o período de carência.

## 12.16 Perfil profissional (edição)

1. Profissional acessa `/professional/profile` (`ProfessionalProfileEditPage`), rota sem restrição de `roles` (qualquer autenticado pode acessar tecnicamente).
2. `ProfileForm` (headline, bio, anos de experiência, valor/hora, raio de atendimento) — `useUpsertProfile()` (`PUT /professionals/me`).
3. `PortfolioManager` (criação de itens + upload de imagens via `ImageUpload`) e pré-visualização somente-leitura via `PortfolioGallery`.
4. `AvailabilityManager` (slots de disponibilidade por dia da semana) e pré-visualização via `AvailabilityGrid`.
5. `ServiceAreaManager` (cidade/UF de atendimento) — dado de leitura reaproveita `usePublicProfile(profile?.id)` (mesmo endpoint da tela pública).
6. Cada bloco tem seu próprio botão de submissão/estado de mutation independente — não há salvamento único global da página.

## 12.17 Favoritar profissional

1. Em `ProfessionalCard` (listagem de busca) ou `ProfessionalProfileHeader` (perfil público), o `FavoriteButton` reflete `isFavorite` vindo de `useFavoriteIds()` do componente pai.
2. Clique chama `useAddFavorite()`/`useRemoveFavorite()` conforme o estado atual (`POST /favorites` ou `DELETE /favorites/:professionalId`), com `preventDefault`/`stopPropagation` para não disparar a navegação do `Link` pai.
3. Sem atualização otimista — o ícone só reflete o novo estado após a invalidação de `['favorites']` e o refetch de `useFavoriteIds()`.

---

# 06 — Mapa de Navegação

> Documento de síntese. Descreve como uma tela leva a outra, organizado por fluxo de client/professional/admin. Baseado exclusivamente nos links/navegações documentados nos 12 arquivos de domínio.

---

## 13.1 Mapa de navegação — visitante não autenticado

```
/  (LandingPage, fallback do HomeRoute)
 ├─ SearchBar (submit) ───────────────► /search?q=&city=&state=
 ├─ CategoryGrid (clique em card) ───► /search?categoryId=
 └─ (Topbar) ProfileMenu ausente (sem user)

/search (SearchPage)
 └─ ProfessionalCard (clique) ───────► /professionals/:id

/professionals/:id (PublicProfilePage)
 ├─ Botão "Contratar" ───────────────► /demands/new?professionalId=:id  (bloqueado por ProtectedRoute se não logado → /login)
 ├─ Botão "Chat" ────────────────────► cria sala → /chat/:roomId (idem, requer login)
 └─ FavoriteButton (requer login para efeito real)

/login, /register, /forgot-password, /reset-password, /verify-email
 (rede interna de navegação — ver 13.4)

Qualquer rota protegida sem sessão ──► redireciona para /login (ProtectedRoute)
Rota com roles incompatível ────────► redireciona para /forbidden (ProtectedRoute)
Rota inexistente ───────────────────► /  (NotFound, path "*")
```

## 13.2 Mapa de navegação — fluxo do Cliente (`role: client`)

```
/  (ClientDashboardPage, via HomeRoute)
 ├─ DashboardQuickActions
 │   ├─ "Publicar demanda" ─────────► /demands/new
 │   ├─ "Buscar profissional" ──────► /search
 │   └─ "Ver contratos" ────────────► /contracts
 ├─ DashboardDemandsWidget
 │   ├─ item da lista ──────────────► /demands/:id
 │   ├─ CTA vazio "Publicar demanda"─► /demands/new
 │   └─ "Ver todas" ────────────────► /demands
 ├─ DashboardContractsWidget
 │   └─ "Ver contratos" ────────────► /contracts
 ├─ DashboardScheduleWidget (sem links; pode não renderizar)
 ├─ DashboardFavoritesWidget
 │   └─ item (profissional favorito) ► /professionals/:id
 └─ DashboardNotificationsWidget
     └─ "Ver todas" ─────────────────► /notifications

/demands (DemandListPage)
 ├─ EmptyState CTA "Publicar demanda" ► /demands/new
 └─ DemandCard (clique) ─────────────► /demands/:id

/demands/new (PublishDemandPage)
 └─ sucesso da publicação ───────────► /demands/:id (da demanda recém-criada)

/demands/:id (DemandDetailPage)
 ├─ Botão "Convidar profissional" ───► abre InviteProfessionalDialog (modal, não navega)
 ├─ QuoteCard → "Conversar" ─────────► /chat/:roomId (cria sala)
 └─ QuoteCard → "Aceitar" ───────────► cria Contract (permanece na página; contrato acessível em /contracts/:id depois)

/contracts (ContractListPage)
 └─ ContractListItem (clique) ───────► /contracts/:id

/contracts/:id (ContractDetailPage)
 ├─ Botão "Pagar" ────────────────────► abre PaymentDialog (modal)
 ├─ Botão "Chat" ─────────────────────► /chat/:roomId (cria sala)
 ├─ Botão "Abrir disputa" ────────────► abre DisputeDialog (modal)
 └─ Bloco "Avaliar" (ReviewForm, sem navegação — permanece na página)

/wallet (WalletPage)
 └─ Botão "Sacar" ────────────────────► abre WithdrawDialog (modal, não navega)

/notifications (NotificationsPage)
 └─ sem navegação de saída própria (itens não são clicáveis, exceto botão "Marcar lida")

/chat (ChatIndexPage) — estado vazio estático, sem navegação de saída
/chat/:roomId (ChatPage) — sem navegação de saída própria

/settings (SettingsPage)
 └─ DeleteAccountPanel → modal de confirmação (sem navegação de saída)

Topbar (global) → ProfileMenu → "Configurações" (/settings) / "Sair" (clear() + navigate('/login'))
Topbar (global) → NotificationBell → /notifications
Sidebar/MobileNav (global) → itens de clientNav: /demands, /contracts, /chat, /wallet
```

## 13.3 Mapa de navegação — fluxo do Profissional (`role: professional`)

```
/professional/dashboard (ProfessionalDashboardPage, via HomeRoute em "/" ou rota explícita)
 ├─ DashboardQuickActions
 │   ├─ "Buscar demandas disponíveis" ► /demands
 │   ├─ "Ver contratos" ───────────────► /contracts
 │   └─ "Editar perfil" ───────────────► /professional/profile
 ├─ DashboardActiveContractsWidget
 │   └─ item (valor do contrato) ──────► /contracts/:id
 ├─ DashboardProfileSummaryCard
 │   └─ "Editar perfil" ───────────────► /professional/profile
 ├─ DashboardRevenueWidget (sem links)
 ├─ DashboardAgendaWidget (sem links)
 └─ DashboardReviewsWidget (sem links; ReviewList somente leitura)

/demands (DemandListPage) — mesma tela do cliente, sem diferenciação de layout
 └─ DemandCard (clique) ───────────────► /demands/:id

/demands/:id (DemandDetailPage)
 ├─ QuoteForm visível (role professional + demanda open) — submissão permanece na página
 └─ QuoteCard de outros profissionais também visível (sem filtro por autor)

/professional/profile (ProfessionalProfileEditPage)
 ├─ ProfileForm, PortfolioManager, AvailabilityManager, ServiceAreaManager
 └─ sem navegação de saída própria (nenhum link para /professionals/:id do próprio usuário)

/contracts/:id (ContractDetailPage) — ações "Iniciar contrato"/"Concluir contrato" exclusivas do profissional dono
 └─ mesmas navegações de Chat/Disputa/Avaliar descritas em 13.2

Sidebar/MobileNav (global) → itens de professionalNav: /demands, /contracts, /chat, /professional/profile, /wallet
```

## 13.4 Mapa de navegação — Admin (`role: admin`)

```
/admin (AdminDashboardPage) — única rota exclusiva de admin
 ├─ ReportsTable → modal de ação (não navega)
 └─ DisputesTable → modal de ação (não navega)

/  (fallback para LandingPage — não há dashboard de admin na raiz)

Demais rotas (contracts, wallet, chat, notifications, settings) acessíveis como qualquer usuário
autenticado, sem diferenciação de layout/conteúdo por ser admin (exceto rótulo de menu "Pagamentos/Carteira"
em vez de "Carteira", e os 3 primeiros itens de adminNav apontando todos para /admin).
```

## 13.5 Rede de navegação interna das telas de autenticação (públicas)

```
/login ──"Criar conta"──► /register
/login ──"Esqueci a senha"──► /forgot-password
/login ──sucesso──► /  (HomeRoute)

/register ──"Já tenho conta"──► /login
/register ──sucesso──► /verify-email

/forgot-password ──(sem links de saída)

/reset-password ──sucesso──► /login

/verify-email ──"Ir para o login"──► /login
/verify-email ──"Ignorar por enquanto" (sucesso)──► /
```

## 13.6 Pontos de entrada para o Chat (`/chat/:roomId`)

O chat nunca é alcançado por navegação direta dentro da própria feature (`ChatIndexPage` não lista salas). Todos os pontos de entrada partem de outras features:

| Origem | Componente | Ação |
|---|---|---|
| `features/demands` | `QuoteCard` (botão "Conversar") | `useCreateRoom({ participantId: profile.userId })` → `/chat/:roomId` |
| `features/contracts` | `ContractDetailPage` (botão "Chat") | `useCreateRoom({ participantId, contractId })` → `/chat/:roomId` |
| `features/professional` | `ProfessionalProfileHeader` (botão "Chat") | `useCreateRoom({ participantId: profile.userId })` → `/chat/:roomId` |

## 13.7 Pontos de entrada para "Contratar"/publicação de demanda associada a um profissional

| Origem | Ação |
|---|---|
| `PublicProfilePage` / `ProfessionalProfileHeader` (botão "Contratar") | `navigate('/demands/new?professionalId=' + profile.id)` |
| `PublishDemandPage` (leitura do query param) | Após publicar, tenta convidar automaticamente esse profissional (`POST /demands/:id/invitations`, erros silenciados) |

## 13.8 Telas sem nenhuma navegação de saída própria (observado nos domínios)

- `ForgotPasswordPage` — nenhum link (nem "voltar ao login").
- `ResetPasswordPage` — nenhum link visível (só redirecionamento programático pós-sucesso).
- `ChatIndexPage` — nenhum link/botão.
- `ChatPage` — nenhuma forma de voltar à lista ou trocar de sala pela própria UI.
- `NotificationsPage` — itens não são clicáveis; sem botão de voltar.
- `ProfessionalProfileEditPage` — sem link de volta ou para visualizar o próprio perfil público.
- `DashboardRevenueWidget`, `DashboardAgendaWidget`, `DashboardReviewsWidget` (professional-dashboard) — sem links.
- `DashboardScheduleWidget` (dashboard cliente) — sem links.

---

# 07 — Relações entre Componentes, Relações entre Telas, Dependências e Pontos de Acoplamento

> Documento de síntese. Baseado exclusivamente nos 12 arquivos de domínio. Seção 17 é constatação factual de acoplamentos observados no código — sem sugestão de correção.

---

## 14. Relação entre Componentes

Tabela de quais componentes/hooks compartilhados (de `components/ui`, `lib`, ou de outra feature) são usados por quais features.

| Componente/hook compartilhado | Origem | Features consumidoras |
|---|---|---|
| `Button` | `components/ui` | Todas as 15 features com UI (auth, landing, demands, contracts, dashboard, professional-dashboard, professional, chat, wallet, notifications, reviews, settings, admin) |
| `Card` | `components/ui` | auth, dashboard, professional-dashboard, professional (ProfessionalCard), wallet, notifications (lista), settings, admin |
| `Skeleton` | `components/ui` | landing, demands, contracts, dashboard, professional-dashboard, professional, chat, wallet, notifications, reviews, uploads (via ImageUpload) |
| `EmptyState` | `components/ui` | landing, demands, contracts, dashboard, professional-dashboard, professional, chat, wallet, notifications, reviews, pages (Forbidden, NotFound) |
| `Modal` | `components/ui` | demands (não — usa overlay próprio), contracts (DisputeDialog, PaymentDialog), wallet (WithdrawDialog), settings (DeleteAccountPanel), admin (ReportsTable, DisputesTable), layout (CommandPalette) |
| `Badge` | `components/ui` | demands, contracts, professional, notifications, admin |
| `Avatar` | `components/ui` | layout (ProfileMenu), dashboard (DashboardFavoritesWidget), professional (ProfessionalCard, ProfessionalProfileHeader) |
| `ImageUpload` | `components/ui` | demands (DemandForm), professional (PortfolioManager) |
| `Tooltip` | `components/ui` | layout (Sidebar) — único consumidor |
| `Drawer` | `components/ui` | nenhum consumidor |
| `Toast`/`useToast` | `components/ui` | `ImageUpload` (único consumidor real; `ToastProvider` montado globalmente em `AppShell`) |
| `formatCurrency`, `formatDate`, `cn` | `lib/utils` | demands, contracts, dashboard, professional-dashboard, wallet, reviews |
| `http` | `lib/http` | camada `api.ts` de todas as 15 features |
| `useAuthStore` | `stores/auth` | router (ProtectedRoute, HomeRoute), layout (Sidebar, MobileNav, ProfileMenu, CommandPalette), contracts (ContractDetailPage), chat (ChatWindow), lib/http.ts |
| `ReviewForm` | `features/reviews` | contracts (ContractDetailPage) |
| `ReviewList` | `features/reviews` | professional (PublicProfilePage), professional-dashboard (DashboardReviewsWidget) |
| `FavoriteButton` | `features/favorites` | professional (ProfessionalCard, ProfessionalProfileHeader) |
| `useFavoriteIds` | `features/favorites` | landing (ProfessionalResults), professional (PublicProfilePage) |
| `ProfessionalCard` | `features/professional` | landing (ProfessionalResults) |
| `useCreateRoom` | `features/chat` | demands (QuoteCard), contracts (ContractDetailPage), professional (ProfessionalProfileHeader) |
| `useCategories`/`professionalApi.listPublicCategories` | `features/professional` | landing (CategoryGrid, SearchFilters) |
| `useWallet` | `features/wallet` | contracts (PaymentDialog), professional-dashboard (DashboardRevenueWidget) |
| `useContracts` | `features/contracts` | dashboard (DashboardContractsWidget, DashboardScheduleWidget), professional-dashboard (DashboardAgendaWidget, DashboardActiveContractsWidget) |
| `useDemands` | `features/demands` | dashboard (DashboardDemandsWidget), layout (CommandPalette) |
| `useMyProfile`/`usePublicProfile` | `features/professional` | professional-dashboard (3 widgets), dashboard (DashboardFavoritesWidget via FavoriteProfessionalPreview), demands (QuoteCard), professional (ServiceAreaManager) |

---

## 15. Relação entre Telas

Tabela consolidada de quais telas linkam/navegam para quais outras (ver detalhamento passo a passo na seção 13 — Mapa de Navegação).

| Tela de origem | Telas de destino | Mecanismo |
|---|---|---|
| LandingPage (`/`) | SearchPage (`/search`) | `SearchBar` submit, clique em `CategoryGrid` |
| SearchPage (`/search`) | PublicProfilePage (`/professionals/:id`) | Clique em `ProfessionalCard` |
| LoginPage (`/login`) | RegisterPage, ForgotPasswordPage, HomeRoute (`/`) | Links + `navigate` pós-sucesso |
| RegisterPage (`/register`) | LoginPage, VerifyEmailPage | Link + `navigate` pós-sucesso |
| ForgotPasswordPage (`/forgot-password`) | — | Sem navegação de saída |
| ResetPasswordPage (`/reset-password`) | LoginPage | `navigate` pós-sucesso |
| VerifyEmailPage (`/verify-email`) | LoginPage, HomeRoute (`/`) | Link + `navigate` pós-skip |
| PublicProfilePage (`/professionals/:id`) | PublishDemandPage (`/demands/new?professionalId=`), ChatPage (`/chat/:roomId`) | Botões "Contratar"/"Chat" |
| ClientDashboardPage (`/`) | PublishDemandPage, SearchPage, ContractListPage, DemandListPage, DemandDetailPage, NotificationsPage, PublicProfilePage | Botões de ação rápida + links de widgets |
| ProfessionalDashboardPage (`/professional/dashboard`) | DemandListPage, ContractListPage, ProfessionalProfileEditPage, ContractDetailPage | Botões de ação rápida + links de widgets |
| DemandListPage (`/demands`) | PublishDemandPage, DemandDetailPage | CTA do EmptyState + clique em `DemandCard` |
| PublishDemandPage (`/demands/new`) | DemandDetailPage | `navigate` pós-sucesso |
| DemandDetailPage (`/demands/:id`) | ChatPage (`/chat/:roomId`) | Botão "Conversar" em `QuoteCard` (via `useCreateRoom`) |
| ContractListPage (`/contracts`) | ContractDetailPage (`/contracts/:id`) | Clique em `ContractListItem` |
| ContractDetailPage (`/contracts/:id`) | ChatPage (`/chat/:roomId`) | Botão "Chat" (via `useCreateRoom`) |
| WalletPage (`/wallet`) | — (modal `WithdrawDialog`, sem navegação) | — |
| NotificationsPage (`/notifications`) | — | Sem navegação de saída (apenas ação "Marcar lida") |
| ChatIndexPage (`/chat`) | — | Sem navegação (estado vazio estático) |
| ChatPage (`/chat/:roomId`) | — | Sem navegação de saída própria |
| SettingsPage (`/settings`) | — | Sem navegação de saída (modais internos) |
| AdminDashboardPage (`/admin`) | — | Sem navegação de saída (modais internos) |
| Topbar (global) | SettingsPage, NotificationsPage, LoginPage (logout) | `ProfileMenu`, `NotificationBell` |
| Sidebar/MobileNav (global) | Conforme `navByRole` (ver seção 3.2 do documento 01) | Itens de menu por papel |
| Qualquer rota | Forbidden (`/forbidden`) | `ProtectedRoute` (role incompatível) |
| Qualquer rota | LoginPage (`/login`) | `ProtectedRoute` (sem sessão) |
| Rota inexistente | NotFound | Path `*` |

---

## 16. Dependências

### 16.1 Bibliotecas/pacotes usados (confirmados nos 12 domínios)

| Pacote | Uso |
|---|---|
| `react` | Framework base |
| `react-dom` | `createPortal` (Modal, Drawer, Toast, CommandPalette) |
| `react-router-dom` | Roteamento (`createBrowserRouter`, `RouterProvider`, `Outlet`, `Navigate`, `Link`, `useNavigate`, `useParams`, `useSearchParams`) |
| `@tanstack/react-query` | Estado de servidor em todas as features (`useQuery`, `useMutation`, `useQueryClient`) |
| `zustand` | Estado global (`auth`, `sidebar`, `commandPalette`, `Toast`); usa middleware `persist` apenas em `sidebar` |
| `react-hook-form` | Formulários em auth, demands (DemandForm, QuoteForm), contracts (ProgressUpdateForm, DisputeDialog), professional (ProfileForm), wallet (WithdrawDialog), reviews (ReviewForm), settings (PreferencesForm), landing (SearchBar) |
| `@hookform/resolvers/zod` | Ponte entre react-hook-form e zod, mesmas features acima |
| `zod` | Validação de formulário (mesmas features) e validação de resposta de API em runtime (`notifications`, `admin`) |
| `axios` | Cliente HTTP (`lib/http.ts`), com verificação `axios.isAxiosError` em `contracts/api.ts` (tratamento de 404 em `fetchPayment`) |
| `socket.io-client` | Tempo real, exclusivo da feature `chat` (`socket.ts`) |
| `@heroicons/react/24/outline` e `/24/solid` | Ícones em praticamente toda feature |
| Tailwind CSS | Estilização (config customizada: breakpoint `nav`, cores via `oklch()`, `boxShadow`, `zIndex` nomeado) |
| `Intl.NumberFormat`/`Intl.DateTimeFormat` (nativo) | Formatação de moeda/data (`lib/utils.ts`, `WalletRevenueChart`) |

Não identificadas: bibliotecas de gráficos, i18n (`react-intl`/`next-intl`), gerenciamento de formulário alternativo (Formik), CSS-in-JS, testes E2E (apenas testes unitários/integração `*.test.tsx` mencionados).

### 16.2 Dependências entre features (quem depende de quem)

| Feature | Depende de (features) |
|---|---|
| `landing` | `professional` (ProfessionalCard, useCategories), `favorites` (useFavoriteIds) |
| `demands` | `professional` (usePublicProfile em QuoteCard), `chat` (useCreateRoom em QuoteCard) |
| `contracts` | `wallet` (useWallet em PaymentDialog), `chat` (useCreateRoom), `reviews` (ReviewForm) |
| `dashboard` (cliente) | `demands` (useDemands), `contracts` (useContracts), `favorites` (useFavorites + usePublicProfile via FavoriteProfessionalPreview), `notifications` (useNotifications), `professional` (usePublicProfile) |
| `professional-dashboard` | `contracts` (useContracts), `professional` (useMyProfile, useSlots), `wallet` (useWallet, useTransactions), `reviews` (useProfessionalReviews via ReviewList) |
| `professional` | `favorites` (FavoriteButton), `chat` (useCreateRoom em ProfessionalProfileHeader), `reviews` (ReviewList em PublicProfilePage) |
| `uploads` | Nenhuma (é consumida por `demands` e `professional`, não depende de outras) |
| `settings`, `admin`, `chat`, `wallet`, `notifications`, `reviews`, `favorites`, `auth` | Não dependem de outras features de domínio (apenas de `components/ui`, `lib`, `stores`) |

### 16.3 Componentes compartilhados vs. duplicação de lógica observada

- `STATUS_LABELS` (mapa de tradução de status) está duplicado, com conteúdo idêntico, em `ContractListPage.tsx` e `ContractDetailPage.tsx` (feature `contracts`).
- Existem **dois** componentes chamados `DashboardQuickActions` (um em `features/dashboard`, outro em `features/professional-dashboard`), com botões e destinos diferentes — mesmo nome, features distintas, sem componente compartilhado entre eles.
- `formatCurrency`/`formatDate` (compartilhados, `lib/utils.ts`) coexistem com implementações locais equivalentes: `DemandCard` usa uma função `currency` local (em vez do helper compartilhado usado por `QuoteCard`); `NotificationsPage` formata data inline via `toLocaleString('pt-BR')` em vez de usar `formatDate`.

---

## 17. Pontos de Acoplamento

> Constatação factual de acoplamentos observados nos arquivos de domínio, sem sugestão de correção.

1. **`ServiceAreaManager` (professional) não tem endpoint dedicado**: a lista de áreas de atendimento do próprio usuário é obtida reaproveitando `usePublicProfile(profile?.id)` — o mesmo endpoint `GET /professionals/:id` usado pela tela pública (`PublicProfilePage`) — em vez de uma query "minhas áreas" dedicada.
2. **`PublishDemandPage` chama `inviteProfessional` diretamente de `api.ts`**, contornando o hook `useInviteProfessional` já existente em `queries.ts` da mesma feature; o erro dessa chamada é silenciado por um `catch {}` vazio.
3. **`DashboardScheduleWidget` (dashboard cliente) e `DashboardAgendaWidget` (professional-dashboard) reutilizam `useContracts()`** (mesma query key `['contracts']`) que também alimenta `DashboardContractsWidget`/`DashboardActiveContractsWidget` — cache compartilhado, mas o hook é invocado de forma independente em múltiplos widgets.
4. **`useMyProfile()` é chamado de forma independente em três pontos** dentro de `professional-dashboard` (`DashboardAgendaWidget`, `DashboardProfileSummaryCard`, `DashboardReviewsWidget`) e também dentro de `ProfessionalProfileEditPage`, `ProfileForm` e `ServiceAreaManager` — mesma query key, cache compartilhado, mas múltiplos pontos de código disparando o hook.
5. **`WalletRevenueChart` dispara sua própria chamada `useTransactions(1, 100)`**, independente e duplicada em relação à chamada `useTransactions(1)` (limit 20) feita por `WalletPage` para a `TransactionList` — duas requisições HTTP distintas ao mesmo endpoint `GET /wallet/transactions`.
6. **`DashboardFavoritesWidget` gera um padrão N+1 de queries**: cada favorito retornado dispara sua própria chamada `usePublicProfile` via `FavoriteProfessionalPreview`.
7. **`InviteProfessionalDialog` não reutiliza o componente `Modal` compartilhado** nem os tokens de cor do design system (usa `bg-white`, `bg-slate-900`, overlay `fixed inset-0 bg-black/40` próprio) — diverge dos demais modais da aplicação (`DisputeDialog`, `PaymentDialog`, `WithdrawDialog`, `DeleteAccountPanel`, `ReportsTable`, `DisputesTable`), todos construídos sobre `Modal` com tokens (`bg-bg`, `bg-ink/40`).
8. **`DemandForm`, `QuoteForm` e `InviteProfessionalDialog` usam paleta de cores utilitária "crua"** (`slate-*`, `red-600`, `bg-white`) em vez dos tokens de design system (`ink`, `muted`, `surface`, `accent`, `bg`) usados no restante da feature `demands` e da aplicação em geral.
9. **`ContractDetailPage` não verifica posse do contrato** para exibir os botões "Convidar profissional" (herdado de `DemandDetailPage`), "Abrir disputa" e "Chat" — esses ficam disponíveis a qualquer usuário autenticado que acesse a URL, independentemente de `role` ou de ser parte do contrato/demanda.
10. **`canReview` (ContractDetailPage) não verifica se o usuário é de fato parte do contrato** — apenas checa `role` (`client`/`professional`) e `status === 'completed'`.
11. **Rotas `/professional/dashboard` e `/professional/profile` não têm restrição de `roles`** no router — tecnicamente acessíveis por `client`/`admin` via URL direta, ainda que a navegação normal (via `navConfig.ts`) só leve profissionais até elas.
12. **O token de autenticação do socket (`chat/socket.ts`) é lido apenas na criação da instância** (`useAuthStore.getState().accessToken`, chamada síncrona não reativa) — uma renovação de token via `refreshAccessToken()` (em `lib/http.ts`) não é propagada ao socket já conectado.
13. **`ChatWindow` não emite `leave_room`** ao desmontar/trocar de sala — o socket (singleton em nível de módulo) permanece "juntado" a todas as salas visitadas na sessão, do ponto de vista do transporte.
14. **`createRoom`/`useCreateRoom` está definido na feature `chat`**, mas nenhuma tela dentro da própria feature `chat` o consome — é usado exclusivamente por `demands`, `contracts` e `professional`, criando uma dependência de "mão única" onde `chat` é consumida por três outras features sem consumir nenhuma delas de volta (exceto `stores/auth` para o token do socket).
15. **`Toast`/`useToast` (infraestrutura montada globalmente em `AppShell`) tem consumo real restrito a `ImageUpload.tsx`** — nenhuma outra mutation da aplicação (favoritar, avaliar, pagar, sacar, registrar progresso, etc.) dispara um toast, mesmo a infraestrutura estando disponível globalmente.
16. **`Tooltip` (componente genérico e reutilizável) tem uso real restrito à `Sidebar`** (itens colapsados) — não é consumido por nenhuma feature de domínio.
17. **`Drawer` (componente genérico) não tem nenhum consumidor** em `features/` ou `pages/` — existe na camada de UI mas não é usado em nenhuma tela documentada.
18. **`useWithdrawals()` e `useFavorites()` existem nas camadas de dados de `wallet` e `favorites` respectivamente, mas não têm consumidor de UI** identificado — não há tela de histórico de saques nem de lista de favoritos.
19. **Duplicação de query entre widgets do dashboard profissional**: `useContracts()` é chamado de forma independente tanto em `DashboardAgendaWidget` quanto em `DashboardActiveContractsWidget` (mesma key, cache compartilhado, hook invocado duas vezes).

---

# 08 — Conclusão

> Resumo factual do estado documentado nos 12 arquivos de domínio e nos 7 arquivos de síntese anteriores. Sem opinião de qualidade, sem sugestão de redesign ou correção — apenas consolidação do que foi observado.

---

## 18. Conclusão

### 18.1 Escopo coberto pela auditoria

Este conjunto de documentos cobre a totalidade do frontend da aplicação (React + TypeScript), organizado em 12 domínios de feature (`00-foundation` a `11-settings-admin-uploads`) e sintetizado em 8 arquivos transversais (`01` a `08`). Foram documentadas:

- **22 rotas** registradas em `router/index.tsx`, cobrindo **25 telas** (incluindo `HomeRoute` como roteador condicional e as variações de renderização de `/` por papel).
- **43 componentes de feature** (sem contar primitivos de UI e subcomponentes internos não exportados), mais **11 primitivos de UI compartilhados** (`components/ui/`) e **6 componentes de layout** (`components/layout/`).
- **~60 hooks de dados** (React Query) distribuídos em 15 features, mais **4 stores Zustand** e **3 hooks utilitários customizados**.
- **22 formulários** identificados (11 usando `react-hook-form` + `zod`, 9 usando `useState` cru sem schema de validação, 1 usando envio via socket sem validação de biblioteca).
- **10 modais**, dos quais 7 constroem-se sobre o componente `Modal` compartilhado e 1 (`InviteProfessionalDialog`) implementa overlay próprio.
- **21 "cards"** de apresentação, nem todos implementados sobre o componente `Card` primitivo.

### 18.2 Papéis de usuário e suas rotas exclusivas

O sistema define três papéis (`client`, `professional`, `admin`) na store `stores/auth.ts`. Das 22 rotas registradas, apenas 2 têm restrição de papel no nível de rota: `/demands/new` (exclusiva de `client`) e `/admin` (exclusiva de `admin`). Todas as demais rotas autenticadas — incluindo `/professional/dashboard` e `/professional/profile`, que na navegação normal só são alcançadas por profissionais — são tecnicamente acessíveis por qualquer usuário autenticado, com diferenciação de comportamento (quando existe) implementada dentro do próprio componente, não no roteador.

### 18.3 Padrões arquiteturais consistentes observados

- Estrutura de camadas repetida em quase toda feature: `api.ts` → `queries.ts` → `schemas.ts` (quando há formulário/validação de runtime) → `components/` → `pages/` (quando aplicável).
- Estado de servidor tratado majoritariamente via TanStack Query; estado de cliente global via Zustand (sem uso de Context API do React para esses fins).
- Autenticação: `accessToken`/`user` mantidos apenas em memória (store não persistida); somente `refreshToken` persiste em `localStorage`. Sessão é restaurada a cada carregamento via `bootstrapSession()`.
- Navegação lateral/inferior (`Sidebar`/`MobileNav`) e Command Palette compartilham a mesma fonte de itens de navegação por papel (`lib/navConfig.ts`).
- Único uso de WebSocket em toda a aplicação é a feature `chat` (`socket.io-client`), com uma instância singleton por sessão de página.
- Único gráfico de dados em toda a aplicação (`WalletRevenueChart`) é implementado manualmente com `div`s e CSS, sem biblioteca de charting.

### 18.4 Padrões transversais de tratamento de estado

- **Loading**: padrão dominante é `Skeleton` (componente compartilhado) enquanto a query está pendente.
- **Vazio**: padrão dominante é `EmptyState` (componente compartilhado), geralmente só com `title`.
- **Erro de rede/API**: na esmagadora maioria das telas e componentes documentados nos 12 domínios, não há tratamento explícito de `isError`/`error` das queries — o efeito observado é a permanência no estado de loading (quando a condição de exibição depende de `data` estar ausente) ou o mascaramento do erro como "lista vazia" (`EmptyState`). As exceções documentadas com tratamento explícito de erro são: `PaymentDialog` (contracts), `ReviewForm` (erro 409 de avaliação duplicada), `WithdrawDialog` (não trata erro de mutation, mas trata erro de validação de campo).
- **Toasts**: a infraestrutura (`Toast`/`useToast`, montada globalmente em `AppShell`) tem consumo real restrito a `ImageUpload.tsx` — nenhuma outra ação do sistema (favoritar, pagar, sacar, registrar progresso, abrir disputa, etc.) dispara notificação toast.
- **Paginação**: as APIs de várias features (`demands`, `wallet` transactions, `notifications`, `reviews`, `favorites`, `admin` reports/disputes) já retornam `page`/`limit`/`total`, mas nenhuma tela documentada implementa controles de paginação de UI — todas operam sobre uma única página fixa (geralmente página 1).

### 18.5 Fluxos funcionais documentados

Foram descritos 17 fluxos funcionais ponta a ponta (seção 12 do documento `05-fluxos-funcionais.md`): login, cadastro, recuperação de senha, publicação de demanda, busca de profissionais, contratação (orçamento → aceite), execução do serviço, pagamento, carteira, saque, chat, notificações, disputa, administração/moderação, configurações, edição de perfil profissional e favoritar profissional — todos citando telas e componentes reais identificados nos arquivos de domínio.

### 18.6 Dependências entre features

Das 15 features de domínio, `chat`, `favorites`, `reviews` e `professional` funcionam como features "fornecedoras" — expõem componentes/hooks consumidos por múltiplas outras features (`demands`, `contracts`, `landing`, `dashboard`, `professional-dashboard`) — sem, no sentido inverso, dependerem dessas consumidoras. `wallet` é consumida por `contracts` (pagamento) e `professional-dashboard` (receita). `settings`, `admin`, `notifications` e `auth` não têm dependências de outras features de domínio além de `components/ui`, `lib` e `stores`.

### 18.7 Pontos de acoplamento e duplicação registrados

A seção 17 do documento `07-relacoes-dependencias-acoplamento.md` lista 19 pontos factuais de acoplamento e/ou duplicação de lógica observados diretamente no código-fonte dos 12 domínios — incluindo reaproveitamento de endpoints entre telas com propósitos distintos (`ServiceAreaManager`/`PublicProfilePage` compartilhando `GET /professionals/:id`), chamadas de API que contornam a camada de hooks (`PublishDemandPage`), múltiplas invocações independentes do mesmo hook de query em um mesmo dashboard, um modal que não reutiliza o componente `Modal` compartilhado (`InviteProfessionalDialog`), e componentes de infraestrutura genérica (`Toast`, `Tooltip`, `Drawer`) com consumo real concentrado em um único ponto ou inexistente.

### 18.8 Escopo não coberto / lacunas identificadas nos próprios domínios

Os seguintes itens foram registrados nos arquivos de domínio como existentes na camada de dados mas sem consumidor de UI: `useSetCategories`/`useSetTags` (professional), `useWithdrawals` (wallet — sem tela de histórico de saques), `useFavorites` (favorites — sem tela de "Meus favoritos"; apenas `useFavoriteIds` é consumido). `ChatIndexPage` não implementa listagem real de conversas, funcionando como estado vazio estático fixo.

---

Este conjunto de 8 documentos de síntese, em conjunto com os 12 arquivos de domínio em `docs/frontend-audit/domains/`, constitui a documentação completa das 18 seções solicitadas para o estado atual do frontend, conforme estrutura definida no índice mestre (`00-INDICE.md`).
