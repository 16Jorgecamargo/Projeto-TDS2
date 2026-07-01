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
      <span className="font-medium text-slate-700">{label}</span>
      <input
        ref={ref}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
