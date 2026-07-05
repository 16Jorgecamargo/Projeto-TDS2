# Fase 2 — HowItWorks: âncora de navegação

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar.

**Goal desta fase:** Adicionar `id="como-funciona"` na seção `HowItWorks` da Landing, alvo do link "Como funciona" que a Fase 3 (Topbar) vai adicionar.

**Files:**
- Modify: `frontend/src/features/landing/components/HowItWorks.tsx`
- Modify: `frontend/src/features/landing/components/HowItWorks.test.tsx`

**Interfaces:**
- Produces: `<section id="como-funciona">` — âncora consumida pela Fase 3 via `<a href="#como-funciona">`.

---

### Task 1: Adicionar `id` de âncora

**Conteúdo atual de `frontend/src/features/landing/components/HowItWorks.tsx`:**

```tsx
import type { JSX } from 'react';
import { Search, MessageSquareText, Handshake } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

const STEPS = [
  { icon: Search, title: 'Busque', description: 'Encontre profissionais por categoria, cidade ou palavra-chave.' },
  { icon: MessageSquareText, title: 'Compare', description: 'Veja avaliações, preços e disponibilidade lado a lado.' },
  { icon: Handshake, title: 'Contrate', description: 'Feche o contrato com segurança direto pela plataforma.' },
];

export function HowItWorks(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Como funciona</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }) => (
          <Card key={title} variant="flat" className="flex flex-col items-center gap-3 bg-surface p-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-h4 font-semibold text-ink">{title}</span>
            <span className="text-body-sm text-muted">{description}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/landing/components/HowItWorks.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('renderiza os 3 passos do fluxo', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { name: 'Como funciona' })).toBeInTheDocument();
    expect(screen.getByText('Busque')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('Contrate')).toBeInTheDocument();
  });

  it('expoe id de ancora como-funciona na secao', () => {
    render(<HowItWorks />);
    const heading = screen.getByRole('heading', { name: 'Como funciona' });
    expect(heading.closest('section')).toHaveAttribute('id', 'como-funciona');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- HowItWorks.test.tsx`
Expected: FAIL no segundo teste — a `<section>` atual não tem `id`.

- [ ] **Step 3: Implementar**

Em `frontend/src/features/landing/components/HowItWorks.tsx`, trocar a linha:

```tsx
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
```

por:

```tsx
    <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-16">
```

Nenhuma outra linha do arquivo muda.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- HowItWorks.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/HowItWorks.tsx frontend/src/features/landing/components/HowItWorks.test.tsx
git commit -m "feat: adiciona ancora como-funciona na secao HowItWorks"
```
