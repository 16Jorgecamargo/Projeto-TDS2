import type { JSX } from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
  'aria-label'?: string;
}

export function Skeleton({ className, 'aria-label': ariaLabel = 'Carregando' }: SkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn('animate-pulse rounded-md bg-surface motion-reduce:animate-none', className)}
    />
  );
}
