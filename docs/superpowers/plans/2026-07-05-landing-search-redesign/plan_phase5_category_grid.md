# Fase 5 — CategoryGrid: ícone por categoria

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 1 (usa `getCategoryIcon`).

**Goal desta fase:** Trocar o ícone genérico (`Squares2X2Icon`, igual pra toda categoria) por `getCategoryIcon(category.name)`.

**Files:**
- Modify: `frontend/src/features/landing/components/CategoryGrid.tsx`
- Modify: `frontend/src/features/landing/components/CategoryGrid.test.tsx`

**Interfaces:**
- Consumes: `getCategoryIcon` (Fase 1, `../lib/categoryIcon`).

---

### Task 1: Ícone por categoria em `CategoryGrid`

**Conteúdo atual de `frontend/src/features/landing/components/CategoryGrid.tsx`:**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import { useCategories } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function CategoryGrid(): JSX.Element {
  const { data, isLoading } = useCategories();
  const categories = data?.filter((category) => category.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Nenhuma categoria disponível"
        description="Volte em breve para ver as categorias de serviço."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => (
        <Card
          key={category.id}
          interactive
          className="relative flex flex-col items-center gap-3 bg-surface p-4 text-center"
        >
          <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-primary">
            <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-ink">{category.name}</span>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/landing/components/CategoryGrid.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryGrid } from './CategoryGrid';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('CategoryGrid', () => {
  it('renderiza categorias ativas como cards com link de navegacao', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Eletrica', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Inativa', slug: 'inativa', icon: null, description: null, isActive: false },
      ],
    } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eletrica' })).toHaveAttribute('href', '/search?categoryId=c1');
  });

  it('usa icone especifico por categoria em vez de um icone generico unico', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Elétrica residencial', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Encanador', slug: 'encanador', icon: null, description: null, isActive: true },
      ],
    } as never);

    const { container } = render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons).toHaveLength(2);
    expect(icons[0].outerHTML).not.toEqual(icons[1].outerHTML);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- CategoryGrid.test.tsx`
Expected: FAIL no segundo teste — hoje ambos os ícones são idênticos (`Squares2X2Icon` repetido).

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/features/landing/components/CategoryGrid.tsx` por:

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';
import { getCategoryIcon } from '../lib/categoryIcon';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function CategoryGrid(): JSX.Element {
  const { data, isLoading } = useCategories();
  const categories = data?.filter((category) => category.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Nenhuma categoria disponível"
        description="Volte em breve para ver as categorias de serviço."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.name);
        return (
          <Card
            key={category.id}
            interactive
            className="relative flex flex-col items-center gap-3 bg-surface p-4 text-center"
          >
            <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-ink">{category.name}</span>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- CategoryGrid.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/components/CategoryGrid.tsx frontend/src/features/landing/components/CategoryGrid.test.tsx
git commit -m "feat: usa icone especifico por categoria em CategoryGrid"
```
