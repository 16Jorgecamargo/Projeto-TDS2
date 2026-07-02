import type { JSX } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
  if (src) {
    return (
      <img src={src} alt={name} className={cn('rounded-full object-cover', sizeClasses[size], className)} />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary font-semibold text-bg',
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
