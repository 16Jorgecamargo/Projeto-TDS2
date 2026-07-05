import type { JSX } from 'react';
import { getPasswordStrength } from '../lib/passwordStrength';
import { cn } from '../../../lib/utils';

interface PasswordStrengthBarProps {
  password: string;
}

const TONE_BY_SCORE: Record<number, string> = {
  0: 'bg-danger',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-success',
};

const WIDTH_BY_SCORE: Record<number, string> = {
  0: 'w-1/4',
  1: 'w-1/3',
  2: 'w-2/3',
  3: 'w-full',
};

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps): JSX.Element | null {
  if (!password) {
    return null;
  }

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          data-testid="password-strength-fill"
          className={cn('h-full rounded-full transition-all', TONE_BY_SCORE[score], WIDTH_BY_SCORE[score])}
        />
      </div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
