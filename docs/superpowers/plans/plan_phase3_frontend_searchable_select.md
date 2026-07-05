# Fase 3 — `SearchableSelect` genérico (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Independente do backend (fases 1-2) — pode rodar em paralelo. Ver `plan_index.md`.

**Goal:** Criar um combobox pesquisável reutilizável (`SearchableSelect`) e a lista estática das 27 UFs brasileiras, usados na Fase 4 pelo `DemandForm` (categoria e UF).

**Architecture:** Componente controlado (`value`/`onChange`), sem estado próprio do valor selecionado — segue o padrão ARIA combobox (`role="combobox"` + `role="listbox"` + `role="option"`) pra ficar testável via Testing Library com `getByRole`.

**Tech Stack:** React, Vitest, Testing Library.

## Global Constraints

Ver `plan_index.md`.

---

### Task 3.1: Lista estática de UFs

**Files:**
- Create: `frontend/src/lib/brazilStates.ts`

**Interfaces:**
- Produces: `export interface BrazilState { value: string; label: string }`, `export const BRAZIL_STATES: BrazilState[]` — consumido pela Fase 4 (`DemandForm`).

- [ ] **Step 1: Criar o arquivo**

```ts
export interface BrazilState {
  value: string;
  label: string;
}

export const BRAZIL_STATES: BrazilState[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/lib/brazilStates.ts
git commit -m "feat: adiciona lista estatica das UFs brasileiras"
```

---

### Task 3.2: Componente `SearchableSelect`

**Files:**
- Create: `frontend/src/components/ui/SearchableSelect.tsx`
- Test: `frontend/src/components/ui/SearchableSelect.test.tsx`

**Interfaces:**
- Consumes: `cn` de `../../lib/utils`.
- Produces: `export interface SearchableSelectOption { value: string; label: string }`, `export interface SearchableSelectProps { options: SearchableSelectOption[]; value: string; onChange: (value: string) => void; onBlur?: () => void; placeholder?: string; id?: string; className?: string }`, `export function SearchableSelect(props: SearchableSelectProps): JSX.Element` — consumido pela Fase 4 (`DemandForm`, campos Categoria e UF).

- [ ] **Step 1: Escrever o teste (falha primeiro)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './SearchableSelect';

const OPTIONS = [
  { value: 'SP', label: 'São Paulo' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RJ', label: 'Rio de Janeiro' },
];

describe('SearchableSelect', () => {
  it('mostra todas as opcoes ao focar e filtra ao digitar', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} id="uf" />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await user.type(screen.getByRole('combobox'), 'Rio');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Rio Grande do Sul' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'São Paulo' })).not.toBeInTheDocument();
  });

  it('chama onChange com o value ao clicar numa opcao e fecha a lista', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={onChange} id="uf" />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Rio de Janeiro' }));

    expect(onChange).toHaveBeenCalledWith('RJ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('exibe o label da opcao selecionada quando value e passado', () => {
    render(<SearchableSelect options={OPTIONS} value="SP" onChange={vi.fn()} id="uf" />);
    expect(screen.getByRole('combobox')).toHaveValue('São Paulo');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd frontend
npx vitest run src/components/ui/SearchableSelect.test.tsx
```

Expected: FAIL — módulo `./SearchableSelect` não existe.

- [ ] **Step 3: Implementar o componente**

```tsx
import { useEffect, useId, useMemo, useRef, useState, type JSX } from 'react';
import { cn } from '../../lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Buscar...',
  id,
  className,
}: SearchableSelectProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? '',
    [options, value],
  );

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || query === selectedLabel) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query, selectedLabel]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLabel]);

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-300 bg-bg shadow-lg"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nenhum resultado</li>}
          {filtered.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-surface"
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd frontend
npx vitest run src/components/ui/SearchableSelect.test.tsx
```

Expected: PASS nos 3 testes.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/components/ui/SearchableSelect.tsx src/components/ui/SearchableSelect.test.tsx
git commit -m "feat: adiciona componente SearchableSelect reutilizavel"
```
