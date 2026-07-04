# 01 — Design Tokens

Fundação usada por todos os componentes descritos em `02`, `03` e `04`. Tokens são CSS custom properties em `oklch()` (mantendo o padrão já usado em `frontend/src/index.css`), expostas ao Tailwind via `tailwind.config.js` (`theme.extend`).

Estado atual (referência): `frontend/src/index.css:5-14` define `--color-bg`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-primary(-hover)`, `--color-accent(-hover)`. `frontend/tailwind.config.js` já mapeia essas variáveis e define `borderRadius` (sm/md/lg), `boxShadow` (hover/modal) e `zIndex` semântico (dropdown/sticky/modal-backdrop/modal/toast/tooltip) — esse `zIndex` é mantido como está, já é bom.

## Cores

Novas variáveis a adicionar em `:root` (todas `oklch()`, mesma família tonal `280` usada hoje para manter coerência com `primary`/`ink`):

| Token | Uso | Valor proposto |
|---|---|---|
| `--color-success` | estado de sucesso, confirmações | `oklch(0.620 0.170 145)` |
| `--color-success-hover` | hover sobre success | `oklch(0.550 0.170 145)` |
| `--color-warning` | avisos, estados de atenção | `oklch(0.760 0.170 80)` |
| `--color-warning-hover` | hover sobre warning | `oklch(0.690 0.170 80)` |
| `--color-danger` | erro, ações destrutivas | `oklch(0.580 0.220 25)` |
| `--color-danger-hover` | hover sobre danger | `oklch(0.510 0.220 25)` |
| `--color-info` | informativo | `oklch(0.580 0.140 240)` |
| `--color-info-hover` | hover sobre info | `oklch(0.510 0.140 240)` |
| `--color-border` | bordas padrão (hoje resolvido ad-hoc com `border-surface`) | `oklch(0.880 0.014 280)` |
| `--color-focus` | anel de foco (hoje hardcoded `outline-primary` no Button) | igual a `--color-primary` |
| `--color-overlay` | backdrop de Modal/Drawer | `oklch(0.200 0.020 280 / 0.45)` |

Mantidos sem alteração: `bg`, `surface`, `ink`, `muted`, `primary`, `accent`.

Fora de escopo: `glass` e `gradient` — não há uso real hoje (nenhum componente auditado usa glassmorphism ou gradiente); não são criados tokens órfãos.

Mapeamento Tailwind (`tailwind.config.js theme.extend.colors`), seguindo o padrão já existente:

```js
colors: {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-muted)',
  border: 'var(--color-border)',
  focus: 'var(--color-focus)',
  overlay: 'var(--color-overlay)',
  primary: { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)' },
  accent: { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)' },
  success: { DEFAULT: 'var(--color-success)', hover: 'var(--color-success-hover)' },
  warning: { DEFAULT: 'var(--color-warning)', hover: 'var(--color-warning-hover)' },
  danger: { DEFAULT: 'var(--color-danger)', hover: 'var(--color-danger-hover)' },
  info: { DEFAULT: 'var(--color-info)', hover: 'var(--color-info-hover)' },
}
```

## Tipografia

Família mantida: `Manrope`, `Inter`, `system-ui` (`fontFamily.sans`, já em `tailwind.config.js:20`).

Escala nova (`theme.extend.fontSize`, formato `[tamanho, { lineHeight, letterSpacing }]`):

| Token | Tamanho / line-height | Uso |
|---|---|---|
| `display` | 3rem / 1.1, `-0.02em` | hero, landing |
| `h1` | 2.25rem / 1.15, `-0.02em` | título de página |
| `h2` | 1.875rem / 1.2, `-0.01em` | título de seção |
| `h3` | 1.5rem / 1.25 | título de card/bloco |
| `h4` | 1.25rem / 1.3 | subtítulo |
| `body-lg` | 1.125rem / 1.5 | texto de destaque |
| `body-md` | 1rem / 1.5 | texto padrão (hoje `text-base`) |
| `body-sm` | 0.875rem / 1.45 | texto secundário (hoje `text-sm`) |
| `caption` | 0.75rem / 1.4 | legendas, metadados |
| `label` | 0.8125rem / 1.3, `0.01em`, peso 600 | rótulos de campo/badge |
| `button` | 0.9375rem / 1, peso 600 | texto de botão |

## Espaçamento

Escala completa pedida no briefing (`theme.extend.spacing`, valores em px convertidos pra rem, base 16px):

| Token | Valor |
|---|---|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `16` | 64px |
| `20` | 80px |
| `24` | 96px |
| `32` | 128px |

Boa parte já existe como default do Tailwind (`4`, `8`, `12`...) — só `20`(80px)/`24`(96px)/`32`(128px) precisam de override explícito porque o Tailwind default usa essas chaves para valores diferentes.

## Border Radius

`theme.extend.borderRadius`, superset do que já existe (`sm`/`md`/`lg` em `tailwind.config.js:22-26`):

| Token | Valor | Observação |
|---|---|---|
| `xs` | 4px | novo |
| `sm` | 6px | igual ao atual |
| `md` | 10px | igual ao atual |
| `lg` | 16px | igual ao atual |
| `xl` | 20px | novo — usado em Modal/Drawer |
| `2xl` | 28px | novo |
| `full` | 9999px | novo — Avatar, Badge pill, Button icon-only |

## Shadows

`theme.extend.boxShadow`, superset do atual (`hover`/`modal` em `tailwind.config.js:28-31`):

| Token | Valor | Observação |
|---|---|---|
| `xs` | `0 1px 2px oklch(0.200 0.020 280 / 0.06)` | novo — Card em repouso |
| `sm` | `0 2px 6px oklch(0.200 0.020 280 / 0.07)` | novo |
| `md` | igual ao `hover` atual | `0 4px 16px oklch(0.200 0.020 280 / 0.08)` |
| `lg` | `0 12px 32px oklch(0.200 0.020 280 / 0.12)` | novo — Toast, Tooltip elevado |
| `xl` | igual ao `modal` atual | `0 24px 64px oklch(0.200 0.020 280 / 0.18)` |
| `glass` | fora de escopo | sem uso real hoje |
| `floating` | `0 8px 24px oklch(0.200 0.020 280 / 0.14)` | novo — elementos flutuantes (Tooltip, dropdown-like) |

## Motion

Não existe hoje nenhum token de motion no projeto (nenhuma dependência de animação instalada). Definidos como constantes TS em `frontend/src/lib/motion.ts` (novo arquivo, não CSS var — motion é consumido via `framer-motion`, não via Tailwind):

```ts
export const duration = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const;

export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 32 },
  gentle: { type: 'spring', stiffness: 260, damping: 26 },
} as const;
```

Variantes reutilizáveis (`frontend/src/lib/motion.ts`, consumidas via `variants` do framer-motion):

- `fadeVariants` — opacity 0→1
- `scaleVariants` — opacity + scale 0.96→1 (Modal, Toast, Tooltip)
- `slideVariants(direction)` — opacity + translate no eixo, parametrizado por direção (Drawer: left/right/bottom conforme já suportado)

Cada componente em `02`/`03`/`04` especifica qual variante usa e em qual estado (hover, tap, entrance, exit).
