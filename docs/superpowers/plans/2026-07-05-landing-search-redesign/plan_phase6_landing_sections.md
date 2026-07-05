# Fase 6 — Seções novas da Landing: TrustStats, FeaturedProfessionals, HowItWorks, Testimonials, Faq, ClosingCta

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 3 (usa `useFeaturedProfessionals`/`useTotalProfessionalsCount`).

**Goal desta fase:** Criar as 6 seções novas de conteúdo da Landing, cada uma em seu próprio arquivo de composição, todas usando só primitivos existentes (`Card`, `Button`, `Avatar`, `Skeleton`) e dados reais quando disponíveis (sem endpoint novo).

**Files:**
- Create: `frontend/src/features/landing/components/TrustStats.tsx` + `.test.tsx`
- Create: `frontend/src/features/landing/components/FeaturedProfessionals.tsx` + `.test.tsx`
- Create: `frontend/src/features/landing/components/HowItWorks.tsx` + `.test.tsx`
- Create: `frontend/src/features/landing/components/Testimonials.tsx` + `.test.tsx`
- Create: `frontend/src/features/landing/components/Faq.tsx` + `.test.tsx`
- Create: `frontend/src/features/landing/components/ClosingCta.tsx` + `.test.tsx`

**Interfaces:**
- Consumes: `useTotalProfessionalsCount`, `useFeaturedProfessionals` (Fase 3, `../queries`), `useCategories` (`../../professional/queries`, já existe), `useProfessionalReviews` (`../../reviews/queries`, já existe: `(professionalId: string | undefined, page = 1) => UseQueryResult<Paginated<Review>>`), `useFavoriteIds` (`../../favorites/queries`, já existe), `ProfessionalCard` (`../../professional/components/ProfessionalCard`, já existe), `Card`/`Button`/`Avatar`/`Skeleton` de `components/ui` (já existem), `duration` de `frontend/src/lib/motion.ts` (já existe).
- Produces: todos os 6 componentes acima, sem props (usados diretamente pela Fase 7 em `LandingPage`).

---

### Task 1: `TrustStats`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/TrustStats.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TrustStats } from './TrustStats';
import { useTotalProfessionalsCount } from '../queries';
import { useCategories } from '../../professional/queries';

vi.mock('../queries', () => ({ useTotalProfessionalsCount: vi.fn() }));
vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('TrustStats', () => {
  it('mostra o total real de profissionais e de categorias ativas', async () => {
    vi.mocked(useTotalProfessionalsCount).mockReturnValue({ data: 128, isLoading: false } as never);
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'A', isActive: true, parentId: null, slug: 'a', icon: null, description: null },
        { id: 'c2', name: 'B', isActive: false, parentId: null, slug: 'b', icon: null, description: null },
      ],
      isLoading: false,
    } as never);

    render(<TrustStats />);

    await waitFor(() => expect(screen.getByText('128')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('profissionais cadastrados')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('categorias de serviço')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useTotalProfessionalsCount).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useCategories).mockReturnValue({ data: undefined, isLoading: true } as never);

    const { container } = render(<TrustStats />);

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- TrustStats.test.tsx`
Expected: FAIL com `Cannot find module './TrustStats'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/TrustStats.tsx`:

```tsx
import { useEffect, useState, type JSX } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useCategories } from '../../professional/queries';
import { useTotalProfessionalsCount } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';

function AnimatedCounter({ value }: { value: number }): JSX.Element {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString('pt-BR'));
  const [text, setText] = useState('0');

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return display.on('change', (latest) => setText(latest));
  }, [display]);

  return <motion.span>{text}</motion.span>;
}

export function TrustStats(): JSX.Element {
  const { data: totalProfessionals, isLoading: loadingProfessionals } = useTotalProfessionalsCount();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const totalCategories = categories?.filter((category) => category.isActive).length ?? 0;

  return (
    <div className="border-y border-border bg-bg px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
        <div className="flex flex-col items-center gap-1 text-center">
          {loadingProfessionals ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-h2 font-bold text-ink">
              <AnimatedCounter value={totalProfessionals ?? 0} />
            </span>
          )}
          <span className="text-body-sm text-muted">profissionais cadastrados</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          {loadingCategories ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-h2 font-bold text-ink">
              <AnimatedCounter value={totalCategories} />
            </span>
          )}
          <span className="text-body-sm text-muted">categorias de serviço</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- TrustStats.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/TrustStats.tsx frontend/src/features/landing/components/TrustStats.test.tsx
git commit -m "feat: adiciona TrustStats com numeros reais e contador animado"
```

---

### Task 2: `FeaturedProfessionals`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/FeaturedProfessionals.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeaturedProfessionals } from './FeaturedProfessionals';
import { useFeaturedProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';

vi.mock('../queries', () => ({ useFeaturedProfessionals: vi.fn() }));
vi.mock('../../favorites/queries', () => ({ useFavoriteIds: vi.fn() }));

function renderComponent() {
  return render(
    <MemoryRouter>
      <FeaturedProfessionals />
    </MemoryRouter>,
  );
}

describe('FeaturedProfessionals', () => {
  it('renderiza os profissionais em destaque retornados pela query', () => {
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      isLoading: false,
      data: [
        { id: '1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true },
      ],
    } as never);

    renderComponent();

    expect(screen.getByText('Maria Eletricista')).toBeInTheDocument();
  });

  it('nao renderiza nada quando nao ha profissionais em destaque', () => {
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ isLoading: false, data: [] } as never);

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra skeletons enquanto carrega', () => {
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ isLoading: true, data: undefined } as never);

    const { container } = renderComponent();

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- FeaturedProfessionals.test.tsx`
Expected: FAIL com `Cannot find module './FeaturedProfessionals'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/FeaturedProfessionals.tsx`:

```tsx
import type { JSX } from 'react';
import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useFeaturedProfessionals } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { Skeleton } from '../../../components/ui/Skeleton';

export function FeaturedProfessionals(): JSX.Element | null {
  const { data, isLoading } = useFeaturedProfessionals(3);
  const favoriteIds = useFavoriteIds();

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-h2 font-bold text-ink">Profissionais em destaque</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Profissionais em destaque</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <ProfessionalCard
            key={item.id}
            id={item.id}
            headline={item.headline}
            bio={item.bio}
            hourlyRate={item.hourlyRate}
            ratingAverage={item.ratingAverage}
            ratingCount={item.ratingCount}
            isAvailable={item.isAvailable}
            isFavorite={favoriteIds.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- FeaturedProfessionals.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/FeaturedProfessionals.tsx frontend/src/features/landing/components/FeaturedProfessionals.test.tsx
git commit -m "feat: adiciona secao de profissionais em destaque na landing"
```

---

### Task 3: `HowItWorks`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/HowItWorks.test.tsx`:

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
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- HowItWorks.test.tsx`
Expected: FAIL com `Cannot find module './HowItWorks'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/HowItWorks.tsx`:

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

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- HowItWorks.test.tsx`
Expected: PASS (1 teste).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/HowItWorks.tsx frontend/src/features/landing/components/HowItWorks.test.tsx
git commit -m "feat: adiciona secao Como funciona na landing"
```

---

### Task 4: `Testimonials`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/Testimonials.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Testimonials } from './Testimonials';
import { useFeaturedProfessionals } from '../queries';
import { useProfessionalReviews } from '../../reviews/queries';

vi.mock('../queries', () => ({ useFeaturedProfessionals: vi.fn() }));
vi.mock('../../reviews/queries', () => ({ useProfessionalReviews: vi.fn() }));

describe('Testimonials', () => {
  it('mostra depoimento real de profissional em destaque que tem review com comentario', async () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      data: [{ id: 'p1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true }],
    } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      isLoading: false,
      data: { items: [{ id: 'r1', contractId: 'c1', authorId: 'a1', targetId: 'p1', rating: 5, comment: 'Excelente profissional', createdAt: '2026-01-01' }], page: 1, limit: 20, total: 1 },
    } as never);

    render(<Testimonials />);

    await waitFor(() => expect(screen.getByText('"Excelente profissional"')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Depoimentos' })).toBeInTheDocument();
  });

  it('nao renderiza nada quando nenhum profissional em destaque tem review com comentario', async () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      data: [{ id: 'p1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true }],
    } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      isLoading: false,
      data: { items: [], page: 1, limit: 20, total: 0 },
    } as never);

    const { container } = render(<Testimonials />);

    await waitFor(() => expect(container.querySelector('h2')).not.toBeInTheDocument());
  });

  it('nao renderiza nada quando nao ha profissionais em destaque', () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({ data: [] } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({ isLoading: false, data: undefined } as never);

    const { container } = render(<Testimonials />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Testimonials.test.tsx`
Expected: FAIL com `Cannot find module './Testimonials'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/Testimonials.tsx`:

```tsx
import { useEffect, useState, type JSX } from 'react';
import { Star } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { useFeaturedProfessionals } from '../queries';
import { useProfessionalReviews } from '../../reviews/queries';

interface TestimonialCardProps {
  professionalId: string;
  headline: string;
  onVisibleChange: (professionalId: string, visible: boolean) => void;
}

function TestimonialCard({ professionalId, headline, onVisibleChange }: TestimonialCardProps): JSX.Element | null {
  const { data, isLoading } = useProfessionalReviews(professionalId, 1);
  const review = data?.items[0];
  const visible = !isLoading && Boolean(review?.comment);

  useEffect(() => {
    onVisibleChange(professionalId, visible);
  }, [professionalId, visible, onVisibleChange]);

  if (!visible || !review) {
    return null;
  }

  return (
    <Card variant="flat" className="flex flex-col gap-3 bg-surface p-6">
      <div className="flex items-center gap-3">
        <Avatar name={headline} size="sm" />
        <div>
          <p className="text-sm font-semibold text-ink">{headline}</p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Star size={12} className="text-accent" aria-hidden="true" />
            {review.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <p className="text-body-sm text-muted">&quot;{review.comment}&quot;</p>
    </Card>
  );
}

export function Testimonials(): JSX.Element | null {
  const { data: featured } = useFeaturedProfessionals(3);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  function handleVisibleChange(professionalId: string, visible: boolean) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(professionalId);
      } else {
        next.delete(professionalId);
      }
      return next;
    });
  }

  if (!featured || featured.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16" hidden={visibleIds.size === 0}>
      <h2 className="mb-6 text-h2 font-bold text-ink">Depoimentos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item) => (
          <TestimonialCard
            key={item.id}
            professionalId={item.id}
            headline={item.headline}
            onVisibleChange={handleVisibleChange}
          />
        ))}
      </div>
    </section>
  );
}
```

Nota: o atributo HTML `hidden` esconde visualmente a seção (e do assistive tech) enquanto nenhum depoimento carregou ainda, mas a seção continua no DOM — ajusta o teste 2 acima: como o `<section>`/`<h2>` continuam no DOM (só com `hidden`), o teste deve checar visibilidade, não ausência. Ajustar o teste 2 antes do Step 4 para:

```tsx
  it('esconde a secao quando nenhum profissional em destaque tem review com comentario', async () => {
    vi.mocked(useFeaturedProfessionals).mockReturnValue({
      data: [{ id: 'p1', headline: 'Maria Eletricista', bio: null, hourlyRate: 80, ratingAverage: 4.9, ratingCount: 20, isAvailable: true }],
    } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      isLoading: false,
      data: { items: [], page: 1, limit: 20, total: 0 },
    } as never);

    render(<Testimonials />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Depoimentos' }).closest('section')).toHaveAttribute('hidden'));
  });
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Testimonials.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/Testimonials.tsx frontend/src/features/landing/components/Testimonials.test.tsx
git commit -m "feat: adiciona secao de depoimentos reais na landing"
```

---

### Task 5: `Faq`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/Faq.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Faq } from './Faq';

describe('Faq', () => {
  it('renderiza perguntas com resposta recolhida por padrao', () => {
    render(<Faq />);
    const firstQuestion = screen.getByRole('button', { name: 'Como funciona o pagamento?' });
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('expande a resposta ao clicar na pergunta e recolhe ao clicar de novo', () => {
    render(<Faq />);
    const firstQuestion = screen.getByRole('button', { name: 'Como funciona o pagamento?' });

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/pagamento fica retido/i)).toBeInTheDocument();

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Faq.test.tsx`
Expected: FAIL com `Cannot find module './Faq'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/Faq.tsx`:

```tsx
import { useState, type JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { duration } from '../../../lib/motion';
import { cn } from '../../../lib/utils';

const FAQ_ITEMS = [
  {
    question: 'Como funciona o pagamento?',
    answer: 'O pagamento fica retido na plataforma até a confirmação do serviço, garantindo segurança para as duas partes.',
  },
  {
    question: 'Os profissionais são verificados?',
    answer: 'Sim, cada profissional passa por verificação de identidade antes de poder oferecer serviços.',
  },
  {
    question: 'Posso cancelar um contrato?',
    answer: 'Sim, cancelamentos seguem a política de reembolso descrita nos termos de cada contrato.',
  },
  {
    question: 'É grátis para clientes?',
    answer: 'Sim, buscar e contratar profissionais é gratuito para quem publica demandas.',
  },
  {
    question: 'Como avalio um profissional?',
    answer: 'Após a conclusão do contrato, você pode deixar uma avaliação com nota e comentário.',
  },
];

export function Faq(): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Perguntas frequentes</h2>
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          const answerId = `faq-answer-${index}`;
          return (
            <Card key={item.question} variant="flat" className="bg-surface p-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-ink">{item.question}</span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={cn('text-muted transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    id={answerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: duration.fast }}
                    className="overflow-hidden px-4"
                  >
                    <p className="pb-4 text-body-sm text-muted">{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Faq.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/Faq.tsx frontend/src/features/landing/components/Faq.test.tsx
git commit -m "feat: adiciona secao de FAQ na landing"
```

---

### Task 6: `ClosingCta`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/ClosingCta.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClosingCta } from './ClosingCta';

describe('ClosingCta', () => {
  it('renderiza titulo e link para cadastro de profissional', () => {
    render(
      <MemoryRouter>
        <ClosingCta />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /cadastrar como profissional/i });
    expect(link).toHaveAttribute('href', '/register');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- ClosingCta.test.tsx`
Expected: FAIL com `Cannot find module './ClosingCta'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/ClosingCta.tsx`:

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function ClosingCta(): JSX.Element {
  return (
    <section className="bg-primary px-6 py-16 text-bg">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="text-h2 font-bold">É profissional? Comece a receber demandas hoje</h2>
        <p className="max-w-xl text-body-md text-bg/80">
          Cadastre-se gratuitamente e conecte-se com clientes procurando pelo seu serviço.
        </p>
        <Button asChild variant="accent">
          <Link to="/register">Cadastrar como profissional</Link>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ClosingCta.test.tsx`
Expected: PASS (1 teste).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/ClosingCta.tsx frontend/src/features/landing/components/ClosingCta.test.tsx
git commit -m "feat: adiciona CTA de fechamento para profissionais na landing"
```
