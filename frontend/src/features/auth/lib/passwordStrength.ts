export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: string;
}

const LABELS: Record<PasswordStrength['score'], string> = {
  0: 'Muito fraca',
  1: 'Fraca',
  2: 'Media',
  3: 'Forte',
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return { score: 0, label: LABELS[0] };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  let score: PasswordStrength['score'] = 1;
  if (variety >= 3) {
    score = 3;
  } else if (variety === 2) {
    score = 2;
  }

  return { score, label: LABELS[score] };
}
