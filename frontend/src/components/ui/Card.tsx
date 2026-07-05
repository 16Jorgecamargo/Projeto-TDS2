import { Children, forwardRef, isValidElement } from 'react';
import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration, ease } from '../../lib/motion';
import { cn } from '../../lib/utils';

const cardVariants = cva('rounded-lg bg-bg', {
  variants: {
    variant: {
      flat: '',
      bordered: 'border border-border',
      elevated: 'shadow-xs',
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
    selected: {
      true: 'ring-2 ring-primary',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'flat',
    interactive: false,
    selected: false,
  },
});

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
  noPadding?: boolean;
}

function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...rest} />;
}

function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...rest} />;
}

function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-border px-6 py-4', className)} {...rest} />;
}

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant, interactive, selected, noPadding, className, children, onClick, ...rest },
  ref,
) {
  const hasStructuredChildren = Children.toArray(children).some(
    (child) =>
      isValidElement(child) &&
      (child.type === CardHeader || child.type === CardBody || child.type === CardFooter),
  );

  const classes = cn(
    cardVariants({ variant, interactive, selected }),
    !hasStructuredChildren && !noPadding && 'p-6',
    className,
  );

  if (interactive) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event as unknown as MouseEvent<HTMLDivElement>);
      }
    };

    return (
      <motion.div
        ref={ref}
        className={classes}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        whileHover={{ y: -2 }}
        transition={{ duration: duration.fast, ease: ease.standard }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref} className={classes} onClick={onClick} {...rest}>
      {children}
    </div>
  );
});

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
