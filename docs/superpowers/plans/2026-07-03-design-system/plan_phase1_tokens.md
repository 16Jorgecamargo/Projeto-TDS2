# Phase 1 — Design Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar os tokens de cor, tipografia, radius e shadow definidos em `docs/superpowers/specs/2026-07-03-design-system/01-tokens.md` sem quebrar nenhum uso existente.

**Architecture:** Tokens de cor são CSS custom properties (`:root` em `index.css`), mapeados no Tailwind via `theme.extend`. Radius e shadow existentes (`sm`/`md`/`lg`, `hover`/`modal`) são mantidos intactos e somados a novos valores — nenhuma classe usada hoje (`rounded-sm`, `shadow-hover` etc.) muda de valor.

**Tech Stack:** TailwindCSS 3, CSS custom properties.

## Global Constraints

Ver `plan_index.md`. Espaçamento: a escala pedida na spec (4/8/12/16/20/24/32/40/48/64/80/96/128px) já é coberta pelos valores default do Tailwind (chaves `1,2,3,4,5,6,8,10,12,16,20,24,32`) — não há override a fazer, confirmado nesta fase (Task 1, Step 1).

---

### Task 1: Confirmar cobertura da escala de espaçamento (sem alteração de código)

**Files:**
- Nenhum arquivo modificado — só verificação.

**Interfaces:**
- N/A.

- [ ] **Step 1: Confirmar que o Tailwind default já cobre a escala pedida**

Run:
```bash
cd frontend && node -e "
const config = require('tailwindcss/stubs/config.full.js');
const required = [4,8,12,16,20,24,32,40,48,64,80,96,128];
const scale = config.theme.spacing;
const remToPx = (v) => Math.round(parseFloat(v) * 16);
const px = Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, typeof v === 'string' && v.endsWith('rem') ? remToPx(v) : null]));
const covered = required.every((target) => Object.values(px).includes(target));
console.log(covered ? 'coberto' : 'faltando valores');
"
```
Expected: imprime `coberto`. Se imprimir `faltando valores`, pare e adicione um bloco `spacing` em `tailwind.config.js` `theme.extend` só com as chaves que faltarem — não é esperado neste projeto (Tailwind 3.4 default já cobre).

Nenhum commit nesta task (não houve alteração de arquivo).

---

### Task 2: Adicionar cores novas em `index.css` e `tailwind.config.js`

**Files:**
- Modify: `frontend/src/index.css:5-14`
- Modify: `frontend/tailwind.config.js:8-17`

**Interfaces:**
- Produces: classes Tailwind `bg-border`, `text-border`, `border-border`, `bg-focus`, `outline-focus`, `bg-overlay`, `bg-success`, `bg-success-hover`, `text-success`, `bg-warning`, `bg-warning-hover`, `text-warning`, `bg-danger`, `bg-danger-hover`, `text-danger`, `bg-info`, `bg-info-hover`, `text-info` (e variações `text-*`/`border-*` correspondentes, geradas automaticamente pelo Tailwind a partir da entrada em `colors`).

- [ ] **Step 1: Substituir o bloco `:root` em `frontend/src/index.css`**

Conteúdo completo do arquivo após a mudança:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: oklch(1.000 0.000 0);
  --color-surface: oklch(0.960 0.014 280);
  --color-ink: oklch(0.200 0.020 280);
  --color-muted: oklch(0.520 0.012 280);
  --color-primary: oklch(0.420 0.150 280);
  --color-primary-hover: oklch(0.360 0.150 280);
  --color-accent: oklch(0.680 0.190 45);
  --color-accent-hover: oklch(0.610 0.190 45);
  --color-success: oklch(0.620 0.170 145);
  --color-success-hover: oklch(0.550 0.170 145);
  --color-warning: oklch(0.760 0.170 80);
  --color-warning-hover: oklch(0.690 0.170 80);
  --color-danger: oklch(0.580 0.220 25);
  --color-danger-hover: oklch(0.510 0.220 25);
  --color-info: oklch(0.580 0.140 240);
  --color-info-hover: oklch(0.510 0.140 240);
  --color-border: oklch(0.880 0.014 280);
  --color-focus: oklch(0.420 0.150 280);
  --color-overlay: oklch(0.200 0.020 280 / 0.45);
}

@layer base {
  body {
    @apply bg-bg text-ink font-sans;
  }

  html {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  html::-webkit-scrollbar,
  body::-webkit-scrollbar,
  *::-webkit-scrollbar {
    display: none;
  }

  * {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}
```

- [ ] **Step 2: Atualizar `colors` em `frontend/tailwind.config.js`**

Substituir o bloco `colors` (linhas 8-17 do arquivo atual) por:

```js
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        focus: 'var(--color-focus)',
        overlay: 'var(--color-overlay)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          hover: 'var(--color-info-hover)',
        },
      },
```

- [ ] **Step 3: Rodar a suíte completa para confirmar que nada quebrou**

Run: `cd frontend && npx vitest run`
Expected: todos os testes existentes continuam PASS (nenhum componente usa cor nova ainda, então nenhum teste deveria mudar de comportamento).

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/index.css tailwind.config.js
git commit -m "feat: adiciona tokens de cor success/warning/danger/info/border/focus/overlay"
```

---

### Task 3: Adicionar tipografia, radius e shadow novos em `tailwind.config.js`

**Files:**
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Produces: classes `text-display`, `text-h1`..`text-h4`, `text-body-lg`, `text-body-md`, `text-body-sm`, `text-caption`, `text-label`, `text-button`; `rounded-xs`, `rounded-2xl`, `rounded-full` (somados a `xs`/`sm`/`md`/`lg`/`xl` já existentes/novos); `shadow-xs`, `shadow-sm`, `shadow-lg`, `shadow-xl`, `shadow-floating` (somados a `hover`/`modal` mantidos).

- [ ] **Step 1: Substituir `fontFamily`, `borderRadius` e `boxShadow`, adicionar `fontSize`**

Conteúdo completo de `frontend/tailwind.config.js` após esta task:

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        nav: '424px',
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        focus: 'var(--color-focus)',
        overlay: 'var(--color-overlay)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          hover: 'var(--color-info-hover)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        h2: ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h3: ['1.5rem', { lineHeight: '1.25' }],
        h4: ['1.25rem', { lineHeight: '1.3' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'body-md': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.45' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
        label: ['0.8125rem', { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '600' }],
        button: ['0.9375rem', { lineHeight: '1', fontWeight: '600' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px oklch(0.200 0.020 280 / 0.06)',
        sm: '0 2px 6px oklch(0.200 0.020 280 / 0.07)',
        hover: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        md: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        lg: '0 12px 32px oklch(0.200 0.020 280 / 0.12)',
        modal: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
        xl: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
        floating: '0 8px 24px oklch(0.200 0.020 280 / 0.14)',
      },
      zIndex: {
        dropdown: '20',
        sticky: '30',
        'modal-backdrop': '40',
        modal: '50',
        toast: '60',
        tooltip: '70',
      },
    },
  },
  plugins: [],
};
```

`hover`/`modal` continuam existindo com o valor idêntico ao atual (nenhum uso existente de `shadow-hover`/`shadow-modal` quebra); `md`/`xl` são os nomes recomendados para uso novo daqui pra frente.

- [ ] **Step 2: Rodar a suíte completa e o typecheck**

Run:
```bash
cd frontend && npx vitest run && npx tsc --noEmit
```
Expected: todos os testes PASS, `tsc` sem erros.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add tailwind.config.js
git commit -m "feat: adiciona escala de tipografia, radius e shadow do design system"
```
