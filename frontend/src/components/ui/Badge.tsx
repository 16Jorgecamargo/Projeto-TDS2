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

type ConflictingNativeHandlers =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd';

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, ConflictingNativeHandlers>,
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
