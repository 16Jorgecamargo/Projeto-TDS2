# Phase 4 — useFocusTrap, Modal, Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o hook `useFocusTrap` (gap de acessibilidade mais crítico da auditoria) e reescrever Modal e Drawer conforme `docs/superpowers/specs/2026-07-03-design-system/04-primitives-overlay.md`.

**Architecture:** `useFocusTrap` é um hook puro (sem JSX), reutilizado por Modal e Drawer. Ambos ganham `AnimatePresence` para entrada/saída e passam a usar o token `overlay` no backdrop (era `bg-ink/40` hardcoded).

**Tech Stack:** `framer-motion`, `lucide-react`.

## Global Constraints

Ver `plan_index.md`. Depende de Phase 0 (`lib/motion.ts`: `fadeVariants`, `scaleVariants`, `slideVariants`, `spring`) e Phase 1 (token `overlay`).

---

### Task 1: Criar `useFocusTrap`

**Files:**
- Create: `frontend/src/lib/hooks/useFocusTrap.ts`
- Test: `frontend/src/lib/hooks/useFocusTrap.test.tsx`

**Interfaces:**
- Produces: `useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement>): void` — ao ativar, foca o primeiro elemento focável dentro de `containerRef` e cicla `Tab`/`Shift+Tab` só dentro dele; ao desativar, devolve o foco ao elemento que estava focado antes.
- Consumido por: Modal e Drawer (Tasks 2 e 3 desta fase).

- [ ] **Step 1: Escrever os testes que falham**

```tsx
import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function TestHarness({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(active, containerRef);

  return (
    <div>
      <button>Fora</button>
      <div ref={containerRef} tabIndex={-1}>
        <button>Primeiro</button>
        <button>Último</button>
      </div>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('foca o primeiro elemento focável ao ativar', () => {
    render(<TestHarness active />);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('cicla do último para o primeiro com Tab', async () => {
    const user = userEvent.setup();
    render(<TestHarness active />);
    screen.getByRole('button', { name: 'Último' }).focus();

    await user.tab();

    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('cicla do primeiro para o último com Shift+Tab', async () => {
    const user = userEvent.setup();
    render(<TestHarness active />);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/lib/hooks/useFocusTrap.test.tsx`
Expected: FAIL com `Cannot find module './useFocusTrap'`.

- [ ] **Step 3: Implementar `useFocusTrap.ts`**

```ts
import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement>): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) return;

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0] ?? container;
    first.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !container) return;

      const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [active, containerRef]);
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/lib/hooks/useFocusTrap.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/hooks/useFocusTrap.ts src/lib/hooks/useFocusTrap.test.tsx
git commit -m "feat: adiciona useFocusTrap para gestao de foco em overlays"
```

---

### Task 2: Reescrever `Modal`

**Files:**
- Modify: `frontend/src/components/ui/Modal.tsx`
- Modify: `frontend/src/components/ui/Modal.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap` de `lib/hooks/useFocusTrap.ts`, `fadeVariants`/`scaleVariants`/`spring` de `lib/motion.ts`, `cn`.
- Produces: `Modal` (`FC<ModalProps> | null`), `ModalProps { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; size?: 'sm'|'md'|'lg'; closeOnBackdropClick?: boolean; className?: string }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Modal.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Abrir disputa">
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título e conteúdo quando open=true', () => {
    render(
      <Modal open onClose={vi.fn()} title="Abrir disputa">
        <p>Motivo</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Abrir disputa' })).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('foca o primeiro elemento focável ao abrir', () => {
    render(
      <Modal open onClose={vi.fn()} title="Sacar">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('chama onClose ao clicar no backdrop por padrão', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar">
        conteúdo
      </Modal>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar no backdrop quando closeOnBackdropClick=false', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Sacar" closeOnBackdropClick={false}>
        conteúdo
      </Modal>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('aplica max-w-sm quando size=sm', () => {
    render(
      <Modal open onClose={vi.fn()} title="Sacar" size="sm">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL nos testes de foco, backdrop click e `size`.

- [ ] **Step 3: Reescrever `Modal.tsx`**

```tsx
import { useEffect, useId, useRef, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../lib/hooks/useFocusTrap';
import { fadeVariants, scaleVariants, spring } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean;
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  className,
}: ModalProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap(open, containerRef);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-overlay p-4"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={closeOnBackdropClick ? onClose : undefined}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            variants={scaleVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring.snappy}
            onClick={(event) => event.stopPropagation()}
            className={cn('w-full rounded-xl bg-bg p-6 shadow-xl', sizeClasses[size], className)}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={titleId} className="text-h4 text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {description && (
              <p id={descriptionId} className="mb-4 text-body-sm text-muted">
                {description}
              </p>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx
git commit -m "refactor: adiciona focus trap, fechar por backdrop, size e motion ao Modal"
```

---

### Task 3: Reescrever `Drawer`

**Files:**
- Modify: `frontend/src/components/ui/Drawer.tsx`
- Modify: `frontend/src/components/ui/Drawer.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap`, `fadeVariants`/`slideVariants`/`spring`/`DrawerSide` de `lib/motion.ts`, `cn`.
- Produces: `Drawer` (`FC<DrawerProps> | null`), `DrawerProps { open: boolean; onClose: () => void; title: string; side?: 'left'|'right'|'bottom'; size?: 'sm'|'md'|'lg'; children: ReactNode; className?: string }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Drawer.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('não renderiza nada quando open=false', () => {
    render(
      <Drawer open={false} onClose={vi.fn()} title="Menu">
        itens
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza no lado esquerdo quando side="left"', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" side="left">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('left-0');
  });

  it('renderiza como bottom-sheet quando side="bottom"', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" side="bottom">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('bottom-0');
  });

  it('chama onClose ao clicar no backdrop', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );

    const backdrop = document.querySelector('.bg-overlay') as HTMLElement;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar dentro do conteúdo', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer open onClose={onClose} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );

    await user.click(screen.getByText('Itens'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('aplica w-96 quando size=lg', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu" size="lg">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('w-96');
  });

  it('foca o primeiro elemento focável ao abrir', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Drawer.test.tsx`
Expected: FAIL nos testes de `side="bottom"`, `size="lg"`, foco e backdrop (`.bg-overlay` ainda não existe, hoje é `.bg-ink\/40`).

- [ ] **Step 3: Reescrever `Drawer.tsx`**

```tsx
import { useEffect, useId, useRef, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../lib/hooks/useFocusTrap';
import { fadeVariants, slideVariants, spring, type DrawerSide } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: DrawerSide;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const sideSizeClasses: Record<DrawerSide, Record<'sm' | 'md' | 'lg', string>> = {
  left: { sm: 'w-64', md: 'w-72', lg: 'w-96' },
  right: { sm: 'w-64', md: 'w-72', lg: 'w-96' },
  bottom: { sm: 'max-h-[40vh]', md: 'max-h-[60vh]', lg: 'max-h-[85vh]' },
};

const sidePositionClasses: Record<DrawerSide, string> = {
  left: 'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
  bottom: 'bottom-0 left-0 w-full',
};

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  size = 'md',
  children,
  className,
}: DrawerProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(open, containerRef);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal-backdrop bg-overlay"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={slideVariants(side)}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring.gentle}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'fixed z-modal bg-bg p-4 shadow-xl',
              sidePositionClasses[side],
              sideSizeClasses[side][size],
              className,
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={titleId} className="text-h4 text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Drawer.test.tsx`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Drawer.tsx src/components/ui/Drawer.test.tsx
git commit -m "refactor: adiciona focus trap, side bottom, size e motion ao Drawer"
```
