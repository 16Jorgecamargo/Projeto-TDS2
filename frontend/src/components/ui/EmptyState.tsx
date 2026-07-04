import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

const emptyStateVariants = cva(
  'flex flex-col items-center gap-2 rounded-lg px-6 py-8 text-center sm:py-12',
  {
    variants: {
      variant: {
        empty: 'bg-surface',
        error: 'bg-danger/5 border border-danger/20',
      },
    },
    defaultVariants: {
      variant: 'empty',
    },
  },
);

export type EmptyStateVariant = NonNullable<VariantProps<typeof emptyStateVariants>['variant']>;

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'>,
    VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant,
  className,
  ...rest
}: EmptyStateProps): JSX.Element {
  return (
    <motion.div
      role={variant === 'error' ? 'alert' : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.base }}
      className={cn(emptyStateVariants({ variant }), className)}
      {...rest}
    >
      {icon && (
        <div aria-hidden="true" className="text-muted">
          {icon}
        </div>
      )}
      <p className="text-h4 text-ink">{title}</p>
      {description && <p className="text-body-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
