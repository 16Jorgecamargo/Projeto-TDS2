# Fase 6 do Redesign Frontend — Landing, Busca, Autenticação, Páginas de Erro

## Contexto

Fases 1-5 do redesign frontend já mescladas na master:
- Fase 1: Design System (tokens, primitivos `Card`/`Badge`/`Button`/`Modal`/`Skeleton`/`EmptyState`/`Avatar`/`Drawer`/`Toast`/`Tooltip`/`ImageUpload`) + Shell/Nav (`AppShell`, `Topbar`, `Sidebar`, `MobileNav`, `CommandPalette`).
- Fase 2: Dashboard Cliente, Demandas, Busca (parcial), Perfil Público.
- Fase 3: Dashboard Profissional.
- Fase 4: Contratos, Pagamento, Avaliação, Carteira.
- Fase 5: Chat, Notificações, Admin, Configurações.

Esta é a última fase do redesign. As áreas restantes — Landing Page, parte da Busca de Profissionais, as 5 telas de Autenticação e as páginas de erro (403/404) — fecham o redesign completo do frontend.

Levantamento do estado atual:
- `SearchFilters.tsx` e `ProfessionalResults.tsx` (dentro da feature `landing`) **já usam os tokens da Fase 1** (`text-ink`, `border-surface`, `Skeleton`, `EmptyState`) — não precisam de restyle.
- `LandingPage.tsx`, `SearchBar.tsx`, `CategoryGrid.tsx` e o `<select>` de ordenação em `SearchPage.tsx` ainda usam Tailwind cru (`border`, `hover:border-slate-400`, `bg-slate-900`).
- As 5 páginas de Auth (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`) e o componente compartilhado `AuthField.tsx` usam cores cruas (`slate-*`, `red-600`, `green-600`) e nenhum primitivo do design system.
- A rota `/forbidden` existe no router (`frontend/src/router/index.tsx:38`) mas aponta pra um `<div />` vazio — nunca foi implementada.
- `NotFound.tsx` (404) é só texto centralizado com `text-slate-600`, sem usar nenhum primitivo do design system, fora do `AppShell`.

## Escopo

Restyle das áreas listadas usando exclusivamente os primitivos já existentes do design system (`Card`, `Button`, `EmptyState`). **Nenhum componente novo de design system.** **Nenhuma dependência de runtime nova.** **Nenhuma mudança de schema/endpoint no backend.** Mesmo conteúdo/textos/comportamento de hoje — restyle puro, sem redesenho de conteúdo ou fluxo (decisão explícita do usuário: manter a landing como está, só trocar o estilo).

### Fora de escopo
- Qualquer endpoint ou schema novo no backend.
- Redesenho de conteúdo/copy da Landing Page (sem novas seções de marketing).
- Adicionar nav global pra páginas de Auth ou páginas de erro (elas continuam fora do `AppShell`, sem topbar/sidebar/nav — o usuário ainda não está autenticado ou está numa página de erro).
- Trocar o `<select>` nativo (ordenação em `SearchPage.tsx`, categoria em `SearchFilters.tsx`) por um componente customizado — não existe primitivo de select no design system, mantém-se o elemento nativo apenas com borda/cor tokenizada.

## Decisões de design

### Auth (`AuthField` + 5 páginas)
- `AuthField.tsx`: label em `text-ink`, input com `border-surface`/`text-ink`, mensagem de erro em `text-accent` (em vez de `text-slate-700`/`border-slate-300`/`text-red-600`).
- Todas as 5 páginas (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`): o formulário passa a ficar dentro de um `Card` centralizado na tela (`mx-auto max-w-sm` no wrapper externo, `Card` envolvendo o `<form>`), mesmo padrão comum de telas de autenticação. Botão de submit vira `Button`. Links de navegação (`Criar conta`, `Esqueci a senha`, `Já tenho conta`, `Ir para o login`) mantêm o texto atual, só trocam a cor crua (`text-slate-600`) pelo token (`text-muted` ou `text-primary` conforme o padrão de link já usado em outras telas restilizadas). Mensagens de sucesso/erro (`text-green-600`/`text-red-600`) trocam por `text-primary`/`text-accent`.
- `VerifyEmailPage`: mesma lógica de estados (`idle`/`pending`/`done`/`error`) mantida, só a apresentação visual muda pro `Card` + tokens.

### Landing e Busca
- `LandingPage.tsx`: título mantido, envolve `SearchBar` e `CategoryGrid` sem mudança estrutural, só ajusta espaçamento pros tokens de página já usados em outras telas (`flex flex-col gap-*`).
- `SearchBar.tsx`: inputs com `border-surface`/`text-ink`, botão "Buscar" vira `Button`.
- `CategoryGrid.tsx`: cada categoria vira um `Card` com `interactive` (prop já existente no componente `Card`), mantendo o `Link` de navegação por dentro.
- `SearchPage.tsx`: o `<select>` de ordenação ganha `border-surface`/`text-ink` (mesmo tratamento já usado no `<select>` de categoria em `SearchFilters.tsx`, que já está tokenizado). `SearchFilters.tsx` e `ProfessionalResults.tsx` não precisam de mudança (já tokenizados).

### Páginas de erro (403/404)
- Nova página real para `/forbidden` (atualmente `<div />` vazio no router): usa `EmptyState` com título "Acesso restrito" e um link pra voltar (`/`), fora do `AppShell` — mesmo padrão de tela cheia centralizada que `NotFound.tsx` já usa hoje, sem topbar/nav (o usuário pode não ter permissão pra nenhuma área, então não faz sentido mostrar nav).
- `NotFound.tsx`: reescrita pra usar `EmptyState` com título "Página não encontrada" e um link pra voltar (`/`), mesmo padrão da nova página 403, mantendo-se fora do `AppShell`.
- O router (`frontend/src/router/index.tsx:38`) passa a apontar `/forbidden` pra essa nova página em vez do `<div />` vazio.

## Testes

Cada componente/página restilizado mantém os testes de comportamento já existentes (ex: submissão de login, validação de campos, fluxo de verificação de e-mail) e ganha os testes novos que a estrutura nova exigir (ex: presença do `Card` envolvendo o form, o `Link` de voltar na página 403/404). TDD estrito em todas as tasks, mesmo padrão das Fases 2-5.

## Constraints globais (herdadas do projeto)

- Sem comentários no código.
- Identificadores e nomes de arquivo em inglês; copy de UI em português.
- Commits em português, sem trailer `Co-Authored-By`.
- Sem PR — merge direto na `master` (dev solo).
- Sem dependências novas de runtime.
- Apenas os primitivos de UI já existentes (`Card`, `Button`, `EmptyState`) — nenhum componente novo de design system nesta fase.
