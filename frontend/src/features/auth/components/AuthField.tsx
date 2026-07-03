import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, error, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        ref={ref}
        className="rounded-sm border border-surface px-3 py-2 text-ink focus:border-primary focus:outline-none"
        {...props}
      />
      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </label>
  );
});
