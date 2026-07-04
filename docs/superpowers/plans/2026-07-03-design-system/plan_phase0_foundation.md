# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar as dependências novas e criar a fundação compartilhada (`lib/motion.ts`, `lib/slot.tsx`) usada por todos os componentes das fases seguintes.

**Architecture:** Duas peças isoladas e sem dependência mútua: constantes/variants de motion (puro dado, sem JSX) e o padrão `Slot` para `asChild` (usado só pelo Button).

**Tech Stack:** `class-variance-authority`, `framer-motion`, `lucide-react`, Vitest.

## Global Constraints

Ver `plan_index.md`. Em especial: sem comentários no código, nomes em inglês, `cn` existente (`frontend/src/lib/utils.ts:1-3`) é mantido como está.

---

### Task 1: Instalar dependências novas

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: pacotes `class-variance-authority`, `framer-motion`, `lucide-react` disponíveis para import em todo `frontend/src`.

- [ ] **Step 1: Instalar os pacotes**

Run (a partir de `frontend/`):
```bash
cd frontend && npm install class-variance-authority framer-motion lucide-react
```
Expected: `package.json` ganha as 3 entradas em `dependencies`, `package-lock.json` atualizado, sem erro de peer dependency (todas as libs suportam React 19).

- [ ] **Step 2: Verificar instalação**

Run:
```bash
cd frontend && node -e "require('framer-motion'); require('class-variance-authority'); require('lucide-react'); console.log('ok')"
```
Expected: imprime `ok`.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add package.json package-lock.json
git commit -m "chore: adiciona class-variance-authority, framer-motion e lucide-react"
```

---

### Task 2: Criar `lib/motion.ts`

**Files:**
- Create: `frontend/src/lib/motion.ts`
- Test: `frontend/src/lib/motion.test.ts`

**Interfaces:**
- Produces: `duration: { fast: number; base: number; slow: number }`, `ease: { standard: number[]; decelerate: number[]; accelerate: number[] }`, `spring: { snappy: object; gentle: object }`, `fadeVariants: Variants`, `scaleVariants: Variants`, `slideVariants(side: 'left' | 'right' | 'bottom'): Variants`, `type DrawerSide = 'left' | 'right' | 'bottom'`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { slideVariants } from './motion';

describe('slideVariants', () => {
  it('esconde para a esquerda quando side="left"', () => {
    const variants = slideVariants('left');
    expect(variants.hidden).toMatchObject({ opacity: 0, x: '-100%' });
    expect(variants.visible).toMatchObject({ opacity: 1, x: 0 });
  });

  it('esconde para a direita quando side="right"', () => {
    const variants = slideVariants('right');
    expect(variants.hidden).toMatchObject({ opacity: 0, x: '100%' });
  });

  it('esconde para baixo quando side="bottom"', () => {
    const variants = slideVariants('bottom');
    expect(variants.hidden).toMatchObject({ opacity: 0, y: '100%' });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd frontend && npx vitest run src/lib/motion.test.ts`
Expected: FAIL com `Cannot find module './motion'` ou `slideVariants is not a function`.

- [ ] **Step 3: Implementar `lib/motion.ts`**

```ts
import type { Variants } from 'framer-motion';

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

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export type DrawerSide = 'left' | 'right' | 'bottom';

export function slideVariants(side: DrawerSide): Variants {
  const hiddenOffset =
    side === 'left' ? { x: '-100%' } : side === 'right' ? { x: '100%' } : { y: '100%' };

  return {
    hidden: { opacity: 0, ...hiddenOffset },
    visible: { opacity: 1, x: 0, y: 0 },
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd frontend && npx vitest run src/lib/motion.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat: adiciona tokens e variants de motion compartilhados"
```

---

### Task 3: Criar `lib/slot.tsx` (padrão `asChild`)

**Files:**
- Create: `frontend/src/lib/slot.tsx`
- Test: `frontend/src/lib/slot.test.tsx`

**Interfaces:**
- Consumes: nenhuma (usa só `react`).
- Produces: `Slot`, componente `forwardRef<HTMLElement, SlotProps>` que clona seu único filho válido, mesclando `className` e demais props recebidas. Usado pelo Button (Phase 2) quando `asChild=true`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slot } from './slot';

describe('Slot', () => {
  it('clona o filho aplicando props e mesclando className', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Slot className="extra-class" onClick={onClick}>
        <a href="/perfil" className="base-class">
          Perfil
        </a>
      </Slot>,
    );

    const link = screen.getByRole('link', { name: 'Perfil' });
    expect(link).toHaveClass('base-class');
    expect(link).toHaveClass('extra-class');

    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('retorna null quando não há filho válido', () => {
    const { container } = render(<Slot>{null as unknown as never}</Slot>);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd frontend && npx vitest run src/lib/slot.test.tsx`
Expected: FAIL com `Cannot find module './slot'`.

- [ ] **Step 3: Implementar `lib/slot.tsx`**

```tsx
import { cloneElement, forwardRef, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children: ReactElement;
}

export const Slot = forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, className, ...props },
  ref,
) {
  if (!isValidElement(children)) {
    return null;
  }

  const childProps = children.props as Record<string, unknown>;
  const childClassName = typeof childProps.className === 'string' ? childProps.className : '';

  return cloneElement(children, {
    ...props,
    ...childProps,
    className: [childClassName, className].filter(Boolean).join(' '),
    ref,
  } as never);
});
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd frontend && npx vitest run src/lib/slot.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/slot.tsx src/lib/slot.test.tsx
git commit -m "feat: adiciona Slot para suportar asChild no Button"
```
