# Redesign das telas de autenticação — Design

Data: 2026-07-05

## Escopo

Reconstruir as 5 telas públicas de autenticação — Login, Register, ForgotPassword, ResetPassword, VerifyEmail — via composição dos primitivos existentes em `components/ui`. Sem novos primitivos, sem alteração de API/DTO/regra de negócio/Socket.IO/estado global.

## Contexto atual (levantado via auditoria + leitura do código)

- Todas as 5 páginas usam o mesmo padrão: `mx-auto max-w-sm p-6` + `Card` único, form via `react-hook-form`+`zodResolver`, input via `AuthField` (único primitivo de form-input do projeto, local a `features/auth/components/`).
- As 5 rotas hoje renderizam dentro do `AppShell` (Topbar/Sidebar/MobileNav/CommandPalette), mesmo sendo públicas e sem usuário logado — auditoria (`docs/frontend-audit/relatorio.md`, L174) já sinaliza isso como isolamento incompleto.
- Nenhuma das 5 páginas usa `Toast` — feedback é sempre texto inline no Card (`relatorio.md` L989).
- Gaps de navegação confirmados: `ForgotPasswordPage` não tem nenhum link de volta; `ResetPasswordPage` idem, só redirect programático pós-sucesso.
- `RegisterPage` usa `<select>` nativo cru pro papel (cliente/profissional) — não usa `AuthField` nem nenhum primitivo.
- `VerifyEmailPage` é o único lugar com `Button variant="ghost" className="w-full"` — inconsistente com o botão principal sem largura explícita no Login.
- Usuário autenticado consegue acessar `/login` etc. de novo, sem redirect (`relatorio.md` L1167).
- Design system (`docs/superpowers/specs/2026-07-03-design-system/`) já está implementado: Button/Card/Badge/Avatar/Modal/Drawer/Tooltip/Toast/EmptyState/Skeleton/ImageUpload todos com `cva` + `framer-motion` + tokens novos (`border`, `focus`, `success/warning/danger/info`). `MotionConfig reducedMotion="user"` já ativo globalmente em `App.tsx`, acima do `<Outlet/>`.
- `AuthField` ainda usa tokens antigos (`border-surface`, `focus:border-primary`) — não foi atualizado junto com o resto do design system.

## Decisões (validadas com o usuário)

1. **AuthLayout dedicado** substitui o `AppShell` nas 5 rotas de auth (split-screen: painel de marca + painel de form).
2. **Seletor de papel no Register** vira dois `Card interactive selected` lado a lado, no lugar do `<select>` nativo.
3. **Toast híbrido**: erro de campo/validação continua inline junto ao input; erro global de submit e sucessos de ação (email enviado, senha redefinida, cadastro criado) usam `Toast`.
4. **Redirect de usuário já logado**: novo guard `RequireGuest` nas 5 rotas, redireciona pra `/` se já autenticado.

## Arquitetura

### `AuthLayout` (novo — `frontend/src/features/auth/components/AuthLayout.tsx`)

```ts
interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}
```

- Desktop/notebook (≥1024px): split-screen 50/50 (ou 55/45 favorecendo o painel de form). Painel esquerdo `bg-primary` com gradiente sutil, logo, `title`/`description` (headline curta), ilustração leve (SVG estático inline, sem asset novo pesado). Painel direito `bg-bg`, form centralizado `max-w-sm`, com scroll independente.
- Tablet (768–1023px): painel de marca vira faixa superior compacta (logo + `title`, sem ilustração); form abaixo, full-width até `max-w-sm` centralizado.
- Mobile (<768px): só painel de form; logo pequeno no topo; sem faixa de marca (evita scroll extra).
- Substitui `AppShell` — as 5 rotas saem do grupo de rotas que renderiza `<App/>`→`AppShell`, passam a usar `AuthLayout` como wrapper de rota. `MotionConfig reducedMotion="user"` permanece efetivo (React Router aninha o novo elemento de rota abaixo do `MotionConfig` já existente em `App.tsx`, contanto que a rota pai continue sendo `App`; se a reestruturação de rotas tirar as 5 rotas de dentro de `App`, replicar `MotionConfig reducedMotion="user"` no novo wrapper de rota-pai das rotas de auth).
- Entrada de página: fade + slide-up leve no painel de form usando `fadeVariants`/`slideVariants` de `lib/motion.ts` com `spring.gentle`. Nenhuma constante de motion nova.

### `RequireGuest` (novo — `frontend/src/router/RequireGuest.tsx`, ao lado de `ProtectedRoute.tsx`)

- Mesmo padrão de leitura de sessão que `ProtectedRoute` já usa (não altera lógica de autenticação, só decide destino da navegação).
- Se sessão existente → `<Navigate to="/" replace />`. Senão → `<Outlet/>`.
- As 5 rotas de auth passam a ser filhas de `{ element: <RequireGuest/> }`, que por sua vez renderiza `<AuthLayout>` por página (cada página passa seu próprio `title`/`description` pro layout — ou cada página se envolve em `AuthLayout` diretamente, mantendo `RequireGuest` só como guard sem layout próprio).

### `AuthField` (evolução, não novo primitivo)

- Atualiza tokens: `border-surface` → `border-border`, `focus:border-primary` → `focus:ring-focus` (alinhado ao resto do design system).
- Adiciona ícone opcional à esquerda (prop `icon?: ReactNode`, ex. mail/lock via lucide-react, já dependência do projeto).
- Campo de senha ganha toggle mostrar/ocultar: `Button variant="ghost" size="icon"` posicionado dentro do field (prop `type` controlado localmente pela página, não pelo `AuthField`, pra manter o componente simples — a página que usa senha passa um botão como `endAdornment?: ReactNode`).
- Estado de erro: `aria-invalid={!!error}` + `aria-describedby` apontando pro `<span>` de erro (acessibilidade — hoje não existe).
- API pública might grow (`icon?`, `endAdornment?`) mas mantém compatibilidade com uso atual (props novas opcionais).

## Telas

### LoginPage

- `AuthLayout title="Bem-vindo de volta" description="Entre com sua conta para continuar."`
- `AuthField` e-mail (ícone mail) + senha (ícone lock, endAdornment toggle mostrar/ocultar).
- Link "Esqueci a senha?" alinhado à direita, na mesma linha do label "Senha" (padrão Stripe).
- `Button` de submit full-width (`w-full`), texto "Entrando..." durante `isPending`.
- Erro de credenciais inválidas: `toast(message, { tone: 'error' })` no lugar do `<p>` inline atual.
- Footer: "Não tem conta? Criar conta" (link pra `/register`).

### RegisterPage

- `AuthLayout title="Crie sua conta" description="Leva menos de um minuto."`
- Seletor de papel: dois `Card interactive selected={role === X}` lado a lado, cada um com ícone, título curto ("Quero contratar" / "Quero oferecer serviços") e descrição de 1 linha. Clique seta `role` via `setValue`/`onClick`, sem novo primitivo (reusa `Card`).
- Campos: Nome, E-mail, Telefone, Senha, Confirmar senha (`AuthField`).
- Indicador de força de senha: barra simples (div com `width%` e cor condicional usando tokens `danger`/`warning`/`success`, sem novo primitivo), calculado a partir do valor de senha (regra simples: comprimento + variedade de caracteres, client-side apenas, não é regra de negócio de backend).
- Erro global de submit: `Toast` tone error. Sucesso: `Toast` tone success antes do `navigate('/verify-email')`.

### ForgotPasswordPage

- `AuthLayout title="Esqueceu sua senha?" description="Enviamos um link de redefinição para seu e-mail."`
- Campo e-mail (`AuthField`), submit.
- Sucesso: troca o form por `EmptyState` (`variant="empty"`, ícone mail-check, título "Verifique seu e-mail", descrição explicando o próximo passo) via `AnimatePresence mode="wait"`.
- Corrige gap: link "Voltar ao login" sempre visível no rodapé, tanto no estado de form quanto no estado de sucesso.

### ResetPasswordPage

- `AuthLayout title="Redefinir senha"`.
- Token ausente/inválido: `EmptyState` (`variant="error"`, título "Link inválido ou expirado", ação "Solicitar novo link" via `Button asChild` + `Link to="/forgot-password"`) — corrige o dead-end atual.
- Token válido: campos Nova senha + Confirmar senha (`AuthField`, mesma barra de força do Register), submit.
- Sucesso: `Toast` tone success + `navigate('/login')`.

### VerifyEmailPage

- `AuthLayout title="Verifique seu e-mail"`.
- Estados idle/pending/done/error unificados em `EmptyState`, variando ícone/título/descrição por estado (`variant="empty"` pra pending/done, `variant="error"` pro error), trocados via `AnimatePresence mode="wait"`.
- Botão "Ir para o login" sempre `w-full` (corrige inconsistência atual).
- "Ignorar por enquanto" (`Button variant="ghost" className="w-full"`) só aparece no estado idle/sem-token, como hoje.

## Componentes reusados vs novos

**Reusados sem alteração**: `Button`, `Card` (+`interactive`/`selected`), `Toast`/`useToast`, `EmptyState`.

**Evoluído (não é novo primitivo)**: `AuthField` (tokens, ícone, endAdornment, aria).

**Novo (composição de página, não primitivo)**: `AuthLayout`, `RequireGuest`.

**Nenhum novo componente em `components/ui`.**

## Motion

- Entrada de página: fade+slide-up no painel de form (`fadeVariants`/`slideVariants` de `lib/motion.ts`, `spring.gentle`).
- Troca de estado dentro da mesma tela (form→EmptyState em ForgotPassword/ResetPassword/VerifyEmail): `AnimatePresence mode="wait"` com `fadeVariants`.
- Nenhuma constante de motion nova — tudo via `lib/motion.ts` já existente.
- `MotionConfig reducedMotion="user"` já cobre a árvore inteira; nenhum componente novo precisa de tratamento especial de `prefers-reduced-motion`.

## Responsividade

| Breakpoint | Comportamento |
|---|---|
| Desktop/notebook (≥1024px) | Split-screen 50/50 (ou 55/45 favorecendo form). Painel de marca com ilustração. |
| Tablet (768–1023px) | Faixa superior compacta (logo+title, sem ilustração) + form abaixo. |
| Mobile (<768px) | Só painel de form, logo pequeno no topo. |

## Acessibilidade

- Focus ring visível (token `focus`) em todo elemento interativo.
- `aria-live="polite"` na região de erro/sucesso do `EmptyState`.
- `AuthField`: `aria-invalid` + `aria-describedby` no erro.
- Ordem de tab lógica (marca → form → footer links).
- Contraste AA nos tons `success`/`warning`/`danger`/`info` (já validados no design system).

## Estados cobertos

Loading (`isPending` no botão de submit + `loading` prop do `Button`), Empty (`EmptyState` em ForgotPassword sucesso / VerifyEmail idle), Error (`EmptyState` error em ResetPassword token inválido / VerifyEmail error, Toast error em Login/Register), Success (Toast success + EmptyState empty).

## Fora de escopo

Dark mode, novos primitivos em `components/ui`, alteração de API/DTO/regras de negócio/Socket.IO/estado global, alteração de lógica de autenticação (só destino de navegação via `RequireGuest`), avatar-picker no Register.
