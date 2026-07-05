# Fase 1 — Foundation: getCategoryIcon, PageHeader, Pagination

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar.

**Goal desta fase:** Criar o utilitário `getCategoryIcon` (mapa de ícone por categoria, client-side) e os componentes de composição `PageHeader` e `Pagination`, usados pelas fases seguintes.

**Files:**
- Create: `frontend/src/features/landing/lib/categoryIcon.ts`
- Test: `frontend/src/features/landing/lib/categoryIcon.test.ts`
- Create: `frontend/src/features/landing/components/PageHeader.tsx`
- Test: `frontend/src/features/landing/components/PageHeader.test.tsx`
- Create: `frontend/src/features/landing/components/Pagination.tsx`
- Test: `frontend/src/features/landing/components/Pagination.test.tsx`

**Interfaces:**
- Produces: `getCategoryIcon(categoryName: string): LucideIcon` — usado pela Fase 5 (`CategoryGrid`).
- Produces: `PageHeader` — `{ title: string; subtitle?: string; action?: ReactNode }` — usado pela Fase 4 (`SearchPage`).
- Produces: `Pagination` — `{ page: number; limit: number; total: number; onPageChange: (page: number) => void }` — usado pela Fase 3 (`ProfessionalResults`).
- Consumes: `Button` de `frontend/src/components/ui/Button.tsx` (já existe), `cn` de `frontend/src/lib/utils.ts` (já existe).

---

### Task 1: `getCategoryIcon`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/lib/categoryIcon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Zap, Wrench, LayoutGrid } from 'lucide-react';
import { getCategoryIcon } from './categoryIcon';

describe('getCategoryIcon', () => {
  it('retorna icone especifico para categoria com palavra-chave conhecida', () => {
    expect(getCategoryIcon('Serviços Elétricos')).toBe(Zap);
    expect(getCategoryIcon('encanador')).toBe(Wrench);
  });

  it('e case-insensitive', () => {
    expect(getCategoryIcon('ELÉTRICA RESIDENCIAL')).toBe(Zap);
  });

  it('retorna icone generico para categoria sem palavra-chave conhecida', () => {
    expect(getCategoryIcon('Categoria sem mapeamento')).toBe(LayoutGrid);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- categoryIcon.test.ts`
Expected: FAIL com `Cannot find module './categoryIcon'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/lib/categoryIcon.ts`:

```ts
import {
  Sparkles,
  Zap,
  Wrench,
  PaintRoller,
  Trees,
  Hammer,
  GraduationCap,
  Laptop,
  Truck,
  SprayCan,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

const KEYWORD_ICONS: Array<{ keyword: string; icon: LucideIcon }> = [
  { keyword: 'limpeza', icon: SprayCan },
  { keyword: 'elétric', icon: Zap },
  { keyword: 'eletric', icon: Zap },
  { keyword: 'encanad', icon: Wrench },
  { keyword: 'pintura', icon: PaintRoller },
  { keyword: 'jardim', icon: Trees },
  { keyword: 'reforma', icon: Hammer },
  { keyword: 'aula', icon: GraduationCap },
  { keyword: 'professor', icon: GraduationCap },
  { keyword: 'beleza', icon: Sparkles },
  { keyword: 'tecnologia', icon: Laptop },
  { keyword: 'transporte', icon: Truck },
];

export function getCategoryIcon(categoryName: string): LucideIcon {
  const normalized = categoryName.toLowerCase();
  const match = KEYWORD_ICONS.find(({ keyword }) => normalized.includes(keyword));
  return match?.icon ?? LayoutGrid;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- categoryIcon.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/lib/categoryIcon.ts frontend/src/features/landing/lib/categoryIcon.test.ts
git commit -m "feat: adiciona mapa de icone por categoria para landing/search"
```

---

### Task 2: `PageHeader`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/PageHeader.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renderiza titulo, subtitulo e acao', () => {
    render(<PageHeader title="Resultados da busca" subtitle="42 profissionais encontrados" action={<button>Ação</button>} />);
    expect(screen.getByRole('heading', { name: 'Resultados da busca' })).toBeInTheDocument();
    expect(screen.getByText('42 profissionais encontrados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
  });

  it('subtitulo tem aria-live polite para anunciar mudanca de contagem', () => {
    render(<PageHeader title="Resultados" subtitle="10 resultados" />);
    expect(screen.getByText('10 resultados')).toHaveAttribute('aria-live', 'polite');
  });

  it('renderiza sem subtitulo/acao quando nao informados', () => {
    render(<PageHeader title="Resultados" />);
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- PageHeader.test.tsx`
Expected: FAIL com `Cannot find module './PageHeader'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/PageHeader.tsx`:

```tsx
import type { JSX, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-h2 font-semibold text-ink">{title}</h1>
        {subtitle ? (
          <p aria-live="polite" className="text-body-sm text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- PageHeader.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/PageHeader.tsx frontend/src/features/landing/components/PageHeader.test.tsx
git commit -m "feat: adiciona PageHeader para paginas de listagem"
```

---

### Task 3: `Pagination`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/landing/components/Pagination.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('nao renderiza nada quando total cabe em uma pagina', () => {
    const { container } = render(<Pagination page={1} limit={12} total={10} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza numeros de pagina e marca a pagina atual com aria-current', () => {
    render(<Pagination page={2} limit={10} total={35} onPageChange={vi.fn()} />);
    const currentPage = screen.getByRole('button', { name: '2' });
    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('chama onPageChange ao clicar em um numero de pagina', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} limit={10} total={35} onPageChange={onPageChange} />);
    screen.getByRole('button', { name: '3' }).click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('desabilita Anterior na primeira pagina e Proxima na ultima', () => {
    render(<Pagination page={1} limit={10} total={35} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).not.toBeDisabled();
  });

  it('usa nav com aria-label Paginação', () => {
    render(<Pagination page={1} limit={10} total={35} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Pagination.test.tsx`
Expected: FAIL com `Cannot find module './Pagination'`.

- [ ] **Step 3: Implementar**

Criar `frontend/src/features/landing/components/Pagination.tsx`:

```tsx
import type { JSX } from 'react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps): JSX.Element | null {
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              'h-8 w-8 rounded-sm text-sm font-medium',
              item === page ? 'bg-primary text-bg' : 'text-ink hover:bg-surface',
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <span className="text-sm text-muted sm:hidden">
        Página {page} de {totalPages}
      </span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </Button>
    </nav>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Pagination.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/Pagination.tsx frontend/src/features/landing/components/Pagination.test.tsx
git commit -m "feat: adiciona componente Pagination para listagens paginadas"
```
