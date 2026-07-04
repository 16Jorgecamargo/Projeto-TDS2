import { useEffect, useRef, useState, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { cva } from 'class-variance-authority';
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
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
      timerRef.current = null;
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
