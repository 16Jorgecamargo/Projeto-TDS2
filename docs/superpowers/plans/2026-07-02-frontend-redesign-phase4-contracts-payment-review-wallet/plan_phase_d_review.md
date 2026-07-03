# Fase D — Avaliação (Nova)

Ver `plan_index.md` para Global Constraints. Independente das Fases B, C e E — só precisa de `POST /reviews`, que já existe no backend sem nenhuma mudança.

### Task 8: Camada de dados de avaliação (`createReview`, `useCreateReview`)

**Files:**
- Modify: `frontend/src/features/reviews/api.ts`
- Modify: `frontend/src/features/reviews/queries.ts`
- Test: `frontend/src/features/reviews/api.test.ts` (adicionar casos)
- Test: `frontend/src/features/reviews/queries.test.tsx` (adicionar casos)

**Interfaces:**
- Consumes: `http` de `frontend/src/lib/http.ts`.
- Produces: `CreateReviewInput = { contractId: string; rating: number; comment: string }`, `createReview(input: CreateReviewInput): Promise<Review>`, `useCreateReview()`. A Task 9 (`ReviewForm`) consome `useCreateReview()`.

- [ ] **Step 1: Escrever o teste falho da API**

Em `frontend/src/features/reviews/api.test.ts`, adicione ao final do arquivo (mantendo o teste de `fetchProfessionalReviews` já existente):
```ts
import { createReview } from './api';

describe('createReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria avaliacao via POST /reviews', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'pu1',
        rating: 5, comment: 'Excelente', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await createReview({ contractId: 'c1', rating: 5, comment: 'Excelente' });

    expect(http.post).toHaveBeenCalledWith('/reviews', { contractId: 'c1', rating: 5, comment: 'Excelente' });
    expect(result.rating).toBe(5);
  });
});
```

Ajuste também o mock do módulo no topo do arquivo, que hoje é `vi.mock('../../lib/http', () => ({ http: { get: vi.fn() } }));` — troque para incluir `post`:
```ts
vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/reviews/api.test.ts`
Esperado: FAIL — `createReview` ainda não existe em `api.ts`.

- [ ] **Step 3: Adicionar `createReview` em `frontend/src/features/reviews/api.ts`**

Adicione ao final do arquivo:
```ts
export interface CreateReviewInput {
  contractId: string;
  rating: number;
  comment: string;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data } = await http.post<Review>('/reviews', input);
  return data;
}
```

- [ ] **Step 4: Rodar teste da API para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/reviews/api.test.ts`
Esperado: PASS (todos os testes do arquivo).

- [ ] **Step 5: Escrever o teste falho do hook**

Em `frontend/src/features/reviews/queries.test.tsx`, se o arquivo ainda não existir crie-o com o conteúdo abaixo; se já existir teste equivalente, mantenha e só adicione o novo `describe`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createReview } from './api';
import { useCreateReview } from './queries';

vi.mock('./api', () => ({
  fetchProfessionalReviews: vi.fn(),
  createReview: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria a avaliacao com o payload informado', async () => {
    vi.mocked(createReview).mockResolvedValue({
      id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'pu1',
      rating: 5, comment: 'Excelente', createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({ contractId: 'c1', rating: 5, comment: 'Excelente' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createReview).toHaveBeenCalledWith({ contractId: 'c1', rating: 5, comment: 'Excelente' });
  });
});
```

- [ ] **Step 6: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/reviews/queries.test.tsx`
Esperado: FAIL — `useCreateReview` ainda não existe em `queries.ts`.

- [ ] **Step 7: Adicionar `useCreateReview` em `frontend/src/features/reviews/queries.ts`**

Atualize o import do topo do arquivo pra incluir `createReview`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfessionalReviews, createReview, type CreateReviewInput } from './api';
```

Adicione ao final do arquivo:
```ts
export function useCreateReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
```

Nota: a invalidação usa o prefixo `['reviews']` (sem o ID específico) porque `Review.targetId` (retornado pela API) é o **user ID** do profissional, enquanto `useProfessionalReviews`/`reviewKeys.list` são indexados pelo **profile ID** — os dois IDs não são o mesmo valor, e não há como converter um no outro sem uma chamada extra. Invalidar com o prefixo genérico invalida todas as queries de avaliação de qualquer profissional, o que é seguro (só causa um refetch a mais) e evita essa inconsistência de identificadores.

- [ ] **Step 8: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/reviews/queries.test.tsx`
Esperado: PASS (todos os testes do arquivo).

- [ ] **Step 9: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/reviews/api.ts frontend/src/features/reviews/queries.ts frontend/src/features/reviews/api.test.ts frontend/src/features/reviews/queries.test.tsx
git commit -m "feat(reviews): adiciona camada de dados de criacao de avaliacao"
```

---

### Task 9: `ReviewForm`

**Files:**
- Create: `frontend/src/features/reviews/schemas.ts`
- Create: `frontend/src/features/reviews/components/ReviewForm.tsx`
- Test: `frontend/src/features/reviews/components/ReviewForm.test.tsx`

**Interfaces:**
- Consumes: `useCreateReview()` (Task 8). `Button` de `components/ui/`. `StarIcon` de `@heroicons/react/24/solid` (mesmo import já usado em `ReviewList.tsx`). `cn` de `frontend/src/lib/utils.ts`.
- Produces: `ReviewForm` com props `{ contractId: string; onDone: () => void }`, consumido pela Fase F na composição final de `ContractDetailPage`. `onDone` é chamado tanto em caso de sucesso (nova avaliação criada) quanto quando a API retorna 409 (já avaliado) — em ambos os casos o formulário deve sumir da tela, já que não há mais nada a fazer.

- [ ] **Step 1: Criar o schema de validação**

Crie `frontend/src/features/reviews/schemas.ts`:
```ts
import { z } from 'zod';

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, 'Selecione uma nota').max(5),
  comment: z.string().min(3, 'Mínimo 3 caracteres').max(2000),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
```

- [ ] **Step 2: Escrever o teste falho**

Crie `frontend/src/features/reviews/components/ReviewForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ReviewForm } from './ReviewForm';
import { useCreateReview } from '../queries';

vi.mock('../queries', () => ({ useCreateReview: vi.fn() }));

describe('ReviewForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia nota e comentario ao submeter', async () => {
    const mutate = vi.fn((_input, opts) => opts?.onSuccess?.());
    vi.mocked(useCreateReview).mockReturnValue({ mutate, isPending: false } as never);
    const onDone = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ReviewForm contractId="c1" onDone={onDone} />);

    await user.click(screen.getByLabelText('5 estrelas'));
    await user.type(screen.getByLabelText('Comentário'), 'Excelente servico');
    await user.click(screen.getByRole('button', { name: 'Enviar avaliação' }));

    expect(mutate).toHaveBeenCalledWith(
      { contractId: 'c1', rating: 5, comment: 'Excelente servico' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('mostra mensagem de avaliacao duplicada quando a API retorna 409', async () => {
    const mutate = vi.fn((_input, opts) => opts?.onError?.({ response: { status: 409 } }));
    vi.mocked(useCreateReview).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ReviewForm contractId="c1" onDone={vi.fn()} />);

    await user.click(screen.getByLabelText('4 estrelas'));
    await user.type(screen.getByLabelText('Comentário'), 'Comentario repetido');
    await user.click(screen.getByRole('button', { name: 'Enviar avaliação' }));

    expect(await screen.findByText('Você já avaliou este contrato.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/reviews/components/ReviewForm.test.tsx`
Esperado: FAIL com "Cannot find module './ReviewForm'".

- [ ] **Step 4: Implementar**

Crie `frontend/src/features/reviews/components/ReviewForm.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StarIcon } from '@heroicons/react/24/solid';
import { reviewFormSchema, type ReviewFormValues } from '../schemas';
import { useCreateReview } from '../queries';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface ReviewFormProps {
  contractId: string;
  onDone: () => void;
}

const RATING_VALUES = [1, 2, 3, 4, 5];

function isConflictError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 409
  );
}

export function ReviewForm({ contractId, onDone }: ReviewFormProps): JSX.Element {
  const [duplicateError, setDuplicateError] = useState(false);
  const createReview = useCreateReview();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const rating = watch('rating');

  const onSubmit = handleSubmit((values) => {
    setDuplicateError(false);
    createReview.mutate(
      { contractId, rating: values.rating, comment: values.comment },
      {
        onSuccess: onDone,
        onError: (error: unknown) => {
          if (isConflictError(error)) {
            setDuplicateError(true);
          }
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota">
        {RATING_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
            aria-pressed={rating === value}
            onClick={() => setValue('rating', value, { shouldValidate: true })}
          >
            <StarIcon className={cn('h-6 w-6', value <= rating ? 'text-accent' : 'text-muted')} />
          </button>
        ))}
      </div>
      {errors.rating && <span className="text-xs text-accent">{errors.rating.message}</span>}
      <label htmlFor="review-comment" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Comentário</span>
        <textarea
          id="review-comment"
          {...register('comment')}
          rows={3}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.comment && <span className="text-xs text-accent">{errors.comment.message}</span>}
      {duplicateError && <p className="text-xs text-accent">Você já avaliou este contrato.</p>}
      <Button type="submit" disabled={createReview.isPending}>
        Enviar avaliação
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/reviews/components/ReviewForm.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 6: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/reviews/schemas.ts frontend/src/features/reviews/components/ReviewForm.tsx frontend/src/features/reviews/components/ReviewForm.test.tsx
git commit -m "feat(reviews): adiciona ReviewForm para avaliacao mutua de contrato concluido"
```
