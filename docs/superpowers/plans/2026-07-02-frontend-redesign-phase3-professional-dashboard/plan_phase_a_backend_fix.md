# Fase A — Correção de Schema (Portfolio Image URL) + Hooks de Mutation

Ver `plan_index.md` para Global Constraints e ordem de execução geral.

### Task 1: Corrigir validação de `imageUrl` no schema do portfólio + hooks de mutation de imagem

**Files:**
- Modify: `backend/src/modules/portfolio/portfolio.schemas.ts`
- Modify: `frontend/src/features/professional/queries.ts`
- Test: `backend/src/modules/portfolio/portfolio.routes.test.ts` (já existe — só rodar antes/depois)
- Test: `frontend/src/features/professional/professional.test.tsx` (adicionar casos novos)

**Interfaces:**
- Consumes: `professionalApi.addPortfolioImage(itemId: string, payload: { imageUrl: string; position: number }): Promise<PortfolioImage>` e `professionalApi.removePortfolioImage(id: string): Promise<void>` (já existem em `frontend/src/features/professional/api.ts:120-126`, sem mudança).
- Produces: `useAddPortfolioImage(professionalId: string | undefined, itemId: string)` e `useRemovePortfolioImage(professionalId: string | undefined)` — hooks novos que a Task 12 (PortfolioManager) vai consumir.

- [ ] **Step 1: Ler o schema atual do backend para confirmar as linhas exatas**

Rode: `sed -n '1,35p' backend/src/modules/portfolio/portfolio.schemas.ts`

Confirme que existem exatamente 2 ocorrências de `.url()` associadas a `imageUrl`:
1. Dentro de `portfolioItemResponseSchema.images[].imageUrl` (por volta da linha 17).
2. Dentro de `portfolioImageSchema.imageUrl` (por volta da linha 26).

- [ ] **Step 2: Rodar os testes de integração do portfólio ANTES da mudança (para ter uma baseline)**

Rode: `cd backend && npx vitest run src/modules/portfolio/portfolio.routes.test.ts`
Esperado: todos os testes passam (baseline verde).

- [ ] **Step 3: Corrigir o schema**

Em `backend/src/modules/portfolio/portfolio.schemas.ts`, troque as duas ocorrências de:

```ts
imageUrl: z.string().url().describe('URL da imagem').openapi({ example: 'https://cdn.app/img.jpg' }),
```

por:

```ts
imageUrl: z.string().min(1).describe('URL da imagem (absoluta ou caminho relativo retornado por /uploads/images)').openapi({ example: '/uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
```

Isso afeta tanto `portfolioItemResponseSchema` (dentro do array `images`) quanto `portfolioImageSchema` (usado no body de `POST /portfolio/me/items/:id/images`). O arquivo final deve ficar assim:

```ts
import { z } from 'zod';
import 'zod-openapi/extend';

export const portfolioItemSchema = z.object({
  categoryId: z.string().uuid().nullable().describe('Categoria relacionada').openapi({ example: null }),
  title: z.string().min(2).max(255).describe('Titulo do trabalho').openapi({ example: 'Reforma de banheiro' }),
  description: z.string().max(2000).nullable().describe('Descricao').openapi({ example: 'Troca completa de revestimento' }),
  completedAt: z.string().date().nullable().describe('Concluido em (YYYY-MM-DD)').openapi({ example: '2026-05-01' }),
});

export const updatePortfolioItemSchema = portfolioItemSchema.partial();

export const portfolioItemResponseSchema = portfolioItemSchema.extend({
  id: z.string().uuid().describe('ID do item').openapi({ example: '8b9c1111-1111-1111-1111-111111111111' }),
  images: z
    .array(
      z.object({
        id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
        imageUrl: z.string().min(1).describe('URL da imagem (absoluta ou caminho relativo retornado por /uploads/images)').openapi({ example: '/uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
        position: z.number().int().describe('Posicao').openapi({ example: 0 }),
      }),
    )
    .describe('Imagens do item')
    .openapi({ example: [] }),
});

export const portfolioImageSchema = z.object({
  imageUrl: z.string().min(1).describe('URL da imagem (absoluta ou caminho relativo retornado por /uploads/images)').openapi({ example: '/uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
  position: z.number().int().min(0).describe('Posicao de exibicao').openapi({ example: 0 }),
});

export const portfolioImageResponseSchema = portfolioImageSchema.extend({
  id: z.string().uuid().describe('ID da imagem').openapi({ example: '9c0d1111-1111-1111-1111-111111111111' }),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
export type PortfolioItemResponse = z.infer<typeof portfolioItemResponseSchema>;
export type PortfolioImageInput = z.infer<typeof portfolioImageSchema>;
export type PortfolioImageResponse = z.infer<typeof portfolioImageResponseSchema>;
```

- [ ] **Step 4: Rodar os testes de integração do portfólio DEPOIS da mudança**

Rode: `cd backend && npx vitest run src/modules/portfolio/portfolio.routes.test.ts`
Esperado: todos os testes continuam passando (a mudança só relaxa uma validação, não altera nenhum campo/tipo/regra).

- [ ] **Step 5: Escrever o teste falho para os hooks novos do frontend**

Em `frontend/src/features/professional/professional.test.tsx`, adicione (mantendo o describe/teste de `ProfileForm` já existente no arquivo, só acrescentando):

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddPortfolioImage, useRemovePortfolioImage } from './queries';

vi.mock('./api', () => ({
  professionalApi: {
    getMyProfile: vi.fn(),
    upsertProfile: vi.fn(),
    addPortfolioImage: vi.fn(),
    removePortfolioImage: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAddPortfolioImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama professionalApi.addPortfolioImage com o itemId fixo do hook', async () => {
    vi.mocked(professionalApi.addPortfolioImage).mockResolvedValue({
      id: 'img1',
      imageUrl: '/uploads/img1.jpg',
      position: 0,
    });

    const { result } = renderHook(() => useAddPortfolioImage('prof1', 'item1'), { wrapper });
    result.current.mutate({ imageUrl: '/uploads/img1.jpg', position: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(professionalApi.addPortfolioImage).toHaveBeenCalledWith('item1', {
      imageUrl: '/uploads/img1.jpg',
      position: 0,
    });
  });
});

describe('useRemovePortfolioImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama professionalApi.removePortfolioImage com o id da imagem', async () => {
    vi.mocked(professionalApi.removePortfolioImage).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemovePortfolioImage('prof1'), { wrapper });
    result.current.mutate('img1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(professionalApi.removePortfolioImage).toHaveBeenCalledWith('img1');
  });
});
```

No topo do arquivo, garanta que `professionalApi` está importado (já está, na linha 5 do arquivo original: `import { professionalApi } from './api';`) e adicione `import type { ReactNode } from 'react';` se `React.ReactNode` não resolver sem ele (troque `children: React.ReactNode` por `children: ReactNode` usando esse import, para bater com o padrão do resto do projeto que não importa `React` como namespace).

- [ ] **Step 6: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/professional.test.tsx`
Esperado: FAIL com `useAddPortfolioImage`/`useRemovePortfolioImage` não exportados de `./queries`.

- [ ] **Step 7: Implementar os hooks**

Em `frontend/src/features/professional/queries.ts`, adicione ao final do arquivo (depois de `useRemoveServiceArea`):

```ts
export function useAddPortfolioImage(professionalId: string | undefined, itemId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { imageUrl: string; position: number }) =>
      professionalApi.addPortfolioImage(itemId, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}

export function useRemovePortfolioImage(professionalId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => professionalApi.removePortfolioImage(imageId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['professional', 'portfolio', professionalId] }),
  });
}
```

- [ ] **Step 8: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/professional.test.tsx`
Esperado: PASS, todos os testes (o `ProfileForm` existente + os 2 novos).

- [ ] **Step 9: Rodar typecheck e lint do frontend**

Rode: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/portfolio/portfolio.schemas.ts frontend/src/features/professional/queries.ts frontend/src/features/professional/professional.test.tsx
git commit -m "fix(portfolio): aceita URL relativa de imagem e adiciona hooks de upload"
```
