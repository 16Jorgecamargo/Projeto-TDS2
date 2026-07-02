# Telas do Frontend — Services Marketplace

## Sobre o projeto

**Services Marketplace** é um marketplace de serviços gerais que conecta **clientes** (quem precisa de um serviço) a **profissionais** (quem presta o serviço), com um **admin** moderando a plataforma.

Fluxo principal: cliente publica uma demanda → profissionais enviam orçamentos → cliente aceita um orçamento → vira contrato → execução com atualizações de progresso → pagamento (via carteira interna) → avaliação mútua → carteira do profissional é creditada (descontada a taxa da plataforma) → profissional saca.

Recursos adicionais: chat em tempo real, notificações (push + in-app + e-mail), favoritos, bloqueio de usuários, denúncias, disputas de contrato (mediadas pelo admin), convites diretos de profissional para uma demanda, LGPD (consentimentos rastreados, exclusão de conta com carência).

**Stack:** backend Node.js/Fastify 5/TypeORM/MySQL/Redis+BullMQ/socket.io; frontend React 19/Vite/TanStack Query/Zustand/Tailwind. Monorepo (`backend/` + `frontend/`), Docker Compose. Detalhes completos em `docs/superpowers/specs/2026-07-01-services-marketplace-design.md`.

Este documento cobre especificamente **as telas do frontend** (rotas, campos, ações). Inventário gerado a partir do código-fonte em `frontend/src/`.

Todas as telas são renderizadas dentro do shell global `components/Layout.tsx`: header fixo com o título "Services Marketplace" (sem menu de navegação — nenhum link global para wallet/notifications/chat/admin está fixado no header hoje) + `<main>` centralizado (`max-w-6xl`).

Grupos de rota (`router/index.tsx`):
- **Públicas**: sem autenticação.
- **Protegidas (qualquer papel)**: dentro de `<ProtectedRoute />` sem `roles` — exige apenas login.
- **Protegidas por papel**: `<ProtectedRoute roles={[...]} />` — exige papel específico (`client`, `professional`, `admin`).

---

## 1. Landing Page

**Rota:** `/` · **Acesso:** pública · **Arquivo:** `features/landing/pages/LandingPage.tsx`

Tela inicial de busca.

- Título "Encontre o profissional certo".
- `SearchBar`: formulário com campo de texto livre ("O que você precisa?"), campo Cidade, campo UF (2 letras, maiúsculo automático), botão Buscar → navega para `/search?q=&city=&state=`.
- `CategoryGrid`: grade 2/4 colunas com as categorias ativas (`useCategories`), cada uma linkando para `/search?categoryId=`.

---

## 2. Busca de Profissionais

**Rota:** `/search` · **Acesso:** pública · **Arquivo:** `features/landing/pages/SearchPage.tsx`

- Reaproveita `SearchBar` no topo.
- `ProfessionalResults`: lê `q`, `city`, `state`, `categoryId` da querystring, chama `useSearchProfessionals`, renderiza grade de `ProfessionalCard` (headline, bio, valor/hora ou "Sob consulta", nota média + contagem de avaliações), cada card linka para `/professionals/:id`.
- Estados: carregando, erro, lista vazia ("Nenhum profissional encontrado").

---

## 3. Login

**Rota:** `/login` · **Acesso:** pública · **Arquivo:** `features/auth/pages/LoginPage.tsx`

Formulário (`react-hook-form` + Zod):
- Campo E-mail, campo Senha (via `AuthField`, com mensagem de erro inline por campo).
- Erro genérico "Credenciais inválidas" se a mutation falhar.
- Botão "Entrar" (desabilitado durante envio, texto muda para "Entrando...").
- Links: "Criar conta" (`/register`), "Esqueci a senha" (`/forgot-password`).
- Sucesso → navega para `/`.

## 4. Cadastro

**Rota:** `/register` · **Acesso:** pública · **Arquivo:** `features/auth/pages/RegisterPage.tsx`

Formulário: Nome, E-mail, Telefone, Senha, Confirmar senha, seletor **Perfil** (`client` ou `professional`, padrão `client`). Erro genérico se falhar. Sucesso → navega para `/verify-email`. Link "Já tenho conta" (`/login`).

## 5. Verificação de E-mail

**Rota:** `/verify-email?token=` · **Acesso:** pública · **Arquivo:** `features/auth/pages/VerifyEmailPage.tsx`

Sem formulário — lê `token` da URL e chama `authApi.verifyEmail` automaticamente ao montar (evita reenviar o mesmo token via `useRef`). Estados exibidos: sem token ("Abra o link enviado ao seu e-mail"), pendente ("Confirmando..."), sucesso ("E-mail confirmado!" em verde), erro ("Token inválido ou expirado" em vermelho). Link "Ir para o login".

## 6. Esqueci a Senha

**Rota:** `/forgot-password` · **Acesso:** pública · **Arquivo:** `features/auth/pages/ForgotPasswordPage.tsx`

Formulário: campo E-mail + botão Enviar. Mensagem de sucesso genérica ("Se o e-mail existir, enviamos as instruções") — não revela se o e-mail existe.

## 7. Redefinir Senha

**Rota:** `/reset-password?token=` · **Acesso:** pública · **Arquivo:** `features/auth/pages/ResetPasswordPage.tsx`

Se não houver `token` na URL: mensagem "Link de redefinição inválido ou incompleto". Com token: campo oculto (token), campo Nova senha, campo Confirmar senha, botão Redefinir. Erro "Token inválido ou expirado". Sucesso → navega para `/login`.

## 8. Página 403 (placeholder)

**Rota:** `/forbidden` · **Acesso:** pública · **Arquivo:** inline no router (`<div />`) — tela vazia, sem conteúdo implementado ainda.

---

## 9. Perfil Público do Profissional

**Rota:** `/professionals/:id` · **Acesso:** pública · **Arquivo:** `features/professional/pages/PublicProfilePage.tsx`

- Carregando / "Perfil não encontrado" conforme `usePublicProfile`.
- Título = headline do profissional; bio (se houver); nota média + contagem de avaliações.
- Seção "Áreas de atendimento": lista cidade/UF (`serviceAreas`).
- Seção "Portfólio": lista de títulos de trabalhos (`usePortfolio`).

---

## 10. Configurações da Conta

**Rota:** `/settings` · **Acesso:** protegida (qualquer papel) · **Arquivo:** `features/settings/pages/SettingsPage.tsx`

Três painéis empilhados:

- **`PreferencesForm`** — campos Idioma, Fuso horário (texto livre), checkboxes: notificações por e-mail, push, SMS. Botão Salvar.
- **`ConsentsPanel`** (LGPD) — checkbox por tipo de consentimento (`Termos de uso`, `Política de privacidade`, `Comunicações de marketing`, `Tratamento de dados pessoais`); ao marcar/desmarcar grava novo registro de consentimento (versão fixa `2026-07-01`); histórico de consentimentos abaixo (tipo, concedido/revogado, data).
- **`DeleteAccountPanel`** — se já houver exclusão agendada: mostra data e botão "Cancelar exclusão"; senão: botão vermelho "Solicitar exclusão".

---

## 11. Painel do Profissional

**Rota:** `/professional/dashboard` · **Acesso:** protegida (qualquer papel logado) · **Arquivo:** `features/professional/pages/ProfessionalDashboardPage.tsx`

Quatro seções empilhadas:

- **`ProfileForm`** — Título (headline), Biografia (textarea), Anos de experiência, Valor por hora (R$), Raio de atendimento (km). Botão "Salvar perfil" (upsert).
- **`PortfolioManager`** — campo de texto (título do trabalho) + botão Adicionar; lista de itens existentes com botão Remover por item.
- **`AvailabilityManager`** — seletor de dia da semana (domingo–sábado), hora início, hora fim, botão Adicionar; lista de slots existentes ("Segunda 08:00-18:00" etc.) com botão Remover.
- **`ServiceAreaManager`** — campo Cidade + campo UF (2 letras) + botão Adicionar (desabilitado até cidade preenchida e UF com 2 caracteres); lista de áreas com botão Remover.

---

## 12. Publicar Demanda

**Rota:** `/demands/new` · **Acesso:** protegida, **somente `client`** · **Arquivo:** `features/demands/pages/PublishDemandPage.tsx`

`DemandForm`: Categoria (ID), Título, Descrição (textarea), Orçamento mínimo, Orçamento máximo (todos com validação Zod inline). Botão "Publicar demanda". Sucesso → navega para `/demands/:id` da demanda criada.

## 13. Lista de Demandas

**Rota:** `/demands` · **Acesso:** protegida (qualquer papel) · **Arquivo:** `features/demands/pages/DemandListPage.tsx`

Lista de `DemandCard` (título, faixa de orçamento formatada em R$, status em caixa alta) — clique navega para o detalhe.

## 14. Detalhe da Demanda

**Rota:** `/demands/:id` · **Acesso:** protegida · **Arquivo:** `features/demands/pages/DemandDetailPage.tsx`

- Cabeçalho: título da demanda + botão "Convidar profissional" (abre `InviteProfessionalDialog`).
- Descrição.
- Lista de Orçamentos: valor total + status; se o orçamento estiver `pending` e a demanda `open`, botão "Aceitar" por item.
- **`InviteProfessionalDialog`** (modal): campo texto "ID do profissional" + botões Cancelar/Convidar.

---

## 15. Lista de Contratos

**Rota:** `/contracts` · **Acesso:** protegida · **Arquivo:** `features/contracts/pages/ContractListPage.tsx`

Lista de botões-cartão: valor total (R$) + status em caixa alta — clique navega para o detalhe.

## 16. Detalhe do Contrato

**Rota:** `/contracts/:id` · **Acesso:** protegida · **Arquivo:** `features/contracts/pages/ContractDetailPage.tsx`

- Cabeçalho: valor total + status.
- Botão "Concluir contrato" (visível só quando `status === 'active'` e já iniciado).
- Botão "Abrir disputa" (sempre visível, abre `DisputeDialog`).
- **`ProgressUpdateForm`** (visível só se em andamento): textarea Descrição do progresso + campo numérico Percentual + botão "Registrar progresso".
- **`ContractProgress`**: lista cronológica de atualizações (descrição + percentual).
- **`DisputeDialog`** (modal): textarea Motivo + botões Cancelar/"Abrir disputa" (vermelho).

---

## 17. Carteira

**Rota:** `/wallet` · **Acesso:** protegida · **Arquivo:** `features/wallet/pages/WalletPage.tsx`

- Cabeçalho "Carteira" + botão "Sacar" (abre `WithdrawDialog`).
- **`WalletBalanceCard`**: saldo disponível (grande) + saldo pendente, formatados na moeda da carteira.
- **`TransactionList`**: histórico de movimentações — descrição (ou tipo), data/hora, valor colorido (verde `+` para crédito, vermelho `-` para débito). Mensagem "Nenhuma movimentação ainda" se vazio.
- **`WithdrawDialog`** (modal): campo Valor, seletor Método (PIX / Transferência bancária), campo Destino, botões Cancelar/Confirmar.

---

## 18. Notificações

**Rota:** `/notifications` · **Acesso:** protegida · **Arquivo:** `features/notifications/pages/NotificationsPage.tsx`

Lista de notificações in-app: título, corpo (se houver), data/hora formatada; botão "Marcar lida" por item não lido (some após lido). Mensagem "Nenhuma notificação ainda" se vazio.

Componente relacionado (não roteado, mas parte da feature): **`NotificationBell`** — ícone de sino com badge de contagem de não lidas, link para `/notifications`. **Não está atualmente plugado no `Layout.tsx`** (nenhum header/nav global o inclui ainda).

---

## 19. Chat (Conversa)

**Rota:** `/chat/:roomId` · **Acesso:** protegida · **Arquivo:** `features/chat/pages/ChatPage.tsx`

- Sem `roomId`: mensagem "Selecione uma conversa."
- **`ChatWindow`**: histórico de mensagens (bolhas azuis à direita para o usuário atual, cinza à esquerda para o outro participante, com hora), campo de texto + botão Enviar (desabilitado se vazio). Mensagens novas chegam em tempo real via socket.io (`join_room` ao entrar, evento `message` ao receber). Mensagem "Nenhuma mensagem ainda" se vazio.

---

## 20. Painel de Moderação (Admin)

**Rota:** `/admin` · **Acesso:** protegida, **somente `admin`** · **Arquivo:** `features/admin/pages/AdminDashboardPage.tsx`

Duas seções em cartões:

- **`ReportsTable`** (Denúncias): tabela ID/Status/Ação — por linha, botões "Aplicar ação" (resolution `actioned`) e "Descartar" (resolution `dismissed`). "Nenhuma denúncia pendente" se vazio.
- **`DisputesTable`** (Disputas): tabela ID/Status/Ação — por linha, botões "Reembolsar cliente" (outcome `refund_client`), "Liberar profissional" (outcome `release_professional`), "Dividir" (outcome `split`), cada um enviando uma nota fixa pré-preenchida. "Nenhuma disputa em aberto" se vazio.

---

## 21. Página 404

**Rota:** `*` (qualquer rota não mapeada) · **Acesso:** pública · **Arquivo:** `pages/NotFound.tsx`

Tela centralizada com o texto "Página não encontrada". Sem navegação de volta.

---

## Observações de gaps (não implementado ainda)

- `/forbidden` é um placeholder vazio (`<div />`) — sem mensagem, sem link de volta.
- `NotificationBell` existe como componente mas não está integrado ao `Layout.tsx` — usuário só chega em `/notifications` digitando a URL.
- `Layout.tsx` não tem menu de navegação nenhum (sem links para demandas, contratos, carteira, configurações, admin) — navegação depende inteiramente de links internos de cada tela ou da URL direta.
