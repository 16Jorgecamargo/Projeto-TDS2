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
