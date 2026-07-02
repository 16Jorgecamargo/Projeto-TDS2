import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ interactive = false, className, children, ...rest }: CardProps): JSX.Element {
  return (
    <div
      className={cn('rounded-lg bg-bg p-6', interactive && 'cursor-pointer transition-shadow hover:shadow-hover', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
