import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Slot } from '../../lib/slot';
import { duration, ease } from '../../lib/motion';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-bg hover:bg-primary-hover',
        accent: 'bg-accent text-bg hover:bg-accent-hover',
        ghost: 'bg-transparent text-ink border border-border hover:bg-surface',
        danger: 'bg-danger text-bg hover:bg-danger-hover',
      },
      size: {
        sm: 'px-3 py-1.5 text-body-sm',
        md: 'px-5 py-2.5 text-button',
        lg: 'px-6 py-3.5 text-body-lg',
        icon: 'p-2.5 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type ConflictingNativeHandlers =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingNativeHandlers>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, children, loading = false, asChild = false, disabled, ...rest },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const isDisabled = disabled || loading;

  if (asChild) {
    return (
      <Slot
        ref={ref as never}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        {...rest}
      >
        {children as ReactElement}
      </Slot>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: duration.fast, ease: ease.standard }}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : children}
    </motion.button>
  );
});
