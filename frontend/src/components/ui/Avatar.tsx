import { useState } from 'react';
import type { JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

const avatarVariants = cva('inline-flex items-center justify-center rounded-full font-semibold', {
  variants: {
    size: {
      sm: 'h-8 w-8 text-caption',
      md: 'h-10 w-10 text-body-sm',
      lg: 'h-14 w-14 text-h4',
      xl: 'h-20 w-20 text-h3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const statusClasses: Record<'online' | 'offline' | 'busy', string> = {
  online: 'bg-success',
  offline: 'bg-muted',
  busy: 'bg-warning',
};

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
export type AvatarStatus = 'online' | 'offline' | 'busy';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span className={cn('relative inline-flex', className)}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          onError={() => setImageFailed(true)}
          className={cn('rounded-full object-cover', avatarVariants({ size }))}
        />
      ) : (
        <motion.span
          role="img"
          aria-label={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration.fast }}
          className={cn('bg-primary text-bg', avatarVariants({ size }))}
        >
          {initials(name)}
        </motion.span>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-bg',
            statusClasses[status],
          )}
        />
      )}
    </span>
  );
}
