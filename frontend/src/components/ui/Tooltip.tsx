import { useId, useState, type JSX, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-tooltip mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs font-medium text-bg"
        >
          {label}
        </span>
      )}
    </span>
  );
}
