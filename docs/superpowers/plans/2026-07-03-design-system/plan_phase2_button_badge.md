# Phase 2 — Button & Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever `Button` e `Badge` conforme `docs/superpowers/specs/2026-07-03-design-system/02-primitives-buttons-inputs.md`.

**Architecture:** Ambos migram de `Record<Variant, string>` manual para `cva`. Button ganha `loading`, `size="lg"/"icon"`, `variant="danger"`, `asChild` (via `Slot` da Phase 0) e motion via `framer-motion`. Badge ganha tons `success`/`warning`/`danger`/`info`, `size`, e motion de entrada.

**Tech Stack:** `class-variance-authority`, `framer-motion`, `lucide-react`.

## Global Constraints

Ver `plan_index.md`. Depende de `lib/motion.ts` e `lib/slot.tsx` (Phase 0) e dos tokens de cor (Phase 1) já aplicados.

---

### Task 1: Reescrever `Button`

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Button.test.tsx`

**Interfaces:**
- Consumes: `cn` de `frontend/src/lib/utils.ts`, `Slot` de `frontend/src/lib/slot.tsx`, `duration`/`ease` de `frontend/src/lib/motion.ts`.
- Produces: `Button` (`forwardRef<HTMLButtonElement, ButtonProps>`), `ButtonProps { variant?: 'primary'|'accent'|'ghost'|'danger'; size?: 'sm'|'md'|'lg'|'icon'; loading?: boolean; asChild?: boolean }`, tipos `ButtonVariant`, `ButtonSize`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Button.test.tsx` por:

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

  it('aplica a classe de fundo da variante danger', () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('bg-danger');
  });

  it('fica desabilitado quando disabled=true', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('fica desabilitado e com aria-busy quando loading=true', () => {
    render(<Button loading>Enviar</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renderiza como o filho quando asChild=true', () => {
    render(
      <Button asChild variant="ghost">
        <a href="/perfil">Ver perfil</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Ver perfil' });
    expect(link).toHaveClass('bg-transparent');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Button.test.tsx`
Expected: FAIL nos testes de `danger`, `loading` e `asChild` (props ainda não existem).

- [ ] **Step 3: Reescrever `Button.tsx`**

```tsx
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Slot } from '../../lib/slot';
import { duration, ease } from '../../lib/motion';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-bg hover:bg-primary-hover',
        accent: 'bg-accent text-bg hover:bg-accent-hover',
        ghost: 'bg-transparent text-ink border border-border hover:bg-surface',
        danger: 'bg-danger text-bg hover:bg-danger-hover',
      },
      size: {
        sm: 'px-3 py-1.5 text-body-sm',
        md: 'px-5 py-2.5 text-button',
        lg: 'px-6 py-3.5 text-body-lg',
        icon: 'p-2.5 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, children, loading = false, asChild = false, disabled, ...rest },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const isDisabled = disabled || loading;

  if (asChild) {
    return (
      <Slot ref={ref as never} className={classes} {...rest}>
        {children as ReactElement}
      </Slot>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: duration.fast, ease: ease.standard }}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : children}
    </motion.button>
  );
});
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Button.test.tsx`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "refactor: reescreve Button com cva, loading, asChild e motion"
```

---

### Task 2: Reescrever `Badge`

**Files:**
- Modify: `frontend/src/components/ui/Badge.tsx`
- Modify: `frontend/src/components/ui/Badge.test.tsx`
- Modify: `frontend/src/features/professional/components/ProfessionalCard.tsx:38`
- Modify: `frontend/src/features/notifications/pages/NotificationsPage.tsx:36`

**Interfaces:**
- Consumes: `cn`, `duration` de `lib/motion.ts`.
- Produces: `Badge` (`FC<BadgeProps>`), `BadgeProps { tone?: 'neutral'|'accent'|'success'|'warning'|'danger'|'info'; size?: 'sm'|'md' }`, tipos `BadgeTone`, `BadgeSize`.

`tone="urgent"` é renomeado para `tone="accent"` (mesma cor visual, nome mais claro). Os 2 usos existentes no projeto (`ProfessionalCard.tsx:38`, `NotificationsPage.tsx:36`) são atualizados nesta mesma task — são as duas únicas ocorrências (confirmado via grep antes de escrever este plano), então não é redesign de tela, é acompanhar a troca de nome da prop que a tela já usava.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Badge.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza o conteúdo', () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('usa fundo accent no tom accent', () => {
    render(<Badge tone="accent">3</Badge>);
    expect(screen.getByText('3')).toHaveClass('bg-accent');
  });

  it('usa fundo surface no tom neutral por padrão', () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText('Pendente')).toHaveClass('bg-surface');
  });

  it('usa cor de success no tom success', () => {
    render(<Badge tone="success">Concluído</Badge>);
    expect(screen.getByText('Concluído')).toHaveClass('text-success');
  });

  it('aplica o tamanho sm', () => {
    render(<Badge size="sm">Pequeno</Badge>);
    expect(screen.getByText('Pequeno')).toHaveClass('text-caption');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Badge.test.tsx`
Expected: FAIL nos testes de `tone="accent"`, `tone="success"` e `size="sm"`.

- [ ] **Step 3: Reescrever `Badge.tsx`**

```tsx
import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface text-ink',
      accent: 'bg-accent text-bg',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-danger/15 text-danger',
      info: 'bg-info/15 text-info',
    },
    size: {
      sm: 'px-2 py-0.5 text-caption',
      md: 'px-3 py-1 text-label',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'md',
  },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
}

export function Badge({ tone, size, className, children, ...rest }: BadgeProps): JSX.Element {
  return (
    <motion.span
      className={cn(badgeVariants({ tone, size }), className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: duration.fast }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}
```

- [ ] **Step 4: Atualizar os 2 usos de `tone="urgent"`**

Em `frontend/src/features/professional/components/ProfessionalCard.tsx:38`, trocar:
```tsx
{isAvailable && <Badge tone="urgent">Disponível agora</Badge>}
```
por:
```tsx
{isAvailable && <Badge tone="accent">Disponível agora</Badge>}
```

Em `frontend/src/features/notifications/pages/NotificationsPage.tsx:36`, trocar:
```tsx
{!notification.readAt && <Badge tone="urgent">Não lida</Badge>}
```
por:
```tsx
{!notification.readAt && <Badge tone="accent">Não lida</Badge>}
```

- [ ] **Step 5: Rodar os testes e o typecheck**

Run:
```bash
cd frontend && npx vitest run src/components/ui/Badge.test.tsx && npx tsc --noEmit
```
Expected: 5 testes PASS, `tsc` sem erros (confirma que não sobrou nenhum `tone="urgent"` no projeto).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ui/Badge.tsx src/components/ui/Badge.test.tsx src/features/professional/components/ProfessionalCard.tsx src/features/notifications/pages/NotificationsPage.tsx
git commit -m "refactor: reescreve Badge com cva, tons completos e renomeia urgent para accent"
```
