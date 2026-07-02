# Fase 2 — Phase E: Demandas (Tasks 11-13)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on the already-merged Upload de Imagens feature (`ImageUpload` component, `frontend/src/components/ui/ImageUpload.tsx`) and on Phase D, Task 8 (`ProfessionalProfileHeader`'s "Contratar" button, which navigates to `/demands/new?professionalId=...` — Task 13 here fulfills that contract). Work from `frontend/` unless noted.

**Design refinement (read before Task 12):** the spec's "Conversar" button is implemented per-quote, not once at the demand header — a demand can receive quotes from multiple different professionals, so a single demand-level chat button would be ambiguous about which professional to message. Each `QuoteCard` (Task 12) gets its own "Conversar" action, using that quote's own `professionalId` to resolve the professional's `userId` (via `usePublicProfile`) before creating the chat room.

---

### Task 11: Fotos na publicação de demanda + `DemandCard` v2

**Files:**
- Modify: `frontend/src/features/demands/api.ts`
- Modify: `frontend/src/features/demands/queries.ts`
- Modify: `frontend/src/features/demands/components/DemandForm.tsx`
- Modify: `frontend/src/features/demands/pages/PublishDemandPage.tsx`
- Modify: `frontend/src/features/demands/components/DemandCard.tsx`
- Test: `frontend/src/features/demands/components/DemandForm.test.tsx` (new)
- Test: `frontend/src/features/demands/components/DemandCard.test.tsx` (new)
- Test: `frontend/src/features/demands/queries.test.ts` (new, or extend if one already exists — check first)

**Interfaces:**
- Consumes: `ImageUpload`, `UploadResult` from `frontend/src/components/ui/ImageUpload.tsx` / `frontend/src/features/uploads/api.ts`; `Badge` from `frontend/src/components/ui/Badge.tsx`.
- Produces: `publishDemand(values: DemandFormValues, images?: string[]): Promise<Demand>` (signature change — second param added, defaults to `[]`, backward compatible for any other caller); `usePublishDemand()`'s mutation input becomes `{ values: DemandFormValues; images: string[] }` (breaking change — this task updates its one call site, `PublishDemandPage`, in the same task so nothing is left broken); `DemandForm`'s `onSubmit` prop becomes `(values: DemandFormValues, images: string[]) => void`.

- [ ] **Step 1: Update `publishDemand` in `api.ts`**

In `frontend/src/features/demands/api.ts`, replace:

```ts
export async function publishDemand(values: DemandFormValues): Promise<Demand> {
  const { data } = await http.post<Demand>('/demands', { ...values, addressId: null, tagIds: [], images: [] });
  return data;
}
```

with:

```ts
export async function publishDemand(values: DemandFormValues, images: string[] = []): Promise<Demand> {
  const { data } = await http.post<Demand>('/demands', {
    ...values,
    addressId: null,
    tagIds: [],
    images: images.map((url, position) => ({ url, position })),
  });
  return data;
}
```

- [ ] **Step 2: Write the failing test for `usePublishDemand`**

Check whether `frontend/src/features/demands/queries.test.ts` already exists first; if it does, add this test into its existing `describe` block for `usePublishDemand` (or create one) instead of duplicating the file's setup. If it doesn't exist, create it with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { publishDemand } from './api';
import { usePublishDemand } from './queries';

vi.mock('./api', () => ({ publishDemand: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePublishDemand', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama publishDemand com os valores e as imagens', async () => {
    vi.mocked(publishDemand).mockResolvedValue({ id: 'd1' } as never);

    const { result } = renderHook(() => usePublishDemand(), { wrapper });
    result.current.mutate({
      values: { categoryId: 'c1', title: 'Pintar sala', description: 'Descricao com mais de vinte caracteres', budgetMin: 100, budgetMax: 200 },
      images: ['/uploads/foto1.jpg'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(publishDemand).toHaveBeenCalledWith(
      { categoryId: 'c1', title: 'Pintar sala', description: 'Descricao com mais de vinte caracteres', budgetMin: 100, budgetMax: 200 },
      ['/uploads/foto1.jpg'],
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/demands/queries.test.ts`
Expected: FAIL — `usePublishDemand`'s `mutationFn` still takes a single `DemandFormValues` argument, not `{ values, images }`

- [ ] **Step 4: Update `usePublishDemand` in `queries.ts`**

In `frontend/src/features/demands/queries.ts`, replace:

```ts
export function usePublishDemand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: DemandFormValues) => publishDemand(values),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.all }),
  });
}
```

with:

```ts
export function usePublishDemand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { values: DemandFormValues; images: string[] }) => publishDemand(input.values, input.images),
    onSuccess: () => client.invalidateQueries({ queryKey: demandKeys.all }),
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/demands/queries.test.ts`
Expected: PASS

- [ ] **Step 6: Write the failing test for `DemandForm`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandForm } from './DemandForm';

vi.mock('../../../components/ui/ImageUpload', () => ({
  ImageUpload: ({ onUploaded }: { onUploaded: (result: { url: string; filename: string; size: number }) => void }) => (
    <button type="button" onClick={() => onUploaded({ url: '/uploads/foto.jpg', filename: 'foto.jpg', size: 100 })}>
      Simular upload
    </button>
  ),
}));

describe('DemandForm', () => {
  it('envia os valores com array de imagens vazio quando nenhuma foto foi enviada', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DemandForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Categoria'), '11111111-1111-4111-8111-111111111111');
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Orçamento mínimo'), '100');
    await user.type(screen.getByLabelText('Orçamento máximo'), '300');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), []);
  });

  it('acumula urls de fotos enviadas e as inclui no submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DemandForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Simular upload' }));
    await user.type(screen.getByLabelText('Categoria'), '11111111-1111-4111-8111-111111111111');
    await user.type(screen.getByLabelText('Título'), 'Pintar a sala inteira');
    await user.type(screen.getByLabelText('Descrição'), 'Preciso pintar a sala inteira com tinta branca fosca');
    await user.type(screen.getByLabelText('Orçamento mínimo'), '100');
    await user.type(screen.getByLabelText('Orçamento máximo'), '300');
    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), ['/uploads/foto.jpg']);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/features/demands/components/DemandForm.test.tsx`
Expected: FAIL — `DemandForm` doesn't render an `ImageUpload` yet, and its `onSubmit` prop only receives `values`, not `(values, images)`; also the form's inputs currently have no accessible `<label>` association (`register`-bound inputs use a `<span>` for the label text, not `htmlFor`/`id`) — read the current file first: if `getByLabelText` doesn't resolve, add `id`/`htmlFor` pairs to each field as part of this task's fix (a pre-existing accessibility gap this task's test exposes)

- [ ] **Step 8: Update `DemandForm.tsx`**

Replace the full file content with:

```tsx
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { demandFormSchema, type DemandFormValues } from '../schemas';
import { ImageUpload } from '../../../components/ui/ImageUpload';

interface DemandFormProps {
  onSubmit: (values: DemandFormValues, images: string[]) => void;
  submitting?: boolean;
}

export function DemandForm({ onSubmit, submitting }: DemandFormProps): JSX.Element {
  const [images, setImages] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: { title: '', description: '', budgetMin: 0, budgetMax: 0, categoryId: '' },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, images))} className="flex flex-col gap-3">
      <label htmlFor="demand-category" className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Categoria</span>
        <input id="demand-category" {...register('categoryId')} className="rounded-lg border border-slate-300 px-3 py-2" />
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
        <label htmlFor="demand-budget-min" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento mínimo</span>
          <input
            id="demand-budget-min"
            type="number"
            step="0.01"
            {...register('budgetMin')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label htmlFor="demand-budget-max" className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-slate-600">Orçamento máximo</span>
          <input
            id="demand-budget-max"
            type="number"
            step="0.01"
            {...register('budgetMax')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.budgetMax && <span className="text-xs text-red-600">{errors.budgetMax.message}</span>}
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
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        Publicar demanda
      </button>
    </form>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/features/demands/components/DemandForm.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 10: Fix the only call site — `PublishDemandPage.tsx`**

Replace the full file content with:

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';
import type { DemandFormValues } from '../schemas';

export default function PublishDemandPage(): JSX.Element {
  const navigate = useNavigate();
  const publish = usePublishDemand();

  function handleSubmit(values: DemandFormValues, images: string[]) {
    publish.mutate(
      { values, images },
      { onSuccess: (demand) => navigate(`/demands/${demand.id}`) },
    );
  }

  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm submitting={publish.isPending} onSubmit={handleSubmit} />
    </section>
  );
}
```

(Task 13 extends this further with the `?professionalId=` auto-invite behavior — this step only keeps the page working with the new `DemandForm`/`usePublishDemand` signatures.)

- [ ] **Step 11: Write the failing test for `DemandCard`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandCard } from './DemandCard';
import type { Demand } from '../api';

const baseDemand: Demand = {
  id: 'd1',
  clientId: 'c1',
  categoryId: 'cat1',
  title: 'Pintar sala',
  description: 'x',
  budgetMin: 100,
  budgetMax: 200,
  status: 'open',
  addressId: null,
  images: [],
  tagIds: [],
  createdAt: '',
};

describe('DemandCard', () => {
  it('mostra o titulo, a faixa de orcamento e o badge de status aberta', () => {
    render(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('mostra o badge Concluída para demanda fechada', () => {
    render(<DemandCard demand={{ ...baseDemand, status: 'closed' }} onOpen={vi.fn()} />);

    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });

  it('chama onOpen com o id ao clicar', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<DemandCard demand={baseDemand} onOpen={onOpen} />);

    await user.click(screen.getByRole('button'));

    expect(onOpen).toHaveBeenCalledWith('d1');
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `npx vitest run src/features/demands/components/DemandCard.test.tsx`
Expected: FAIL — current component renders the raw `demand.status` string (`open`), not the Portuguese label `Aberta`/`Concluída`

- [ ] **Step 13: Update `DemandCard.tsx`**

Replace the full file content with:

```tsx
import type { JSX } from 'react';
import { Badge } from '../../../components/ui/Badge';
import type { Demand } from '../api';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABELS: Record<Demand['status'], string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Concluída',
  cancelled: 'Cancelada',
};

interface DemandCardProps {
  demand: Demand;
  onOpen: (id: string) => void;
}

export function DemandCard({ demand, onOpen }: DemandCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(demand.id)}
      className="flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{demand.title}</span>
        <Badge tone={demand.status === 'open' ? 'urgent' : 'neutral'}>{STATUS_LABELS[demand.status]}</Badge>
      </div>
      <span className="text-sm text-muted">
        {currency(demand.budgetMin)} — {currency(demand.budgetMax)}
      </span>
    </button>
  );
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `npx vitest run src/features/demands/components/DemandCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 15: Run the full frontend suite to confirm no regression**

Run: `npm run test`
Expected: PASS (all suites)

- [ ] **Step 16: Commit**

```bash
git add frontend/src/features/demands/api.ts frontend/src/features/demands/queries.ts frontend/src/features/demands/queries.test.ts frontend/src/features/demands/components/DemandForm.tsx frontend/src/features/demands/components/DemandForm.test.tsx frontend/src/features/demands/pages/PublishDemandPage.tsx frontend/src/features/demands/components/DemandCard.tsx frontend/src/features/demands/components/DemandCard.test.tsx
git commit -m "feat(demands): adiciona fotos na publicacao e badges de status"
```

---

### Task 12: `QuoteCard`

**Files:**
- Create: `frontend/src/features/demands/components/QuoteCard.tsx`
- Test: `frontend/src/features/demands/components/QuoteCard.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button` from `frontend/src/components/ui/`; `usePublicProfile` from `frontend/src/features/professional/queries.ts`; `useCreateRoom` from `frontend/src/features/chat/queries.ts`; `formatCurrency` from `frontend/src/lib/utils.ts`; `Quote` type from `frontend/src/features/demands/api.ts`.
- Produces: `QuoteCardProps { quote: Quote; canAccept: boolean; onAccept: () => void; accepting: boolean }`, `QuoteCard` component. Consumed by `DemandDetailPage` (Task 13).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { QuoteCard } from './QuoteCard';
import { usePublicProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import type { Quote } from '../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../professional/queries', () => ({ usePublicProfile: vi.fn() }));
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));

const quote: Quote = {
  id: 'q1',
  demandId: 'd1',
  professionalId: 'p1',
  message: 'Posso fazer amanhã',
  total: 250,
  status: 'pending',
  validUntil: null,
  items: [{ description: 'Mão de obra', quantity: 1, unitPrice: 250, subtotal: 250 }],
  createdAt: '',
};

describe('QuoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePublicProfile).mockReturnValue({ data: { headline: 'Eletricista João', userId: 'user-1' } } as never);
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza o profissional, itens e total', () => {
    renderWithProviders(<QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />);

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('Mão de obra')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
  });

  it('mostra o botao Aceitar apenas quando canAccept e true', () => {
    const { rerender } = renderWithProviders(
      <QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();

    rerender(<QuoteCard quote={quote} canAccept onAccept={vi.fn()} accepting={false} />);
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
  });

  it('chama onAccept ao clicar em Aceitar', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<QuoteCard quote={quote} canAccept onAccept={onAccept} accepting={false} />);

    await user.click(screen.getByRole('button', { name: 'Aceitar' }));

    expect(onAccept).toHaveBeenCalled();
  });

  it('cria sala de chat com o userId do profissional que enviou o orcamento', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (room: { id: string }) => void }) => {
      options?.onSuccess({ id: 'room-1' });
    });
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderWithProviders(<QuoteCard quote={quote} canAccept={false} onAccept={vi.fn()} accepting={false} />);

    await user.click(screen.getByRole('button', { name: 'Conversar' }));

    expect(mutate).toHaveBeenCalledWith({ participantId: 'user-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith('/chat/room-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/demands/components/QuoteCard.test.tsx`
Expected: FAIL — `Cannot find module './QuoteCard'`

- [ ] **Step 3: Write `QuoteCard.tsx`**

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { usePublicProfile } from '../../professional/queries';
import { useCreateRoom } from '../../chat/queries';
import type { Quote } from '../api';
import { formatCurrency } from '../../../lib/utils';

export interface QuoteCardProps {
  quote: Quote;
  canAccept: boolean;
  onAccept: () => void;
  accepting: boolean;
}

const STATUS_LABELS: Record<Quote['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  rejected: 'Rejeitado',
  withdrawn: 'Retirado',
};

export function QuoteCard({ quote, canAccept, onAccept, accepting }: QuoteCardProps): JSX.Element {
  const navigate = useNavigate();
  const { data: profile } = usePublicProfile(quote.professionalId);
  const createRoom = useCreateRoom();

  function handleChat() {
    if (!profile) return;
    createRoom.mutate({ participantId: profile.userId }, { onSuccess: (room) => navigate(`/chat/${room.id}`) });
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">{profile?.headline ?? 'Profissional'}</span>
        <Badge tone={quote.status === 'pending' ? 'urgent' : 'neutral'}>{STATUS_LABELS[quote.status]}</Badge>
      </div>
      {quote.message && <p className="text-sm text-muted">{quote.message}</p>}
      <ul className="flex flex-col gap-1 text-sm text-ink">
        {quote.items.map((item, index) => (
          <li key={index} className="flex justify-between">
            <span>
              {item.quantity}x {item.description}
            </span>
            <span>{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-ink">{formatCurrency(quote.total)}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleChat} disabled={!profile || createRoom.isPending}>
            Conversar
          </Button>
          {canAccept && (
            <Button onClick={onAccept} disabled={accepting}>
              Aceitar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/demands/components/QuoteCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/demands/components/QuoteCard.tsx frontend/src/features/demands/components/QuoteCard.test.tsx
git commit -m "feat(demands): adiciona QuoteCard com chat por orcamento"
```

---

### Task 13: Composição do `DemandDetailPage`, `DemandListPage` e convite automático no `PublishDemandPage`

**Files:**
- Modify: `frontend/src/features/demands/pages/DemandDetailPage.tsx`
- Modify: `frontend/src/features/demands/pages/DemandListPage.tsx`
- Modify: `frontend/src/features/demands/pages/PublishDemandPage.tsx`
- Test: `frontend/src/features/demands/pages/DemandDetailPage.test.tsx` (new)
- Test: `frontend/src/features/demands/pages/DemandListPage.test.tsx` (new)
- Test: `frontend/src/features/demands/pages/PublishDemandPage.test.tsx` (new)

**Interfaces:**
- Consumes: `QuoteCard` (Task 12); `DemandCard` v2 (Task 11); `Button`, `Skeleton`, `Badge`, `EmptyState` from `frontend/src/components/ui/`; `inviteProfessional` from `frontend/src/features/demands/api.ts` (existing function, called directly/imperatively here rather than through `useInviteProfessional`, since the professional id comes from a URL query param read only once after a freshly-created demand — no query invalidation semantics are needed for this one-off call).

- [ ] **Step 1: Write the failing test for `DemandDetailPage`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import DemandDetailPage from './DemandDetailPage';
import { useDemand, useDemandQuotes, useAcceptQuote, useCreateQuote } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'd1' }) };
});
vi.mock('../queries', () => ({
  useDemand: vi.fn(),
  useDemandQuotes: vi.fn(),
  useAcceptQuote: vi.fn(),
  useCreateQuote: vi.fn(),
}));
vi.mock('../components/QuoteCard', () => ({ QuoteCard: () => <div>quote-card</div> }));
vi.mock('../components/InviteProfessionalDialog', () => ({
  InviteProfessionalDialog: () => <div>invite-dialog</div>,
}));
vi.mock('../components/QuoteForm', () => ({ QuoteForm: () => <div>quote-form</div> }));

const demand = {
  id: 'd1',
  title: 'Pintar sala',
  description: 'Pintura completa',
  status: 'open',
  images: [{ url: '/uploads/foto1.jpg', position: 0 }],
};

describe('DemandDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    vi.mocked(useAcceptQuote).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCreateQuote).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza titulo, descricao, fotos e orcamentos', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [{ id: 'q1' }] } as never);

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Pintura completa')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/foto1.jpg');
    expect(screen.getByText('quote-card')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha orcamentos', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [] } as never);

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('Nenhum orçamento recebido ainda')).toBeInTheDocument();
  });

  it('mostra QuoteForm apenas para profissional em demanda aberta', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [] } as never);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('quote-form')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/demands/pages/DemandDetailPage.test.tsx`
Expected: FAIL — current page renders raw `<li>` quote entries, no photo gallery, no `QuoteCard`

- [ ] **Step 3: Replace `DemandDetailPage.tsx`**

```tsx
import { useState, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useDemand, useDemandQuotes, useAcceptQuote, useCreateQuote } from '../queries';
import { QuoteCard } from '../components/QuoteCard';
import { InviteProfessionalDialog } from '../components/InviteProfessionalDialog';
import { QuoteForm } from '../components/QuoteForm';
import { useAuthStore } from '../../../stores/auth';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function DemandDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [inviting, setInviting] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const { data: demand, isPending } = useDemand(id);
  const { data: quotes } = useDemandQuotes(id);
  const accept = useAcceptQuote(id);
  const createQuote = useCreateQuote(id);

  if (isPending) {
    return <Skeleton className="m-6 h-40 w-full" aria-label="Carregando demanda" />;
  }

  if (!demand) {
    return <EmptyState className="m-6" title="Demanda não encontrada" />;
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{demand.title}</h1>
          <Badge tone={demand.status === 'open' ? 'urgent' : 'neutral'}>{demand.status}</Badge>
        </div>
        <Button variant="ghost" onClick={() => setInviting(true)}>
          Convidar profissional
        </Button>
      </header>
      <p className="text-ink">{demand.description}</p>
      {demand.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {demand.images.map((image) => (
            <img
              key={image.url}
              src={image.url}
              alt={demand.title}
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}
      <h2 className="text-lg font-semibold text-ink">Orçamentos ({quotes?.length ?? 0})</h2>
      {!quotes || quotes.length === 0 ? (
        <EmptyState title="Nenhum orçamento recebido ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              canAccept={quote.status === 'pending' && demand.status === 'open'}
              onAccept={() => accept.mutate(quote.id)}
              accepting={accept.isPending}
            />
          ))}
        </div>
      )}
      {role === 'professional' && demand.status === 'open' && (
        <QuoteForm submitting={createQuote.isPending} onSubmit={(values) => createQuote.mutate(values)} />
      )}
      {inviting && <InviteProfessionalDialog demandId={id} onClose={() => setInviting(false)} />}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/demands/pages/DemandDetailPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `DemandListPage`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import DemandListPage from './DemandListPage';
import { useDemands } from '../queries';

vi.mock('../queries', () => ({ useDemands: vi.fn() }));

describe('DemandListPage', () => {
  it('mostra estado vazio com CTA quando nao ha demandas', () => {
    vi.mocked(useDemands).mockReturnValue({ data: { items: [], page: 1, limit: 20, total: 0 }, isPending: false } as never);

    renderWithProviders(<DemandListPage />);

    expect(screen.getByText('Nenhuma demanda ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar demanda' })).toBeInTheDocument();
  });

  it('lista as demandas retornadas', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: {
        items: [{ id: 'd1', title: 'Pintar sala', budgetMin: 100, budgetMax: 200, status: 'open', clientId: '', categoryId: '', description: '', addressId: null, images: [], tagIds: [], createdAt: '' }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DemandListPage />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/demands/pages/DemandListPage.test.tsx`
Expected: FAIL — current page has no `EmptyState`/`Skeleton` and never shows "Nenhuma demanda ainda"

- [ ] **Step 7: Replace `DemandListPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemandCard } from '../components/DemandCard';
import { useDemands } from '../queries';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function DemandListPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isPending } = useDemands();

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold text-ink">Demandas</h1>
      {isPending ? (
        <Skeleton className="h-24 w-full" aria-label="Carregando demandas" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma demanda ainda"
          action={<Button onClick={() => navigate('/demands/new')}>Publicar demanda</Button>}
        />
      ) : (
        data.items.map((d) => <DemandCard key={d.id} demand={d} onOpen={(id) => navigate(`/demands/${id}`)} />)
      )}
    </section>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/demands/pages/DemandListPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing test for the `PublishDemandPage` auto-invite behavior**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PublishDemandPage from './PublishDemandPage';
import { usePublishDemand } from '../queries';
import { inviteProfessional } from '../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../queries', () => ({ usePublishDemand: vi.fn() }));
vi.mock('../api', () => ({ inviteProfessional: vi.fn() }));
vi.mock('../components/DemandForm', () => ({
  DemandForm: ({ onSubmit }: { onSubmit: (values: unknown, images: string[]) => void }) => (
    <button type="button" onClick={() => onSubmit({ title: 'x' }, [])}>
      Simular publicacao
    </button>
  ),
}));

function renderPage(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PublishDemandPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublishDemandPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('convida o profissional automaticamente quando professionalId esta na URL', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (demand: { id: string }) => void }) => {
      options?.onSuccess({ id: 'd1' });
    });
    vi.mocked(usePublishDemand).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(inviteProfessional).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage('/demands/new?professionalId=prof-1');

    await user.click(screen.getByRole('button', { name: 'Simular publicacao' }));

    expect(inviteProfessional).toHaveBeenCalledWith('d1', 'prof-1');
    expect(navigateMock).toHaveBeenCalledWith('/demands/d1');
  });

  it('nao chama inviteProfessional quando nao ha professionalId na URL', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (demand: { id: string }) => void }) => {
      options?.onSuccess({ id: 'd1' });
    });
    vi.mocked(usePublishDemand).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderPage('/demands/new');

    await user.click(screen.getByRole('button', { name: 'Simular publicacao' }));

    expect(inviteProfessional).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/demands/d1');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/features/demands/pages/PublishDemandPage.test.tsx`
Expected: FAIL — the page doesn't read `professionalId` from the URL or call `inviteProfessional` yet

- [ ] **Step 11: Replace `PublishDemandPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';
import { inviteProfessional } from '../api';
import type { DemandFormValues } from '../schemas';

export default function PublishDemandPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const professionalId = searchParams.get('professionalId');
  const publish = usePublishDemand();

  function handleSubmit(values: DemandFormValues, images: string[]) {
    publish.mutate(
      { values, images },
      {
        onSuccess: async (demand) => {
          if (professionalId) {
            await inviteProfessional(demand.id, professionalId);
          }
          navigate(`/demands/${demand.id}`);
        },
      },
    );
  }

  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm submitting={publish.isPending} onSubmit={handleSubmit} />
    </section>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/demands/pages/PublishDemandPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 13: Run the full frontend suite**

Run: `npm run test`
Expected: PASS (all suites)

- [ ] **Step 14: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all exit 0

- [ ] **Step 15: Commit**

```bash
git add frontend/src/features/demands/pages/DemandDetailPage.tsx frontend/src/features/demands/pages/DemandDetailPage.test.tsx frontend/src/features/demands/pages/DemandListPage.tsx frontend/src/features/demands/pages/DemandListPage.test.tsx frontend/src/features/demands/pages/PublishDemandPage.tsx frontend/src/features/demands/pages/PublishDemandPage.test.tsx
git commit -m "feat(demands): compoe DemandDetailPage e DemandListPage, convite automatico ao contratar do perfil"
```

---

### Task 14: Smoke test visual via Playwright (Tasks 1-13)

**Files:**
- Create: `frontend/e2e/phase2-visual.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect` from `frontend/e2e/fixtures.ts` (`clientPage`/`professionalPage` fixtures, already authenticated); `seedCategory` from `frontend/e2e/seed.ts`.
- Produces: no new interface — this is a verification-only task exercising every screen built in Tasks 1-13 end-to-end against the real running app (real backend, real MySQL/Redis via docker compose, not mocked), and capturing a screenshot per screen for manual visual review.

This task requires the full stack running: `docker compose up -d mysql redis`, backend migrated and running (`npm run migration:run --workspace @marketplace/backend && npm run dev --workspace @marketplace/backend`), and the frontend build previewed (`npm run build && npm run preview`, matching `playwright.config.ts`'s `baseURL: http://localhost:4173`) — or `E2E_BASE_URL` pointed at an already-running dev server. Follow whatever the existing `e2e:*` npm scripts in `frontend/package.json` already assume (read `frontend/package.json` and any `e2e/README`-equivalent setup notes first; do not invent a different startup sequence).

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from './fixtures';
import { seedCategory } from './seed';

test.describe('fase 2 — verificação visual', () => {
  test('dashboard cliente renderiza todos os widgets', async ({ clientPage }) => {
    await clientPage.goto('/');

    await expect(clientPage.getByRole('heading', { name: 'Painel' })).toBeVisible();
    await expect(clientPage.getByRole('button', { name: 'Publicar demanda' })).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-dashboard-cliente.png', fullPage: true });
  });

  test('busca mostra filtros e cards de profissionais', async ({ clientPage }) => {
    await clientPage.goto('/search');

    await expect(clientPage.getByLabel('Cidade')).toBeVisible();
    await expect(clientPage.getByLabel('Disponível agora')).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-busca.png', fullPage: true });
  });

  test('fluxo completo: publicar demanda com foto, ver na lista e no detalhe', async ({ clientPage }) => {
    const categoryId = seedCategory();
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const title = `Verificação visual fase 2 ${unique}`;

    await clientPage.goto('/demands/new');
    await clientPage.getByLabel('Categoria').fill(categoryId);
    await clientPage.getByLabel('Título').fill(title);
    await clientPage.getByLabel('Descrição').fill('Demanda criada pelo smoke test visual da fase 2, cobrindo o formulario com secao de fotos.');
    await clientPage.getByLabel('Orçamento mínimo').fill('200');
    await clientPage.getByLabel('Orçamento máximo').fill('800');
    await expect(clientPage.getByRole('button', { name: 'Adicionar foto' })).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-publicar-demanda.png', fullPage: true });

    await clientPage.getByRole('button', { name: 'Publicar demanda' }).click();
    await clientPage.waitForURL(/\/demands\/[0-9a-f-]+$/);
    await expect(clientPage.getByRole('heading', { name: title })).toBeVisible();
    await expect(clientPage.getByText('Nenhum orçamento recebido ainda')).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-detalhe-demanda.png', fullPage: true });

    await clientPage.goto('/demands');
    await expect(clientPage.getByText(title)).toBeVisible();
    await expect(clientPage.getByText('Aberta')).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-lista-demandas.png', fullPage: true });
  });

  test('perfil público de profissional mostra header, portfólio, disponibilidade e avaliações', async ({
    clientPage,
    professionalPage,
  }) => {
    // professionalPage fixture seeds and authenticates a professional user;
    // read its seeded user id/professional-profile id from the fixture (frontend/e2e/seed.ts)
    // to navigate clientPage to that professional's public profile. If seed.ts's
    // SeededUser type doesn't expose a professional-profile id directly, use
    // whatever it does expose (e.g. search by the seeded professional's headline
    // via /search) — read frontend/e2e/seed.ts first to confirm the real shape.
    await professionalPage.goto('/professional/dashboard');

    await clientPage.goto('/search');
    // Navigate to the first result's public profile via the UI rather than
    // constructing the URL by hand, since the professional-profile id isn't
    // predictable from the seed alone:
    await clientPage.getByRole('link').first().click();
    await clientPage.waitForURL(/\/professionals\/[0-9a-f-]+$/);

    await expect(clientPage.getByRole('button', { name: 'Favoritar', exact: false }).or(clientPage.getByRole('button', { name: /favoritos/i }))).toBeVisible();
    await expect(clientPage.getByRole('button', { name: 'Contratar' })).toBeVisible();
    await expect(clientPage.getByRole('button', { name: 'Chat' })).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/phase2-perfil-publico.png', fullPage: true });
  });
});
```

- [ ] **Step 2: Confirm the stack is up**

Run: `docker compose ps`
Expected: `mysql` and `redis` both show `healthy`. If not, run `docker compose up -d mysql redis` and wait for healthchecks.

- [ ] **Step 3: Run migrations and start the backend (separate terminal, keep running)**

Run: `npm run migration:run --workspace @marketplace/backend && npm run dev --workspace @marketplace/backend`
Expected: server logs `listening` on port 3000, no errors.

- [ ] **Step 4: Build and preview the frontend (separate terminal, keep running)**

Run: `npm run build --workspace @marketplace/frontend && npm run preview --workspace @marketplace/frontend`
Expected: preview server serving on `http://localhost:4173` (matches `playwright.config.ts`'s default `baseURL`).

- [ ] **Step 5: Run the new spec**

Run: `cd frontend && npx playwright test e2e/phase2-visual.spec.ts --project=clients`
Expected: all 4 tests PASS. If the last test's "click first search result" step finds zero results (no professional seeded with public visibility), adjust it to seed one explicitly first — check whether `frontend/e2e/seed.ts` already exposes a helper for creating a professional with a public profile (e.g. alongside `seedUser('professional')`) and use it; if none exists, report DONE_WITH_CONCERNS explaining the gap rather than inventing new backend seeding logic.

- [ ] **Step 6: Review the screenshots**

The 5 screenshots land in `frontend/test-results/phase2-*.png`. Open each one and visually confirm: Fase 1's design tokens (indigo primary, coral accent, Manrope font) are applied consistently, no layout overflow/breakage, `EmptyState`/`Skeleton` render as designed where applicable, `FavoriteButton`/`Badge`/`Avatar` render correctly composed into the richer cards. This is a human-in-the-loop visual check — the automated assertions in Step 5 only confirm the DOM structure is correct, not that it looks right.

- [ ] **Step 7: Commit**

```bash
cd /Users/jorgecamargo/Downloads/Projeto-TDS
git add frontend/e2e/phase2-visual.spec.ts
git commit -m "test(e2e): adiciona verificacao visual da fase 2 (dashboard, busca, perfil, demandas)"
```

---

This completes Fase 2. Full-project verification (typecheck/lint/test/build across the whole plan's changes) should be re-run once more after all 5 phase files are merged, since each phase file only verifies its own slice.
