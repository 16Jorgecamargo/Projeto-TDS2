# Fase 2 — AuthField evoluído + PasswordStrengthBar

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 1 já mesclada (usa os mesmos padrões de import).

**Goal desta fase:** Atualizar o único input primitive do projeto (`AuthField`, local à feature de auth — evoluir, não é criar primitivo novo em `components/ui`) para os tokens novos do design system, ícone opcional, `endAdornment` opcional e atributos ARIA de erro. Criar `PasswordStrengthBar`, componente local de feature (não `components/ui`) reusado por Register e ResetPassword.

**Files:**
- Modify: `frontend/src/features/auth/components/AuthField.tsx`
- Modify: `frontend/src/features/auth/components/AuthField.test.tsx`
- Create: `frontend/src/features/auth/lib/passwordStrength.ts`
- Test: `frontend/src/features/auth/lib/passwordStrength.test.ts`
- Create: `frontend/src/features/auth/components/PasswordStrengthBar.tsx`
- Test: `frontend/src/features/auth/components/PasswordStrengthBar.test.tsx`

**Interfaces:**
- Produces: `AuthField` — API pública anterior (`label`, `error`, mais todas as `InputHTMLAttributes<HTMLInputElement>`) preservada, com dois novos campos opcionais: `icon?: ReactNode`, `endAdornment?: ReactNode`. Fases 3-7 usam esses dois campos pra ícone de mail/lock e toggle de mostrar senha.
- Produces: `getPasswordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string }` de `frontend/src/features/auth/lib/passwordStrength.ts`.
- Produces: `PasswordStrengthBar` — `{ password: string }`, de `frontend/src/features/auth/components/PasswordStrengthBar.tsx`. Consumido por Register (Fase 4) e ResetPassword (Fase 6).
- Consumes: `cn` de `frontend/src/lib/utils.ts` (já existe).

---

### Task 1: `getPasswordStrength`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/auth/lib/passwordStrength.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getPasswordStrength } from './passwordStrength';

describe('getPasswordStrength', () => {
  it('retorna score 0 para senha vazia ou muito curta', () => {
    expect(getPasswordStrength('').score).toBe(0);
    expect(getPasswordStrength('abc').score).toBe(0);
  });

  it('retorna score 1 para senha so com letras minusculas e 8+ caracteres', () => {
    expect(getPasswordStrength('abcdefgh').score).toBe(1);
  });

  it('retorna score 2 para senha com letras e numeros', () => {
    expect(getPasswordStrength('abcdefg1').score).toBe(2);
  });

  it('retorna score 3 para senha com letras, numeros e simbolo', () => {
    expect(getPasswordStrength('Abcdefg1!').score).toBe(3);
  });

  it('retorna o label correspondente a cada score', () => {
    expect(getPasswordStrength('').label).toBe('Muito fraca');
    expect(getPasswordStrength('abcdefgh').label).toBe('Fraca');
    expect(getPasswordStrength('abcdefg1').label).toBe('Media');
    expect(getPasswordStrength('Abcdefg1!').label).toBe('Forte');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- passwordStrength.test.ts`
Expected: FAIL com `Cannot find module './passwordStrength'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/auth/lib/passwordStrength.ts`:

```ts
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- passwordStrength.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/lib/passwordStrength.ts frontend/src/features/auth/lib/passwordStrength.test.ts
git commit -m "feat: adiciona calculo de forca de senha para telas de auth"
```

---

### Task 2: `PasswordStrengthBar`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/auth/components/PasswordStrengthBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthBar } from './PasswordStrengthBar';

describe('PasswordStrengthBar', () => {
  it('nao renderiza nada quando a senha esta vazia', () => {
    const { container } = render(<PasswordStrengthBar password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o label de forca correspondente a senha', () => {
    render(<PasswordStrengthBar password="Abcdefg1!" />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('aplica a cor de tom success quando a senha e forte', () => {
    render(<PasswordStrengthBar password="Abcdefg1!" />);
    const bar = screen.getByTestId('password-strength-fill');
    expect(bar.className).toContain('bg-success');
  });

  it('aplica a cor de tom danger quando a senha e fraca', () => {
    render(<PasswordStrengthBar password="abcdefgh" />);
    const bar = screen.getByTestId('password-strength-fill');
    expect(bar.className).toContain('bg-danger');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- PasswordStrengthBar.test.tsx`
Expected: FAIL com `Cannot find module './PasswordStrengthBar'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/auth/components/PasswordStrengthBar.tsx`:

```tsx
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- PasswordStrengthBar.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/components/PasswordStrengthBar.tsx frontend/src/features/auth/components/PasswordStrengthBar.test.tsx
git commit -m "feat: adiciona PasswordStrengthBar para formularios de senha"
```

---

### Task 3: Evoluir `AuthField`

**Conteúdo atual de `frontend/src/features/auth/components/AuthField.tsx`:**

```tsx
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
```

**Conteúdo atual de `frontend/src/features/auth/components/AuthField.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('renderiza label e input associados corretamente', () => {
    render(<AuthField label="E-mail" name="email" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();
  });

  it('usa token de cor de erro quando ha mensagem de erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const errorMessage = screen.getByText('E-mail invalido');
    expect(errorMessage.className).toContain('text-accent');
  });
});
```

- [ ] **Step 1: Atualizar o teste primeiro (TDD — o teste passa a exigir o comportamento novo)**

Substituir todo o conteúdo de `frontend/src/features/auth/components/AuthField.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('renderiza label e input associados corretamente', () => {
    render(<AuthField label="E-mail" name="email" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();
  });

  it('usa token de cor danger quando ha mensagem de erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const errorMessage = screen.getByText('E-mail invalido');
    expect(errorMessage.className).toContain('text-danger');
  });

  it('marca aria-invalid e aria-describedby quando ha erro', () => {
    render(<AuthField label="E-mail" name="email" error="E-mail invalido" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    const describedBy = input.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('E-mail invalido');
  });

  it('renderiza icone quando a prop icon e passada', () => {
    render(<AuthField label="E-mail" name="email" icon={<Mail data-testid="mail-icon" />} />);
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('renderiza endAdornment quando a prop endAdornment e passada', () => {
    render(
      <AuthField
        label="Senha"
        name="password"
        endAdornment={<button type="button">Mostrar</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- AuthField.test.tsx`
Expected: FAIL nos testes de `aria-invalid`, `icon` e `endAdornment` (a implementação atual não suporta essas props/atributos) e no teste de `text-danger` (implementação atual usa `text-accent`).

- [ ] **Step 3: Implementar a nova versão de `AuthField`**

Substituir todo o conteúdo de `frontend/src/features/auth/components/AuthField.tsx` por:

```tsx
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
    <label className="flex flex-col gap-1 text-sm">
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
      {error ? (
        <span id={errorId} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
});
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- AuthField.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Rodar a suíte inteira de auth pra checar regressão nas páginas que usam `AuthField` hoje**

Run: `npm test -- src/features/auth`
Expected: `LoginPage.test.tsx`, `RegisterPage.test.tsx`, `ForgotPasswordPage.test.tsx`, `ResetPasswordPage.test.tsx` continuam passando — nenhuma dessas páginas depende do texto `text-accent` diretamente, só usam `getByLabelText`, que continua funcionando (o `<label>` continua envolvendo o `<input>`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/components/AuthField.tsx frontend/src/features/auth/components/AuthField.test.tsx
git commit -m "feat: evolui AuthField com tokens novos, icone, endAdornment e aria"
```
