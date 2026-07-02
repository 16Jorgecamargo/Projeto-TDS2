# Phase 1b: Overlay Primitives (Toast, Modal, Drawer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on [plan_phase1a_tokens_and_primitives.md](plan_phase1a_tokens_and_primitives.md) (Tailwind tokens).

---

### Task 1: `Toast` + `ToastProvider`

**Files:**
- Create: `frontend/src/components/ui/Toast.tsx`
- Test: `frontend/src/components/ui/Toast.test.tsx`

**Interfaces:**
- Produces: `useToastStore` (Zustand store, shape `{ toasts: ToastItem[]; push: (message: string, tone?: 'default' | 'error') => void; dismiss: (id: string) => void }`), `useToast()` hook returning `{ toast: (message: string, tone?: 'default' | 'error') => void }`, `ToastProvider` component (mounted once, globally, in Phase 1g's `AppShell`). Any future task that needs to surface a network error calls `useToast().toast(message, 'error')`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToastStore } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renderiza um toast empurrado na store', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Contrato atualizado');
    });
    expect(screen.getByText('Contrato atualizado')).toBeInTheDocument();
  });

  it('remove o toast ao clicar em fechar', async () => {
    const user = userEvent.setup();
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Erro ao salvar', 'error');
    });

    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(screen.queryByText('Erro ao salvar')).not.toBeInTheDocument();
  });

  it('aplica tom de erro com fundo accent', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Falha de rede', 'error');
    });
    expect(screen.getByText('Falha de rede').closest('[role="status"]')).toHaveClass('bg-accent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Toast.test.tsx`
Expected: FAIL — `Cannot find module './Toast'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useEffect, useState, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { cn } from '../../lib/utils';

export type ToastTone = 'default' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'default') =>
    set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), message, tone }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function useToast(): { toast: (message: string, tone?: ToastTone) => void } {
  const push = useToastStore((state) => state.push);
  return { toast: push };
}

const AUTO_DISMISS_MS = 5000;

function ToastCard({ item }: { item: ToastItem }): JSX.Element {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto w-80 rounded-md px-4 py-3 text-sm font-medium shadow-modal',
        item.tone === 'error' ? 'bg-accent text-bg' : 'bg-ink text-bg',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{item.message}</span>
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Fechar notificação"
          className="text-bg/70 hover:text-bg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ToastProvider(): JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts);
  const [container] = useState(() => {
    const node = document.createElement('div');
    node.setAttribute('id', 'toast-viewport');
    return node;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-toast flex flex-col gap-2">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    container,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Toast.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Toast.tsx frontend/src/components/ui/Toast.test.tsx
git commit -m "feat(ui): adiciona primitivo Toast com store global"
```

---

### Task 2: `Modal` primitive

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`
- Test: `frontend/src/components/ui/Modal.test.tsx`

**Interfaces:**
- Produces: `Modal` component, `ModalProps` (`open: boolean`, `onClose: () => void`, `title: string`, `children: ReactNode`, `className?: string`). Consumed by `CommandPalette` (Phase 1f) and by future phases' dialogs (`InviteProfessionalDialog`, `DisputeDialog`, `WithdrawDialog` in fases 2/4).

- [ ] **Step 1: Write the failing test**

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL — `Cannot find module './Modal'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useEffect, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('z-modal w-full max-w-lg rounded-lg bg-bg p-6 shadow-modal', className)}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx frontend/src/components/ui/Modal.test.tsx
git commit -m "feat(ui): adiciona primitivo Modal"
```

---

### Task 3: `Drawer` primitive

**Files:**
- Create: `frontend/src/components/ui/Drawer.tsx`
- Test: `frontend/src/components/ui/Drawer.test.tsx`

**Interfaces:**
- Produces: `Drawer` component, `DrawerProps` (`open: boolean`, `onClose: () => void`, `title: string`, `side?: 'left' | 'right'`, `children: ReactNode`). Consumed by `MobileNav` (Phase 1e) with `side="left"`.

- [ ] **Step 1: Write the failing test**

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

  it('chama onClose ao clicar no backdrop', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Drawer open onClose={onClose} title="Menu">
        <p>Itens</p>
      </Drawer>,
    );

    const backdrop = container.querySelector('.bg-ink\\/40') as HTMLElement;
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Drawer.test.tsx`
Expected: FAIL — `Cannot find module './Drawer'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useEffect, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  children: ReactNode;
}

export function Drawer({ open, onClose, title, side = 'right', children }: DrawerProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-backdrop bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'fixed top-0 z-modal h-full w-72 bg-bg p-4 shadow-modal',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Drawer.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Drawer.tsx frontend/src/components/ui/Drawer.test.tsx
git commit -m "feat(ui): adiciona primitivo Drawer"
```

---

Next: [plan_phase1c_nav_and_stores.md](plan_phase1c_nav_and_stores.md)
