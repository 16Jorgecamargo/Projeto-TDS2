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
