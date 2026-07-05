# Fase 4 — `DemandForm`: categoria, endereço, orçamento, botão (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Depende da Fase 3 (`SearchableSelect`, `BRAZIL_STATES`). Pra rodar de ponta a ponta contra a API real depende também das Fases 1-2 (backend). A galeria de fotos com hover/preview é a Fase 5 — esta fase mantém a lista de fotos simples (igual já era) pra não referenciar um componente que ainda não existe. Ver `plan_index.md`.

**Goal:** Categoria vira combobox pesquisável, remove orçamento mínimo/máximo, adiciona campos de endereço completo (rua/número/complemento/bairro/cidade/UF/CEP), botão "Publicar demanda" vira roxo (`Button variant="primary"`).

**Architecture:** `demands/schemas.ts` espelha o `createDemandSchema` do backend (Fase 2). `DemandForm.tsx` usa `react-hook-form` + `Controller` pra ligar `SearchableSelect` (categoria e UF) ao form. `demands/api.ts` para de mandar `addressId` e passa a mandar os campos de endereço direto.

**Tech Stack:** React, react-hook-form, Zod, Vitest, Testing Library.

## Global Constraints

Ver `plan_index.md`.

---

### Task 4.1: `demands/schemas.ts` — endereço no lugar de orçamento/addressId

**Files:**
- Modify: `frontend/src/features/demands/schemas.ts`

**Interfaces:**
- Produces: `DemandFormValues` com `categoryId, title, description, street, number, complement, district, city, state, zipCode` — consumido pela Task 4.2 (`DemandForm`) e pela Task 4.3 (`api.ts`).

- [ ] **Step 1: Reescrever `demandFormSchema`**

Em `frontend/src/features/demands/schemas.ts`, substituir `demandFormSchema`/`DemandFormValues` (mantendo `quoteItemFormSchema`/`quoteFormSchema`/`QuoteFormValues` como estão):

```ts
export const demandFormSchema = z.object({
  categoryId: z.string().uuid('Categoria obrigatória'),
  title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
  description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
  street: z.string().min(1, 'Informe a rua'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().nullable(),
  district: z.string().min(1, 'Informe o bairro'),
  city: z.string().min(1, 'Informe a cidade'),
  state: z.string().length(2, 'Selecione a UF'),
  zipCode: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
});

export type DemandFormValues = z.infer<typeof demandFormSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/features/demands/schemas.ts
git commit -m "feat: schema do form de demanda troca orcamento por endereco completo"
```

---

### Task 4.2: `demands/api.ts` — payload e tipo `Demand`

**Files:**
- Modify: `frontend/src/features/demands/api.ts`

**Interfaces:**
- Consumes: `DemandFormValues` (Task 4.1).
- Produces: `Demand` (interface) com `city, state, street, number, complement, district, zipCode` no lugar de `addressId`; `budgetMin`/`budgetMax` como `number | null`. Consumido por qualquer tela que já usa `fetchDemand`/`fetchDemands` (detalhe/lista — fora do escopo desta tarefa, mas o tipo precisa compilar).

- [ ] **Step 1: Atualizar a interface `Demand` e `publishDemand`**

Em `frontend/src/features/demands/api.ts`, substituir a interface `Demand` e a função `publishDemand`:

```ts
export interface Demand {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: DemandStatus;
  city: string;
  state: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  zipCode: string | null;
  images: DemandImage[];
  tagIds: string[];
  createdAt: string;
}
```

```ts
export async function publishDemand(values: DemandFormValues, images: string[] = []): Promise<Demand> {
  const { data } = await http.post<Demand>('/demands', {
    ...values,
    tagIds: [],
    images: images.map((url, position) => ({ url, position })),
  });
  return data;
}
```

- [ ] **Step 2: Checar tipos do frontend**

```bash
cd frontend
npm run typecheck
```

Expected: sem erros novos em `api.ts`. Se alguma outra tela (detalhe de demanda) referenciar `demand.addressId`, listar aqui e corrigir só a referência de tipo (trocar por `demand.city`/`demand.state` conforme o contexto) — não faz parte do escopo desta tarefa mudar a UI dessas telas, só manter o build verde.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/demands/api.ts
git commit -m "feat: Demand (frontend) troca addressId por campos de endereco completo"
```

---

### Task 4.3: `DemandForm.tsx` — categoria combobox, endereço, sem orçamento, botão roxo

**Files:**
- Modify: `frontend/src/features/demands/components/DemandForm.tsx`
- Test: `frontend/src/features/demands/components/DemandForm.test.tsx`

**Interfaces:**
- Consumes: `SearchableSelect` (`../../../components/ui/SearchableSelect`, Fase 3), `BRAZIL_STATES` (`../../../lib/brazilStates`, Fase 3), `Button` (`../../../components/ui/Button`), `DemandFormValues`/`demandFormSchema` (Task 4.1).
- Produces: `DemandForm` continua com a mesma prop pública `{ onSubmit: (values, images) => void; submitting?: boolean }` — sem mudança de interface externa, só o formulário interno.

- [ ] **Step 1: Atualizar o teste existente pros novos campos (falha primeiro)**

Substituir `frontend/src/features/demands/components/DemandForm.test.tsx` inteiro:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DemandForm } from './DemandForm';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('../../../components/ui/ImageUpload', () => ({
  ImageUpload: ({ onUploaded }: { onUploaded: (result: { url: string; filename: string; size: number }) => void }) => (
    <button type="button" onClick={() => onUploaded({ url: '/uploads/foto.jpg', filename: 'foto.jpg', size: 100 })}>
      Simular upload
    </button>
  ),
}));

vi.mock('../../professional/queries', () => ({
  useCategories: () => ({
    data: [{ id: CATEGORY_ID, name: 'Pintura', slug: 'pintura', isActive: true }],
  }),
}));

describe('DemandForm', () => {
  it('envia os valores de endereco e categoria com array de imagens vazio quando nenhuma foto foi enviada', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DemandForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }));
    await user.click(screen.getByRole('option', { name: 'Pintura' }));
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
    await user.type(screen.getByLabelText('Número'), '123');
    await user.type(screen.getByLabelText('Bairro'), 'Centro');
    await user.type(screen.getByLabelText('Cidade'), 'Porto Alegre');
    await user.click(screen.getByRole('combobox', { name: 'UF' }));
    await user.click(screen.getByRole('option', { name: 'Rio Grande do Sul' }));
    await user.type(screen.getByLabelText('CEP'), '90000000');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: CATEGORY_ID,
        street: 'Rua das Flores',
        number: '123',
        district: 'Centro',
        city: 'Porto Alegre',
        state: 'RS',
        zipCode: '90000-000',
      }),
      [],
    );
  });

  it('nao mostra mais campos de orcamento', () => {
    renderWithProviders(<DemandForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('Orçamento mínimo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Orçamento máximo')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd frontend
npx vitest run src/features/demands/components/DemandForm.test.tsx
```

Expected: FAIL — form ainda tem `<select>` de categoria e campos de orçamento, não tem campos de endereço.

- [ ] **Step 3: Reescrever `DemandForm.tsx`**

```tsx
import { useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Button } from '../../../components/ui/Button';
import { useCategories } from '../../professional/queries';
import { BRAZIL_STATES } from '../../../lib/brazilStates';

interface DemandFormProps {
  onSubmit: (values: DemandFormValues, images: string[]) => void;
  submitting?: boolean;
}

function formatZipCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function DemandForm({ onSubmit, submitting }: DemandFormProps): JSX.Element {
  const [images, setImages] = useState<string[]>([]);
  const { data: categories } = useCategories();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: {
      categoryId: '',
      title: '',
      description: '',
      street: '',
      number: '',
      complement: null,
      district: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const categoryOptions =
    categories?.filter((category) => category.isActive).map((category) => ({ value: category.id, label: category.name })) ?? [];

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, images))} className="flex flex-col gap-3">
      <label htmlFor="demand-category" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="demand-category"
              options={categoryOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Buscar categoria"
            />
          )}
        />
        {errors.categoryId && <span className="text-xs text-red-600">{errors.categoryId.message}</span>}
      </label>
      <label htmlFor="demand-title" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Título</span>
        <input id="demand-title" {...register('title')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
      </label>
      <label htmlFor="demand-description" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Descrição</span>
        <textarea
          id="demand-description"
          {...register('description')}
          rows={5}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
      </label>
      <div className="flex gap-3">
        <label htmlFor="demand-street" className="flex flex-[3] flex-col gap-1">
          <span className="text-sm text-slate-600">Rua</span>
          <input id="demand-street" {...register('street')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.street && <span className="text-xs text-red-600">{errors.street.message}</span>}
        </label>
        <label htmlFor="demand-number" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Número</span>
          <input id="demand-number" {...register('number')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.number && <span className="text-xs text-red-600">{errors.number.message}</span>}
        </label>
      </div>
      <label htmlFor="demand-complement" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Complemento (opcional)</span>
        <input
          id="demand-complement"
          {...register('complement')}
          value={undefined}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label htmlFor="demand-district" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Bairro</span>
        <input id="demand-district" {...register('district')} className="rounded-lg border border-slate-300 px-3 py-2" />
        {errors.district && <span className="text-xs text-red-600">{errors.district.message}</span>}
      </label>
      <div className="flex gap-3">
        <label htmlFor="demand-city" className="flex flex-[2] flex-col gap-1">
          <span className="text-sm text-slate-600">Cidade</span>
          <input id="demand-city" {...register('city')} className="rounded-lg border border-slate-300 px-3 py-2" />
          {errors.city && <span className="text-xs text-red-600">{errors.city.message}</span>}
        </label>
        <label htmlFor="demand-state" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">UF</span>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="demand-state"
                options={BRAZIL_STATES}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="UF"
              />
            )}
          />
          {errors.state && <span className="text-xs text-red-600">{errors.state.message}</span>}
        </label>
        <label htmlFor="demand-zip" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">CEP</span>
          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <input
                id="demand-zip"
                value={field.value}
                onChange={(event) => field.onChange(formatZipCode(event.target.value))}
                onBlur={field.onBlur}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            )}
          />
          {errors.zipCode && <span className="text-xs text-red-600">{errors.zipCode.message}</span>}
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-600">Fotos (opcional)</span>
        <ImageUpload label="Adicionar foto" onUploaded={(result) => setImages((prev) => [...prev, result.url])} />
        {images.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {images.map((url) => (
              <li key={url}>
                <img src={url} alt="Foto da demanda" className="h-16 w-16 rounded-md object-cover" />
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" disabled={submitting}>
        Publicar demanda
      </Button>
    </form>
  );
}
```

Nota sobre `complement`: `register('complement')` com valor `null` no default confunde o input controlado (React exige `string`, não `null`); por isso o `value={undefined}` explícito na Step acima deixa o input não-controlado (usa só `defaultValue` implícito do RHF) — o registro do RHF já cuida de string vs null na leitura/escrita interna. Se preferir mais previsível, troque `defaultValues.complement: null` por `defaultValues.complement: ''` no `useForm` e remova o `value={undefined}` do input — mais simples e sem essa pegadinha; use esta segunda forma se o teste da Step 4 passar com ela.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd frontend
npx vitest run src/features/demands/components/DemandForm.test.tsx
```

Expected: PASS nos 2 testes. Se `complement` causar warning de "controlled/uncontrolled input" no console, aplicar a correção descrita no Step 3 (`defaultValues.complement: ''`) e rodar de novo.

- [ ] **Step 5: Rodar toda a suíte de `demands` do frontend**

```bash
cd frontend
npx vitest run src/features/demands
```

Expected: PASS (nenhum outro teste da feature referencia orçamento/`addressId` do form).

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/features/demands/components/DemandForm.tsx src/features/demands/components/DemandForm.test.tsx
git commit -m "feat: DemandForm ganha categoria pesquisavel, endereco completo e remove orcamento"
```
