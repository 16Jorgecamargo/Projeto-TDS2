import type { HTMLAttributes, JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const skeletonVariants = cva('animate-pulse bg-surface motion-reduce:animate-none', {
  variants: {
    variant: {
      rect: 'rounded-md',
      circle: 'rounded-full',
      text: 'rounded-sm h-4',
    },
  },
  defaultVariants: {
    variant: 'rect',
  },
});

export type SkeletonVariant = NonNullable<VariantProps<typeof skeletonVariants>['variant']>;

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  'aria-label'?: string;
}

export function Skeleton({
  variant,
  className,
  'aria-label': ariaLabel = 'Carregando',
  ...rest
}: SkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(skeletonVariants({ variant }), className)}
      {...rest}
    />
  );
}
