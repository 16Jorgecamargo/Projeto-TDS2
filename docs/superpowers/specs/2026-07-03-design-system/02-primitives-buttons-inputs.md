# 02 — Button, Badge

## Button

### Análise atual (`components/ui/Button.tsx`)

- Responsabilidade: ação clicável primária da UI.
- Onde é usado: em quase toda feature (forms, cards, toolbars, dialogs).
- Dependências: `cn` (clsx+tailwind-merge).
- API atual: `variant` (`primary`/`accent`/`ghost`), `size` (`sm`/`md`), `className`, resto de `ButtonHTMLAttributes`.
- Pontos fortes: API já enxuta, usa `cn`, foco visível já implementado (`focus-visible:outline`), `disabled` já tratado.
- Problemas: variantes resolvidas com `Record<Variant, string>` (não escala bem, cada nova variante = editar objeto manualmente); não tem estado `loading` (features hoje desabilitam o botão manualmente e não mostram spinner); não tem tamanho `lg` nem variante `danger`/`icon-only`; não tem `asChild`/polimorfismo (não dá pra renderizar como `<a>` mantendo estilo de botão — algumas features usam `<Link>` com classes duplicadas do Button); sem motion (hover é só `transition-colors`, sem feedback de "pressed").

### Objetivos do redesign

- Cobrir `loading` como estado de primeira classe (spinner substituindo o conteúdo, mantendo largura do botão estável).
- Adicionar variantes que faltam sem quebrar as existentes (`primary`, `accent`, `ghost` continuam).
- Migrar de `Record` manual para `cva`, preparando para crescimento sem reescrever a API.
- Suporte a `asChild` (via `Slot`, padrão Radix/shadcn) pra permitir `<Button asChild><Link .../></Button>` sem duplicar estilos.

### Nova API pública

```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}
```

Sem prop `icon` dedicada — ícone é filho direto (composição), já que `children: ReactNode` cobre isso.

### Variants

`cva` com base classes (`inline-flex items-center justify-center gap-2 font-semibold rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50`):

| Variant | Classes |
|---|---|
| `primary` | `bg-primary text-bg hover:bg-primary-hover` |
| `accent` | `bg-accent text-bg hover:bg-accent-hover` |
| `ghost` | `bg-transparent text-ink border border-border hover:bg-surface` |
| `danger` | `bg-danger text-bg hover:bg-danger-hover` |

### Sizes

| Size | Classes |
|---|---|
| `sm` | `px-3 py-1.5 text-body-sm` |
| `md` | `px-5 py-2.5 text-button` (default, igual ao atual) |
| `lg` | `px-6 py-3.5 text-body-lg` |
| `icon` | `p-2.5 rounded-full` (quadrado/circular, sem texto — usado com `aria-label`) |

### Estados

Default, hover, focus-visible (anel `focus`), active/pressed (novo: `active:scale-[0.98]` via motion, ver abaixo), disabled (`opacity-50`, `cursor-not-allowed` — igual ao atual), loading (novo: substitui conteúdo por `Loader2` do lucide-react girando, `aria-busy="true"`, botão continua com `disabled` funcional para impedir duplo clique).

### Anatomia

```
<button>
  {loading ? <Spinner /> : children}
</button>
```

Sem slots internos — Button não é composto (diferente de Card). `asChild` troca o elemento raiz por `Slot` (clona props no filho), mantendo anatomia igual.

### Tokens utilizados

Cor: `primary`, `accent`, `danger`, `ghost`(`border`/`surface`), `focus`. Radius: `sm` (retangular), `full` (`icon`). Tipografia: `button`, `body-sm`, `body-lg`.

### Comportamento

`loading=true` implica `disabled` de fato (bloqueia clique) independente da prop `disabled` recebida. `asChild=true` requer filho único que aceite `className`/`ref`/`children` (mesma regra do `Slot` do Radix).

### Acessibilidade

`focus-visible` já correto (mantido). `aria-busy` quando `loading`. `icon` size exige `aria-label` obrigatório via tipo (`aria-label: string` quando `size === 'icon'` — documentar via JSDoc de tipo, não runtime check, pra não adicionar validação desnecessária).

### Motion

`framer-motion` `motion.button` (ou `motion(Slot)` quando `asChild`): `whileTap={{ scale: 0.98 }}`, `whileHover={{ scale: 1.01 }}`, `transition: { duration: duration.fast, ease: ease.standard }`. Spinner de loading usa `rotate: 360` infinito, `duration: 0.6, ease: 'linear', repeat: Infinity`.

### Responsividade

Sem breakpoints próprios — tamanho é decidido pelo consumidor via prop `size`, não por media query interna.

### Exemplos de uso

```tsx
<Button variant="primary">Salvar</Button>
<Button variant="danger" size="sm" onClick={onDelete}>Excluir</Button>
<Button loading={isPending}>Enviar</Button>
<Button asChild variant="ghost"><Link to="/perfil">Ver perfil</Link></Button>
<Button size="icon" variant="ghost" aria-label="Fechar"><X /></Button>
```

### Casos de uso

Submit de formulário, ação destrutiva em confirmação, ação secundária em toolbar, link estilizado como botão, botão icon-only em header.

### Checklist de implementação

- [ ] Migrar `Record<Variant,string>` para `cva`
- [ ] Adicionar variant `danger` e size `lg`/`icon`
- [ ] Implementar `loading` com spinner lucide + `aria-busy`
- [ ] Implementar `asChild` via `Slot`
- [ ] Adicionar `whileTap`/`whileHover` via framer-motion
- [ ] Atualizar `Button.test.tsx` cobrindo `loading`, `asChild`, `danger`, `icon`
- [ ] Trocar `outline-primary` por `outline-focus` no token de foco

---

## Badge

### Análise atual (`components/ui/Badge.tsx`)

- Responsabilidade: rótulo curto de status/categoria, inline.
- Onde é usado: status de demanda/contrato, tags de categoria.
- Dependências: `cn`.
- API atual: `tone` (`neutral`/`urgent`), `children`, `className`.
- Pontos fortes: componente mínimo, sem over-engineering.
- Problemas: só 2 tons — não cobre semântica de sucesso/erro/aviso/info que a auditoria mostrou sendo simulada com classes ad-hoc espalhadas pelas features (ex.: cores de status de contrato feitas manualmente fora do Badge); sem tamanho (`size`); sem suporte a ícone à esquerda (padrão comum em status badges).

### Objetivos do redesign

- Cobrir a semântica de cor completa (`success`/`warning`/`danger`/`info`/`neutral`) pra eliminar cor ad-hoc nas features.
- Permitir ícone opcional via composição (`children` já resolve — sem prop nova).

### Nova API pública

```ts
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}
```

`urgent` renomeado para `accent` (mais claro semanticamente, mesma cor visual — `bg-accent`). `neutral` mantido default.

### Variants

`cva`, base `inline-flex items-center gap-1 rounded-full font-semibold`:

| Tone | Classes |
|---|---|
| `neutral` | `bg-surface text-ink` |
| `accent` | `bg-accent text-bg` |
| `success` | `bg-success/15 text-success` |
| `warning` | `bg-warning/15 text-warning` (texto usa cor mais escura, contraste AA) |
| `danger` | `bg-danger/15 text-danger` |
| `info` | `bg-info/15 text-info` |

### Sizes

| Size | Classes |
|---|---|
| `sm` | `px-2 py-0.5 text-caption` |
| `md` | `px-3 py-1 text-label` (default, igual ao atual) |

### Estados

Estático — badge não é interativo (sem hover/focus/disabled). Único estado extra: quando usado dentro de um elemento clicável (ex.: filtro), o hover é responsabilidade do wrapper, não do Badge.

### Anatomia

`<span>{children}</span>` — sem slot interno, ícone é filho direto (`<Badge tone="success"><Check size={12}/> Aprovado</Badge>`).

### Tokens utilizados

Cor: `neutral`(`surface`/`ink`), `accent`, `success`, `warning`, `danger`, `info`. Radius: `full`. Tipografia: `label`, `caption`.

### Comportamento

Puramente apresentacional, sem estado interno.

### Acessibilidade

Cor nunca é o único indicador — cada uso deve garantir texto explícito (já é o padrão atual, mantido). Contraste AA verificado nos pares tom/texto acima (fundo `/15` de opacidade com texto na cor sólida).

### Motion

Entrance sutil quando badge aparece dinamicamente (ex.: status muda após ação): `initial={{ opacity: 0, scale: 0.9 }}`, `animate={{ opacity: 1, scale: 1 }}`, `duration: duration.fast`. Sem hover/tap (não interativo).

### Responsividade

N/A — tamanho fixo por `size`, não muda por breakpoint.

### Exemplos de uso

```tsx
<Badge tone="success">Concluído</Badge>
<Badge tone="warning" size="sm">Pendente</Badge>
<Badge tone="danger"><AlertCircle size={12} /> Recusado</Badge>
```

### Casos de uso

Status de demanda/contrato/pagamento, contadores de notificação, tags de categoria em cards de busca.

### Checklist de implementação

- [ ] Migrar para `cva`
- [ ] Renomear `urgent` → `accent` (checar todos os usos existentes no grep antes de renomear)
- [ ] Adicionar tons `success`/`warning`/`danger`/`info`
- [ ] Adicionar `size`
- [ ] Adicionar motion de entrance opcional (via wrapper `motion.span`)
- [ ] Atualizar `Badge.test.tsx` cobrindo novos tons e size
