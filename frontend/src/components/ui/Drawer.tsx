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
