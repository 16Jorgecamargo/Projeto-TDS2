# Frontend Redesign — Fase 1: Design System + Shell/Navegação

## Contexto

Redesign completo do frontend (`docs/redesign.md`, inventário atual em `docs/telas.md`) decomposto em sub-projetos independentes, cada um com spec → plano → implementação próprios. Esta é a **Fase 1**, fundação para as demais:

1. **Fase 1 (esta spec)**: Design System + Shell/Navegação
2. Fase 2: Dashboard Cliente + Demandas + Busca + Perfil Público
3. Fase 3: Dashboard Profissional + Portfólio/Disponibilidade/Áreas
4. Fase 4: Contratos + Carteira
5. Fase 5: Chat + Notificações
6. Fase 6: Admin
7. Fase 7: Landing + Auth + Configurações

Restrição inegociável (`docs/redesign.md`): nenhuma regra de negócio, endpoint, DTO, autenticação, socket ou banco muda. Toda melhoria vive exclusivamente na camada React (`frontend/src/`).

## Registro de produto

`frontend/PRODUCT.md` foi criado nesta sessão (via skill `impeccable`): register `product`, personalidade "confiável, ágil, direto", ênfase de referência funcional-marketplace (Airbnb/Uber/GetNinjas) sobre SaaS-refinado puro, anti-referências: aparência administrativa, CRUD tradicional, formulários enormes, tabelas gigantes.

## Design tokens

Paleta OKLCH, estratégia **Committed** (uma cor de marca satura 30–60% da superfície). Seed de marca: indigo/violeta (hue 280°), composta para evitar o padrão genérico "AI-purple-on-white" combinando um primary indigo profundo (não claro/fluorescente) com um accent quente que carrega a energia de marketplace (Uber/GetNinjas usam laranja/coral para CTA e urgência).

```css
--color-bg:      oklch(1.000 0.000 0);      /* branco puro */
--color-surface: oklch(0.960 0.014 280);    /* branco puxado ~10% pro primary */
--color-ink:     oklch(0.200 0.020 280);    /* corpo texto, contraste ~15:1 vs bg */
--color-muted:   oklch(0.520 0.012 280);    /* texto secundário, ~4.6:1 vs bg */
--color-primary: oklch(0.420 0.150 280);    /* indigo profundo — confiança, marca */
--color-accent:  oklch(0.680 0.190 45);     /* coral/laranja — urgência, CTA secundário, badges */
```

Uso: `primary` domina topbar, item de sidebar ativo, botões primários, links. `accent` reservado para CTAs de urgência (aceitar orçamento, badge "novo", status "ativo"), nunca como cor de fundo geral. Texto sobre `accent` e sobre `primary` é sempre branco (ambos caem na faixa de luminância média-saturada que exige texto claro). Dark mode fica fora do escopo desta fase — tokens já nomeados por papel semântico para permitir um tema `dark` futuro sem retrabalho estrutural.

Tipografia, espaçamento e demais tokens (radius, shadow, z-index scale) seguem as regras gerais do skill `impeccable` (`SKILL.md`): linha de corpo até 65–75ch, `clamp()` de heading ≤6rem, z-index semântico (dropdown → sticky → modal-backdrop → modal → toast → tooltip), sem valores arbitrários tipo 999/9999.

## Arquitetura do shell

Novo diretório `frontend/src/components/layout/`:

- **`AppShell`** — substitui `Layout.tsx` como componente de layout no router. Compõe `Topbar` + `Sidebar` (desktop) ou `Topbar` + `MobileNav` (mobile, breakpoint `md`) + `<Outlet />`. Nenhuma rota muda; só o componente de layout é trocado em `router/index.tsx`.
- **`Topbar`** — fixo no topo. Logo, barra de busca global (abre `CommandPalette`), trigger visual de atalho `Ctrl+K`, `NotificationBell` (existe hoje mas está órfão — passa a ser plugado aqui), `ProfileMenu` (avatar, nome, link configurações, logout, switcher de perfil se o usuário tiver mais de um papel).
- **`Sidebar`** — colapsável (ícone-only ↔ ícone+label), itens carregados de `nav-config.ts` conforme `useAuth().role`. Estado de colapso persistido em `localStorage` via Zustand.
- **`MobileNav`** — sidebar vira drawer (`Drawer` component) acionado pelo Topbar; adicionalmente bottom tab bar fixa com os 4 itens mais usados do papel + botão "mais" para o resto.
- **`CommandPalette`** — Zustand store controla open/close (atalho global `Ctrl+K`/`Cmd+K`). Duas seções de resultado: navegação (rotas estáticas do papel atual) e busca (debounce sobre `useSearchProfessionals` / demandas / contratos conforme o texto digitado e o papel). Fecha com `Esc`, navega com `Enter`/clique.

### Navegação por papel

- **Cliente**: Dashboard, Buscar profissional, Minhas demandas, Contratos, Chat, Carteira, Notificações, Configurações.
- **Profissional**: Dashboard, Demandas disponíveis, Meus contratos, Portfólio/Perfil, Disponibilidade, Chat, Carteira, Notificações, Configurações.
- **Admin**: Dashboard (KPIs), Denúncias, Disputas, Usuários, Contratos, Pagamentos/Carteira.

Bottom tabs mobile = os 4 primeiros itens de cada lista acima; os demais ficam atrás do botão "mais".

## Componentes de UI base

Novo diretório `frontend/src/components/ui/`, todos consumindo os tokens acima via `tailwind.config.js` (`theme.extend.colors` mapeado para as CSS vars):

`Button`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `Toast` (provider global montado no `AppShell`), `Modal`, `Drawer`, `Avatar`, `Tooltip`.

## Estados de carregamento e erro

- Todo fetch via TanStack Query usa `Skeleton` durante `isPending` — nunca tela em branco.
- Toda lista vazia usa `EmptyState` (ícone, texto, ação sugerida quando aplicável) — substitui mensagens de texto cru como "Nenhuma notificação ainda".
- Erros de rede/mutation disparam `Toast` global com opção de retry quando a operação for idempotente.

## Migração incremental

1. Criar tokens (`index.css` + `tailwind.config.js`) sem tocar em nenhuma tela existente — build continua passando.
2. Criar `components/ui/*` isoladamente, sem consumidores ainda.
3. Criar `components/layout/AppShell` e trocar o componente de layout usado em `router/index.tsx` no lugar de `Layout.tsx` — todas as rotas e chamadas de API continuam idênticas, só a casca visual muda.
4. Plugar `NotificationBell` (já existente) no `Topbar`.
5. Cada fase seguinte (2 a 7) consome os tokens/componentes desta fase ao redesenhar sua área — nenhuma tela é migrada nesta fase além da casca.

## Fora de escopo desta fase

Conteúdo interno de qualquer tela (dashboards, demandas, contratos, carteira, chat, notificações, admin, landing, auth, configurações) — cada um é uma fase própria. Dark mode. Command palette com ações (só navegação + busca, sem "criar demanda" via palette nesta fase).
