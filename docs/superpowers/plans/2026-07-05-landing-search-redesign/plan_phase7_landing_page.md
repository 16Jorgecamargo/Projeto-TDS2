# Fase 7 — LandingPage: composição final

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende de todas as fases anteriores (usa as 6 seções da Fase 6, `CategoryGrid` da Fase 5).

**Goal desta fase:** Compor a `LandingPage` final: Hero (mantido) + `TrustStats` + Categorias (mantido, com ícone novo) + `FeaturedProfessionals` + `HowItWorks` + `Testimonials` + `Faq` + `ClosingCta`. Última fase do plano — roda a suíte completa e o typecheck ao final.

**Files:**
- Modify: `frontend/src/features/landing/pages/LandingPage.tsx`
- Modify: `frontend/src/features/landing/pages/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `TrustStats`, `FeaturedProfessionals`, `HowItWorks`, `Testimonials`, `Faq`, `ClosingCta` (Fase 6), `CategoryGrid` (Fase 5), `SearchBar` (inalterado).

---

### Task 1: Composição final da `LandingPage`

**Conteúdo atual de `frontend/src/features/landing/pages/LandingPage.tsx`:**

```tsx
import type { JSX } from 'react';
import { ShieldCheckIcon, CheckBadgeIcon, BoltIcon } from '@heroicons/react/24/outline';
import { SearchBar } from '../components/SearchBar';
import { CategoryGrid } from '../components/CategoryGrid';

const trustPoints = [
  { icon: ShieldCheckIcon, label: 'Pagamento protegido' },
  { icon: CheckBadgeIcon, label: 'Profissionais avaliados' },
  { icon: BoltIcon, label: 'Resposta rápida' },
];

export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col">
      <section className="bg-surface px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-ink text-balance sm:text-5xl">
            Encontre o profissional certo
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Publique sua demanda, compare orçamentos e contrate com segurança em um só lugar.
          </p>
          <div className="w-full">
            <SearchBar />
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-2xl font-bold text-ink">Categorias em destaque</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/landing/pages/LandingPage.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

vi.mock('../components/SearchBar', () => ({ SearchBar: () => <div>search-bar</div> }));
vi.mock('../components/CategoryGrid', () => ({ CategoryGrid: () => <div>category-grid</div> }));
vi.mock('../components/TrustStats', () => ({ TrustStats: () => <div>trust-stats</div> }));
vi.mock('../components/FeaturedProfessionals', () => ({ FeaturedProfessionals: () => <div>featured-professionals</div> }));
vi.mock('../components/HowItWorks', () => ({ HowItWorks: () => <div>how-it-works</div> }));
vi.mock('../components/Testimonials', () => ({ Testimonials: () => <div>testimonials</div> }));
vi.mock('../components/Faq', () => ({ Faq: () => <div>faq</div> }));
vi.mock('../components/ClosingCta', () => ({ ClosingCta: () => <div>closing-cta</div> }));

describe('LandingPage', () => {
  it('mostra titulo, busca e todas as secoes na ordem esperada', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: 'Encontre o profissional certo' })).toBeInTheDocument();
    expect(screen.getByText('search-bar')).toBeInTheDocument();

    const sectionLabels = [
      'trust-stats',
      'category-grid',
      'featured-professionals',
      'how-it-works',
      'testimonials',
      'faq',
      'closing-cta',
    ];
    const positions = sectionLabels.map((label) => {
      const element = screen.getByText(label);
      expect(element).toBeInTheDocument();
      return Array.from(document.body.querySelectorAll('body *')).indexOf(element);
    });
    const isAscending = positions.every((value, index) => index === 0 || value > positions[index - 1]);
    expect(isAscending).toBe(true);
  });

  it('mantem os badges de confianca do hero', () => {
    render(<LandingPage />);
    expect(screen.getByText('Pagamento protegido')).toBeInTheDocument();
    expect(screen.getByText('Profissionais avaliados')).toBeInTheDocument();
    expect(screen.getByText('Resposta rápida')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- src/features/landing/pages/LandingPage.test.tsx`
Expected: FAIL — `TrustStats`/`FeaturedProfessionals`/`HowItWorks`/`Testimonials`/`Faq`/`ClosingCta` ainda não são usados em `LandingPage`.

- [ ] **Step 3: Implementar a composição final**

Substituir todo o conteúdo de `frontend/src/features/landing/pages/LandingPage.tsx` por:

```tsx
import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, CheckBadgeIcon, BoltIcon } from '@heroicons/react/24/outline';
import { SearchBar } from '../components/SearchBar';
import { TrustStats } from '../components/TrustStats';
import { CategoryGrid } from '../components/CategoryGrid';
import { FeaturedProfessionals } from '../components/FeaturedProfessionals';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonials } from '../components/Testimonials';
import { Faq } from '../components/Faq';
import { ClosingCta } from '../components/ClosingCta';
import { spring } from '../../../lib/motion';

const trustPoints = [
  { icon: ShieldCheckIcon, label: 'Pagamento protegido' },
  { icon: CheckBadgeIcon, label: 'Profissionais avaliados' },
  { icon: BoltIcon, label: 'Resposta rápida' },
];

export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col">
      <section className="bg-surface px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-ink text-balance sm:text-5xl">
            Encontre o profissional certo
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Publique sua demanda, compare orçamentos e contrate com segurança em um só lugar.
          </p>
          <div className="w-full">
            <SearchBar />
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <TrustStats />

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-h2 font-bold text-ink">Categorias em destaque</h2>
        <CategoryGrid />
      </section>

      <FeaturedProfessionals />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <ClosingCta />
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/features/landing/pages/LandingPage.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Rodar a suíte completa do frontend e o typecheck (última fase do plano)**

Run: `npm test` (em `frontend/`)
Expected: todos os testes passam, incluindo os das 7 fases deste plano e os já existentes do restante do app (nenhuma regressão fora da feature `landing`).

Run: `npm run typecheck`
Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/landing/pages/LandingPage.tsx frontend/src/features/landing/pages/LandingPage.test.tsx
git commit -m "feat: compoe LandingPage final com todas as secoes novas"
```
