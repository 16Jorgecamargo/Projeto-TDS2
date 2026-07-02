# Phase 1a: Design Tokens + UI Primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for the full goal, architecture, and Global Constraints — they apply to every task below.

---

### Task 1: Design tokens (CSS vars + Tailwind theme + font)

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Produces: Tailwind color utilities `bg-bg`, `bg-surface`, `bg-primary`, `bg-primary-hover`, `bg-accent`, `bg-accent-hover`, `text-ink`, `text-muted`, `border-surface`, and `outline-primary`; `rounded-sm` (6px) / `rounded-md` (10px) / `rounded-lg` (16px); `shadow-hover` / `shadow-modal`; `z-dropdown` (20) / `z-sticky` (30) / `z-modal-backdrop` (40) / `z-modal` (50) / `z-toast` (60) / `z-tooltip` (70); `font-sans` = Manrope. Every task in this plan after this one consumes these utility names verbatim — do not rename them later.

This task has no unit-testable logic (it's config + CSS), so its test cycle is the production build instead of Vitest.

- [ ] **Step 1: Add the Manrope font to `index.html`**

Add inside `<head>`, after the `<meta name="viewport">` tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: Write the design tokens into `src/index.css`**

Replace the full file content with:

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
}

@layer base {
  body {
    @apply bg-bg text-ink font-sans;
  }
}
```

- [ ] **Step 3: Extend `tailwind.config.js` with the token-backed theme**

Replace the full file content with:

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        hover: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        modal: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
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

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: exits 0, no TypeScript or Tailwind config errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/tailwind.config.js
git commit -m "feat(design-system): add OKLCH color tokens and Tailwind theme"
```

---

### Task 2: `Button` primitive

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Test: `frontend/src/components/ui/Button.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts` (`export function cn(...classes: Array<string | false | null | undefined>): string`).
- Produces: `Button` component, `ButtonProps` (`variant?: 'primary' | 'accent' | 'ghost'`, `size?: 'sm' | 'md'`, plus all native `ButtonHTMLAttributes<HTMLButtonElement>`). Later tasks (Topbar, CommandPalette, Sidebar collapse toggle) import `Button` from `../ui/Button`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto e responde a clique', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Salvar</Button>);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica a classe de fundo da variante accent', () => {
    render(<Button variant="accent">Aceitar</Button>);
    expect(screen.getByRole('button', { name: 'Aceitar' })).toHaveClass('bg-accent');
  });

  it('fica desabilitado quando disabled=true', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Button.test.tsx`
Expected: FAIL — `Cannot find module './Button'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-bg hover:bg-primary-hover',
  accent: 'bg-accent text-bg hover:bg-accent-hover',
  ghost: 'bg-transparent text-ink border border-surface hover:bg-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Button.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Button.test.tsx
git commit -m "feat(ui): add Button primitive"
```

---

### Task 3: `Badge` primitive

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`
- Test: `frontend/src/components/ui/Badge.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Badge` component, `BadgeProps` (`tone?: 'neutral' | 'urgent'`, `children: ReactNode`, `className?: string`). Later tasks (Sidebar nav item unread count, CommandPalette result type tag) import `Badge` from `../ui/Badge`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza o conteúdo', () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('usa fundo accent no tom urgent', () => {
    render(<Badge tone="urgent">3</Badge>);
    expect(screen.getByText('3')).toHaveClass('bg-accent');
  });

  it('usa fundo surface no tom neutral por padrão', () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText('Pendente')).toHaveClass('bg-surface');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Badge.test.tsx`
Expected: FAIL — `Cannot find module './Badge'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone = 'neutral' | 'urgent';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-ink',
  urgent: 'bg-accent text-bg',
};

export function Badge({ tone = 'neutral', children, className }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Badge.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/Badge.test.tsx
git commit -m "feat(ui): add Badge primitive"
```

---

### Task 4: `Skeleton` primitive

**Files:**
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Test: `frontend/src/components/ui/Skeleton.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Skeleton` component, `SkeletonProps` (`className?: string`, `'aria-label'?: string`). Every future screen-content task (fases 2-7) uses this during `isPending` states — not consumed inside this phase's own layout components, but its public shape must stay stable.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('expõe role status para leitores de tela', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('usa o aria-label customizado quando informado', () => {
    render(<Skeleton aria-label="Carregando contratos" />);
    expect(screen.getByRole('status', { name: 'Carregando contratos' })).toBeInTheDocument();
  });

  it('desativa a animação sob prefers-reduced-motion', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveClass('motion-reduce:animate-none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Skeleton.test.tsx`
Expected: FAIL — `Cannot find module './Skeleton'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
  'aria-label'?: string;
}

export function Skeleton({ className, 'aria-label': ariaLabel = 'Carregando' }: SkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn('animate-pulse rounded-md bg-surface motion-reduce:animate-none', className)}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Skeleton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Skeleton.tsx frontend/src/components/ui/Skeleton.test.tsx
git commit -m "feat(ui): add Skeleton primitive"
```

---

### Task 5: `EmptyState` primitive

**Files:**
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Test: `frontend/src/components/ui/EmptyState.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `EmptyState` component, `EmptyStateProps` (`title: string`, `description?: string`, `action?: ReactNode`, `className?: string`). Consumed by future phase screens (fases 2-7) for empty lists — public shape must stay stable.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(<EmptyState title="Nenhum contrato" description="Seus contratos aparecerão aqui." />);
    expect(screen.getByText('Nenhum contrato')).toBeInTheDocument();
    expect(screen.getByText('Seus contratos aparecerão aqui.')).toBeInTheDocument();
  });

  it('renderiza a ação quando informada', () => {
    render(<EmptyState title="Nenhuma demanda" action={<button>Publicar demanda</button>} />);
    expect(screen.getByRole('button', { name: 'Publicar demanda' })).toBeInTheDocument();
  });

  it('não quebra sem descrição nem ação', () => {
    render(<EmptyState title="Vazio" />);
    expect(screen.getByText('Vazio')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx`
Expected: FAIL — `Cannot find module './EmptyState'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/EmptyState.test.tsx
git commit -m "feat(ui): add EmptyState primitive"
```

---

### Task 6: `Avatar` primitive

**Files:**
- Create: `frontend/src/components/ui/Avatar.tsx`
- Test: `frontend/src/components/ui/Avatar.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Avatar` component, `AvatarProps` (`name: string`, `src?: string | null`, `size?: 'sm' | 'md' | 'lg'`, `className?: string`). Consumed by `ProfileMenu` (Phase 1d) and `CommandPalette` result rows (Phase 1f).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renderiza as iniciais quando não há imagem', () => {
    render(<Avatar name="Maria Souza" />);
    expect(screen.getByRole('img', { name: 'Maria Souza' })).toHaveTextContent('MS');
  });

  it('renderiza a imagem quando src é informado', () => {
    render(<Avatar name="João Silva" src="https://example.com/joao.jpg" />);
    const img = screen.getByRole('img', { name: 'João Silva' }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toBe('https://example.com/joao.jpg');
  });

  it('usa apenas a primeira inicial para nome de uma palavra', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByRole('img', { name: 'Admin' })).toHaveTextContent('A');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Avatar.test.tsx`
Expected: FAIL — `Cannot find module './Avatar'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
  if (src) {
    return (
      <img src={src} alt={name} className={cn('rounded-full object-cover', sizeClasses[size], className)} />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary font-semibold text-bg',
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Avatar.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Avatar.tsx frontend/src/components/ui/Avatar.test.tsx
git commit -m "feat(ui): add Avatar primitive"
```

---

### Task 7: `Tooltip` primitive

**Files:**
- Create: `frontend/src/components/ui/Tooltip.tsx`
- Test: `frontend/src/components/ui/Tooltip.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Tooltip` component, `TooltipProps` (`label: string`, `children: ReactNode`, `className?: string`). Consumed by `Sidebar` (Phase 1e) to label collapsed icon-only nav items.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('não mostra o texto do tooltip antes do hover', () => {
    render(
      <Tooltip label="Carteira">
        <button>Ícone</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('mostra o texto do tooltip ao focar o elemento filho', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira">
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(screen.getByRole('tooltip')).toHaveTextContent('Carteira');
  });

  it('esconde o tooltip ao perder o foco', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip label="Carteira">
          <button>Ícone</button>
        </Tooltip>
        <button>Outro</button>
      </div>,
    );

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Tooltip.test.tsx`
Expected: FAIL — `Cannot find module './Tooltip'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useId, useState, type JSX, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-tooltip mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs font-medium text-bg"
        >
          {label}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Tooltip.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Tooltip.tsx frontend/src/components/ui/Tooltip.test.tsx
git commit -m "feat(ui): add Tooltip primitive"
```

---

### Task 8: `Card` primitive

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`
- Test: `frontend/src/components/ui/Card.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/src/lib/utils.ts`.
- Produces: `Card` component, `CardProps` (extends `HTMLAttributes<HTMLDivElement>`, plus `interactive?: boolean`). Per `frontend/DESIGN.md` § Components → Cards / Containers: flat at rest (`shadow-hover` only applies when `interactive`), `rounded-lg`, `24px` internal padding. Consumed by every future phase's screen-content tasks (fases 2-7) as the base card container.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renderiza o conteúdo', () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('aplica classe de sombra em hover apenas quando interactive', () => {
    render(<Card interactive>Clicável</Card>);
    expect(screen.getByText('Clicável')).toHaveClass('hover:shadow-hover');
  });

  it('não aplica sombra em hover por padrão', () => {
    render(<Card>Estático</Card>);
    expect(screen.getByText('Estático')).not.toHaveClass('hover:shadow-hover');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Card.test.tsx`
Expected: FAIL — `Cannot find module './Card'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Card.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Card.tsx frontend/src/components/ui/Card.test.tsx
git commit -m "feat(ui): add Card primitive"
```

---

Next: [plan_phase1b_overlays.md](plan_phase1b_overlays.md)
