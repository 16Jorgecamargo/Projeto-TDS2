import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '../../../lib/utils';

export interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, error, icon, endAdornment, className, ...props },
  ref,
) {
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium text-ink">{label}</span>
        <div className="relative flex items-center">
          {icon ? (
            <span aria-hidden="true" className="pointer-events-none absolute left-3 text-muted">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'w-full rounded-sm border border-border px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-focus',
              icon ? 'pl-9' : undefined,
              endAdornment ? 'pr-9' : undefined,
              className,
            )}
            {...props}
          />
          {endAdornment ? <span className="absolute right-2">{endAdornment}</span> : null}
        </div>
      </label>
      {error ? (
        <span id={errorId} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
});
