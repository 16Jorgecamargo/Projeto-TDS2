## Fase A — `AuthField` (Task 1)

### Task 1: Restilizar `AuthField`

**Files:**
- Modify: `frontend/src/features/auth/components/AuthField.tsx`
- Test: `frontend/src/features/auth/components/AuthField.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: nenhuma dependência nova além do já usado (`forwardRef`, `InputHTMLAttributes`).
- Produces: `AuthField` mantém a mesma assinatura de props `{ label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>` — nenhuma mudança de interface, só de estilo interno. Consumido por todas as 5 páginas de Auth (Tasks 2-6).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/auth/components/AuthField.test.tsx`:
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

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/auth/components/AuthField.test.tsx`
Esperado: FAIL — a implementação atual usa `text-red-600`, não `text-accent`.

- [ ] **Step 3: Restilizar `AuthField.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/components/AuthField.tsx`:
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

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/auth/components/AuthField.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa (inclusive `LoginPage.test.tsx`, `ResetPasswordPage.test.tsx`, que usam `AuthField` via `getByLabelText`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/components/AuthField.tsx frontend/src/features/auth/components/AuthField.test.tsx
git commit -m "style(auth): restiliza AuthField com tokens da fase 1"
```

---
