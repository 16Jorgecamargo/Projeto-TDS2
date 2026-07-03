# Fase 5 do Redesign Frontend — Chat, Notificações, Admin, Configurações

## Contexto

Fases 1-4 do redesign frontend já mescladas na master:
- Fase 1: Design System (tokens, primitivos `Card`/`Badge`/`Button`/`Modal`/`Skeleton`/`EmptyState`/`Avatar`/`Drawer`/`Toast`/`Tooltip`/`ImageUpload`) + Shell/Nav (`AppShell`, `Topbar`, `Sidebar`, `MobileNav`, `CommandPalette`).
- Fase 2: Dashboard Cliente, Demandas, Busca, Perfil Público.
- Fase 3: Dashboard Profissional.
- Fase 4: Contratos, Pagamento, Avaliação, Carteira.

As quatro áreas que faltavam ser tocadas pelo redesign — Chat, Notificações, Admin, Configurações — fecham o redesign completo do frontend. Todas as quatro têm dados e hooks já funcionando (`fetchMessages`, `useChatSocket`, `useNotifications`, `useMarkNotificationRead`, `useReports`, `useResolveReport`, `useDisputes`, `useResolveDispute`, `usePreferences`, `useUpdatePreferences`, `useConsents`, `useRecordConsent`, `useDeletionStatus`, `useRequestDeletion`, `useCancelDeletion`) — nenhuma têm gap de dado, só estilo antigo (Tailwind cru: `bg-white`, `text-gray-500`, `rounded-2xl shadow`, `bg-blue-600`, `bg-red-500` etc, sem os tokens/primitivos da Fase 1).

## Escopo

Restyle das 4 áreas usando exclusivamente os tokens e primitivos já existentes do design system (`Card`, `Badge` com tons `neutral`/`urgent`, `Button` com variantes `primary`/`accent`/`ghost`, `Modal`, `Skeleton`, `EmptyState`, `Avatar`). **Nenhum componente novo de design system.** **Nenhuma dependência de runtime nova.** **Nenhuma mudança de schema/endpoint no backend** — todos os dados já estão disponíveis e ligados no frontend.

Única exceção de comportamento (não é mudança de API, é exposição de campo já aceito): `ReportsTable` e `DisputesTable` passam a abrir um `Modal` de confirmação com um campo de nota opcional/obrigatório antes de disparar a resolução, usando os hooks `useResolveReport`/`useResolveDispute` que já aceitam esse parâmetro `note` — a tela simplesmente nunca expôs esse campo até agora.

### Fora de escopo
- Qualquer endpoint ou schema novo no backend.
- Listagem de salas de chat (`ChatIndexPage` continua sempre em `EmptyState` — não existe endpoint de listagem de rooms; navegação pro chat só acontece via botão de contrato, que já chama `useCreateRoom` e redireciona pro `roomId`).
- Adicionar nav global pra `/settings` ou `/notifications` (decisão de nav já resolvida nas fases anteriores: `NotificationBell` já está no `Topbar`; `/settings` não tem link no menu principal hoje e isso não muda nesta fase).

## Decisões de design

### Chat
- `ChatIndexPage`: mantém `EmptyState` (já usado), ajusta espaçamento/tipografia pros tokens padrão de página.
- `ChatWindow`: bolhas de mensagem trocam cores cruas (`bg-blue-600`/`bg-gray-100`) por tokens do design system (mensagem própria: `bg-accent text-white`; mensagem do outro: `bg-surface text-ink`). Container vira `Card`. Loading vira `Skeleton`. Lista vazia usa `EmptyState`.
- `ChatPage`: header com o mesmo padrão de título (`text-2xl font-semibold`) já usado em `ContractListPage`/`WalletPage`.

### Notificações
- `NotificationsPage`: lista vira `Card` com itens internos, `Skeleton` no loading, `EmptyState` se vazio, badge de item não-lido via `Badge tone="urgent"`, botão "Marcar lida" vira `Button` variante `ghost`.
- `NotificationBell`: ícone recolorido pro token de cor do `Topbar` (mesmo tom dos outros ícones do header). O contador de não-lidas mantém o formato de pill customizado (não é o componente `Badge`, que é pensado pra rótulo de texto, não contador numérico posicionado sobre ícone) mas troca a cor crua `bg-red-500` pelo token de accent do design system.

### Admin
- `AdminDashboardPage`: as duas seções (Denúncias, Disputas) viram `Card`s.
- `ReportsTable`/`DisputesTable`: coluna de status vira `Badge` — tom `urgent` para status que ainda demandam ação (`pending` em denúncias; `open`/`under_review` em disputas), tom `neutral` para status finalizados (`reviewed`/`dismissed`/`actioned` em denúncias; `resolved`/`rejected` em disputas) — mesmo padrão de "badge de duas cores colapsando múltiplos status" já usado em `ContractListPage` (Fase 4). Botões de ação viram `Button`. Cada ação de resolução abre um `Modal` de confirmação contendo: o rótulo da ação escolhida, um campo de texto (`textarea`) opcional pra nota, e um botão de confirmar que dispara a mutation já existente com o `note` preenchido (ou `undefined`/string vazia se o admin não escrever nada). Isso é o mesmo padrão já usado em `PaymentDialog`/`DisputeDialog` (Fase 4).

### Configurações
- `SettingsPage`: três seções (`PreferencesForm`, `ConsentsPanel`, `DeleteAccountPanel`) cada uma em `Card` separado.
- `PreferencesForm`: inputs de texto e checkboxes com tokens de borda/cor do design system, botão de salvar vira `Button`.
- `ConsentsPanel`: lista de consentimentos em `Card`, checkboxes com token de cor.
- `DeleteAccountPanel`: botão "Solicitar exclusão" abre um `Modal` de confirmação (ação destrutiva, mesmo padrão de cancelamento de contrato na Fase 4) antes de disparar `request.mutate()`. O botão "Cancelar exclusão" (quando já há exclusão agendada) não precisa de confirmação adicional — cancelar uma exclusão agendada é uma ação segura, não destrutiva.

## Testes

Cada componente restilizado mantém os testes de comportamento já existentes (ex: `NotificationsPage.test.tsx` já testa "marcar lida") e ganha os testes novos que a mudança de interação exige — principalmente os `Modal`s novos em `ReportsTable`/`DisputesTable`/`DeleteAccountPanel`, que precisam de teste cobrindo: abrir modal ao clicar na ação, cancelar sem disparar mutation, confirmar disparando a mutation com o payload esperado (incluindo o campo `note` quando preenchido). TDD estrito em todas as tasks, mesmo padrão das Fases 2-4.

## Constraints globais (herdadas do projeto)

- Sem comentários no código.
- Identificadores e nomes de arquivo em inglês; copy de UI em português.
- Commits em português, sem trailer `Co-Authored-By`.
- Sem PR — merge direto na `master` (dev solo).
- Sem dependências novas de runtime.
- Apenas os primitivos de UI já existentes (`Card`, `Badge`, `Button`, `Modal`, `Skeleton`, `EmptyState`, `Avatar`) — nenhum componente novo de design system nesta fase.
