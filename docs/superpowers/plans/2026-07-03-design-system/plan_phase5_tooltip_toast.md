# Phase 5 — Tooltip & Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever Tooltip e Toast conforme `docs/superpowers/specs/2026-07-03-design-system/04-primitives-overlay.md`.

**Architecture:** Tooltip ganha `side` e `delayMs` configuráveis com `AnimatePresence`. Toast ganha tons completos (`success`/`warning`/`info`), ação inline opcional e pausa de auto-dismiss no hover — a store (`useToastStore`) mantém a mesma forma básica (`push(message, tone?, options?)`), só estendida; `useToast()` (o hook público) passa a receber um objeto de opções em vez de um segundo argumento posicional de tom.

**Tech Stack:** `class-variance-authority`, `framer-motion`, `lucide-react`.

## Global Constraints

Ver `plan_index.md`. Depende de Phase 0 (`lib/motion.ts`) e Phase 1 (tokens `success`/`warning`/`info`/`danger`). A única chamada de `useToast()` fora de `components/ui` é em `ImageUpload.tsx:46` (confirmado por grep antes de escrever este plano) — atualizada na Task 2 desta fase.

---

### Task 1: Reescrever `Tooltip`

**Files:**
- Modify: `frontend/src/components/ui/Tooltip.tsx`
- Modify: `frontend/src/components/ui/Tooltip.test.tsx`

**Interfaces:**
- Consumes: `cn`, `duration` de `lib/motion.ts`.
- Produces: `Tooltip` (`FC<TooltipProps>`), `TooltipProps { label: string; children: ReactNode; side?: 'top'|'bottom'|'left'|'right'; delayMs?: number; className?: string }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Tooltip.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('não mostra o texto do tooltip antes do hover', () => {
    render(
      <Tooltip label="Carteira" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('mostra o texto do tooltip ao focar o elemento filho', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Carteira');
  });

  it('esconde o tooltip ao perder o foco', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tooltip label="Carteira" delayMs={0}>
          <button>Ícone</button>
        </Tooltip>
        <button>Outro</button>
      </div>,
    );

    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('respeita o delayMs configurado antes de mostrar', async () => {
    render(
      <Tooltip label="Carteira" delayMs={150}>
        <button>Ícone</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText('Ícone'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    expect(await screen.findByRole('tooltip', {}, { timeout: 500 })).toHaveTextContent('Carteira');
  });

  it('posiciona à direita quando side="right"', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Carteira" side="right" delayMs={0}>
        <button>Ícone</button>
      </Tooltip>,
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveClass('left-full');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Tooltip.test.tsx`
Expected: FAIL nos testes de `delayMs` e `side="right"`.

- [ ] **Step 3: Reescrever `Tooltip.tsx`**

```tsx
import { useId, useRef, useState, type JSX, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  delayMs?: number;
  className?: string;
}

const positionClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

const hiddenOffset: Record<TooltipSide, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

export function Tooltip({
  label,
  children,
  side = 'top',
  delayMs = 200,
  className,
}: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  }

  function hide() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      <AnimatePresence>
        {visible && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, ...hiddenOffset[side] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...hiddenOffset[side] }}
            transition={{ duration: duration.fast }}
            className={cn(
              'absolute z-tooltip whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-caption font-medium text-bg',
              positionClasses[side],
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Tooltip.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Tooltip.tsx src/components/ui/Tooltip.test.tsx
git commit -m "refactor: adiciona side, delayMs e motion ao Tooltip"
```

---

### Task 2: Reescrever `Toast`

**Files:**
- Modify: `frontend/src/components/ui/Toast.tsx`
- Modify: `frontend/src/components/ui/Toast.test.tsx`
- Modify: `frontend/src/components/ui/ImageUpload.tsx:46`

**Interfaces:**
- Consumes: `cn`, `spring` de `lib/motion.ts`.
- Produces: `useToastStore` (Zustand store, `push(message: string, tone?: ToastTone, options?: { action?: ToastAction; durationMs?: number }): void`, `dismiss(id: string): void`), `useToast()` retornando `{ toast(message: string, options?: { tone?: ToastTone; action?: ToastAction; durationMs?: number }): void }`, `ToastProvider`, tipos `ToastTone = 'default'|'success'|'warning'|'error'|'info'`, `ToastAction { label: string; onClick: () => void }`, `ToastItem`.

O hook `useToast()` muda de assinatura (`toast(message, tone?)` → `toast(message, options?)`). A única chamada existente fora de `components/ui` é `ImageUpload.tsx:46`, atualizada no Step 4 desta task.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Toast.test.tsx` por:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
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

  it('aplica tom danger e role alert no tom error', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Falha de rede', 'error');
    });
    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveTextContent('Falha de rede');
    expect(toastElement).toHaveClass('bg-danger');
  });

  it('aplica tom success com role status', () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Demanda criada com sucesso', 'success');
    });
    const toastElement = screen.getByRole('status');
    expect(toastElement).toHaveClass('bg-success');
  });

  it('chama a ação e dispensa o toast ao clicar no botão de ação', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Item removido', 'default', {
        action: { label: 'Desfazer', onClick: onAction },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Item removido')).not.toBeInTheDocument();
  });

  it('pausa o temporizador de auto-dismiss durante o hover', async () => {
    render(<ToastProvider />);
    act(() => {
      useToastStore.getState().push('Mensagem', 'default', { durationMs: 150 });
    });

    const toastElement = screen.getByText('Mensagem').closest('[role="status"]') as HTMLElement;
    fireEvent.mouseEnter(toastElement);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.getByText('Mensagem')).toBeInTheDocument();

    fireEvent.mouseLeave(toastElement);
    await waitFor(() => expect(screen.queryByText('Mensagem')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });
});
```

(Adicionar `import { vi } from 'vitest';` junto do `describe, it, expect, beforeEach` já importado, caso o linter de imports não detecte `vi` como global.)

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Toast.test.tsx`
Expected: FAIL nos testes de `success`, `role alert`, `action` e pausa no hover.

- [ ] **Step 3: Reescrever `Toast.tsx`**

```tsx
import { useEffect, useRef, useState, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { cva, type VariantProps } from 'class-variance-authority';
import { spring } from '../../lib/motion';
import { cn } from '../../lib/utils';

export type ToastTone = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
}

interface ToastPushOptions {
  action?: ToastAction;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone, options?: ToastPushOptions) => void;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS = 5000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'default', options) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: crypto.randomUUID(),
          message,
          tone,
          action: options?.action,
          durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
        },
      ],
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function useToast(): {
  toast: (message: string, options?: { tone?: ToastTone } & ToastPushOptions) => void;
} {
  const push = useToastStore((state) => state.push);
  return {
    toast: (message, options) => push(message, options?.tone ?? 'default', options),
  };
}

const toastVariants = cva(
  'pointer-events-auto w-[calc(100%-2rem)] rounded-md px-4 py-3 text-body-sm font-medium shadow-lg sm:w-80',
  {
    variants: {
      tone: {
        default: 'bg-ink text-bg',
        success: 'bg-success text-bg',
        warning: 'bg-warning text-ink',
        error: 'bg-danger text-bg',
        info: 'bg-info text-bg',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

function ToastCard({ item }: { item: ToastItem }): JSX.Element {
  const dismiss = useToastStore((state) => state.dismiss);
  const remainingRef = useRef(item.durationMs);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTimer(ms: number) {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => dismiss(item.id), ms);
  }

  useEffect(() => {
    startTimer(remainingRef.current);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleMouseEnter() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startedAtRef.current;
      remainingRef.current = Math.max(remainingRef.current - elapsed, 0);
    }
  }

  function handleMouseLeave() {
    startTimer(remainingRef.current);
  }

  function handleActionClick() {
    item.action?.onClick();
    dismiss(item.id);
  }

  const isAlert = item.tone === 'error' || item.tone === 'warning';

  return (
    <motion.div
      role={isAlert ? 'alert' : 'status'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32 }}
      transition={spring.snappy}
      className={cn(toastVariants({ tone: item.tone }))}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{item.message}</span>
        <div className="flex items-center gap-2">
          {item.action && (
            <button type="button" onClick={handleActionClick} className="underline">
              {item.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Fechar notificação"
            className="opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
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
      <AnimatePresence>
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>,
    container,
  );
}
```

- [ ] **Step 4: Atualizar a chamada de `toast(...)` em `ImageUpload.tsx`**

Em `frontend/src/components/ui/ImageUpload.tsx:46`, trocar:
```tsx
      toast('Falha ao enviar imagem', 'error');
```
por:
```tsx
      toast('Falha ao enviar imagem', { tone: 'error' });
```

- [ ] **Step 5: Rodar os testes de Toast e ImageUpload e o typecheck**

Run:
```bash
cd frontend && npx vitest run src/components/ui/Toast.test.tsx src/components/ui/ImageUpload.test.tsx && npx tsc --noEmit
```
Expected: todos os testes PASS, `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ui/Toast.tsx src/components/ui/Toast.test.tsx src/components/ui/ImageUpload.tsx
git commit -m "refactor: adiciona tons completos, acao inline e pausa no hover ao Toast"
```

---

### Task 3: Rodar a suíte completa e o build final

**Files:**
- Nenhum arquivo modificado — verificação final de todas as fases.

**Interfaces:**
- N/A.

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `cd frontend && npx vitest run`
Expected: todos os testes PASS (os 11 componentes reescritos + `lib/motion.ts`, `lib/slot.tsx`, `lib/hooks/useFocusTrap.ts`).

- [ ] **Step 2: Rodar o build completo**

Run: `cd frontend && npm run build`
Expected: `tsc --noEmit` sem erros, `vite build` conclui sem falhas.

- [ ] **Step 3: Commit final (se houver qualquer arquivo pendente)**

```bash
cd frontend && git status
```
Se não houver nada pendente, nenhum commit é necessário — a Phase 5 já commitou tudo nas tasks anteriores. Este step é só uma confirmação de que a árvore de trabalho está limpa antes de considerar o plano concluído.
