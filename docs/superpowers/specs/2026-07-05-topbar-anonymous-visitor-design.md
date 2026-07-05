# Topbar consciente de visitante anônimo — Design

Data: 2026-07-05

## Contexto

Durante verificação manual do redesign de Landing/Search (via Playwright), foi observado que o `Topbar` (`frontend/src/components/layout/Topbar.tsx`) sempre renderiza `NotificationBell` e `ProfileMenu`, mesmo para visitante anônimo em `/` e `/search` (rotas públicas). `ProfileMenu` já se protege corretamente (`if (!user) return null`), assim como `Sidebar`/`MobileNav` (`if (!role) return null`) — mas `NotificationBell` não tem esse guard:

```tsx
// NotificationBell.tsx atual
export function NotificationBell(): JSX.Element {
  const notifications = useNotifications();
  ...
  return <Link to="/notifications" ...>...</Link>;
}
```

Consequência confirmada via browser: anônimo vê o sino de notificação, que (a) dispara `GET /notifications` fadado a 401 e (b) linka para `/notifications`, rota protegida que redireciona pro login — nenhum dos dois faz sentido pra quem ainda não tem conta.

## Escopo

Corrigir o gap funcional (`NotificationBell` sem guard) e, junto, polir o Topbar para visitante anônimo: CTAs de entrar/cadastrar, logo clicável, link de âncora "Como funciona" na Landing, e topbar transparente-até-rolar no hero. Sem novos primitivos em `components/ui`, sem alterar `AppShell`/rotas/`Sidebar`/`MobileNav` (já corretos).

## Decisões (validadas com o usuário)

1. **`NotificationBell` retorna `null` quando `!user`** — mesmo padrão de `ProfileMenu`.
2. **Anônimo vê**: link "Como funciona" (só em `/`, âncora pra seção da Landing) + `Link "Entrar"` (ghost, `/login`) + `Button "Anunciar meus serviços"` (`asChild` → `/register`), no lugar de sino+avatar.
3. **Logo clicável**: "Services Marketplace" vira `Link to="/"`.
4. **Topbar transparente-até-rolar**: só na Landing (`/`), fundo `bg-transparent` no topo, vira `bg-bg border-b border-border` após rolar (threshold ~8px), via `useScroll` do Framer Motion (já dependência do projeto — sem novo padrão de scroll-tracking). Em qualquer outra rota, ou quando logado, Topbar permanece sempre sólido (comportamento atual).

## Arquitetura

### `NotificationBell.tsx` (modificado)

Adiciona guard de auth no topo da função:

```tsx
export function NotificationBell(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const notifications = useNotifications({ enabled: Boolean(user) });
  const unread = notifications.data?.items.filter((n) => !n.readAt).length ?? 0;

  if (!user) return null;

  return <Link to="/notifications" ...>...</Link>;
}
```

`useNotifications` precisa aceitar um segundo argumento `{ enabled? }` (mesmo padrão já usado por `useSearchProfessionals`) — hoje só aceita `page`. Verificar assinatura atual em `frontend/src/features/notifications/queries.ts` antes de implementar; se não aceitar `enabled`, adicionar essa opção (mudança mínima, mesmo padrão já estabelecido em outras queries do projeto).

### `Topbar.tsx` (reescrito)

```tsx
interface TopbarProps {} // sem props, lê tudo de stores/router
```

- Lê `user` de `useAuthStore`, `pathname` de `useLocation` (react-router-dom).
- Logo: `<Link to="/" className="text-lg font-bold text-ink">Services Marketplace</Link>`.
- Se `user`: renderiza `NotificationBell` + `ProfileMenu` (igual hoje).
- Se `!user`:
  - Se `pathname === '/'`: renderiza `<a href="#como-funciona">Como funciona</a>` antes dos botões (scroll suave via `scrollIntoView({ behavior: 'smooth' })` num `onClick` que previne o comportamento padrão de navegação abrupta, ou via CSS `scroll-behavior: smooth` no `html` — usar a abordagem mais simples que já funcionar sem JS extra, testando ambas).
  - Sempre (independente de rota): `Link to="/login"` (estilizado como link ghost) + `Button asChild variant="accent"><Link to="/register">Anunciar meus serviços</Link></Button>`.
- Fundo dinâmico: só ativo quando `pathname === '/'` e `!user`. Usa `useScroll()` do framer-motion (`{ target: undefined }` = window scroll) + `useMotionValueEvent(scrollY, 'change', ...)` pra togglar um `useState<boolean>` `scrolled` quando `scrollY.get() > 8`. Classe do `<header>` vira condicional: `scrolled || pathname !== '/' || user ? 'bg-bg border-b border-border' : 'bg-transparent'`.

### `HowItWorks.tsx` (modificado)

Adiciona `id="como-funciona"` na tag `<section>` existente (linha do `<section className="mx-auto w-full max-w-6xl px-6 py-16">` vira `<section id="como-funciona" className="...">`).

## Testes

`Topbar.test.tsx` (reescrito, hoje só verifica o título):
- Anônimo em `/`: mostra "Como funciona", "Entrar", "Anunciar meus serviços"; não mostra sino/avatar.
- Anônimo em `/search`: mostra "Entrar"/"Anunciar meus serviços"; não mostra "Como funciona".
- Logado (qualquer rota): mostra sino + avatar (via `ProfileMenu`); não mostra "Entrar"/"Anunciar meus serviços".
- Logo é um link pra `/`.

`NotificationBell.test.tsx` (novo ou expandido, se já existir): anônimo → retorna `null`, não chama `useNotifications` com `enabled: true`; logado → renderiza normalmente.

## Acessibilidade

Link "Como funciona" com `href` real (funciona sem JS, scroll suave é enhancement); foco visível nos novos CTAs (herda de `Button`/`Link` padrão já tokenizado); nenhuma mudança de landmark (`<header>` continua único).

## Fora de escopo

Mudar `AppShell`/`Sidebar`/`MobileNav` (já corretos), qualquer alteração de rota/API/auth, dark mode, i18n/troca de idioma no Topbar.
