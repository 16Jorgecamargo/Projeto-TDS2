# Fase 5 — Galeria de fotos com preview e deletar (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Depende da Fase 4 (`DemandForm.tsx` já reescrito). Ver `plan_index.md`.

**Goal:** Trocar a lista simples de fotos já enviadas por uma grade com hover: ícone de olho centralizado (abre preview em `Modal`) e ícone de lixeira (remove do estado local, sem diálogo de confirmação).

**Architecture:** Componente novo `PhotoGallery` recebe `images: string[]` e `onRemove: (url: string) => void`; usa o `Modal` já existente (`components/ui/Modal.tsx`) pro preview. `DemandForm.tsx` troca o `<ul>` inline por `<PhotoGallery>`.

**Tech Stack:** React, lucide-react (`Eye`, `Trash2`), Vitest, Testing Library.

## Global Constraints

Ver `plan_index.md`.

---

### Task 5.1: Componente `PhotoGallery`

**Files:**
- Create: `frontend/src/features/demands/components/PhotoGallery.tsx`
- Test: `frontend/src/features/demands/components/PhotoGallery.test.tsx`

**Interfaces:**
- Consumes: `Modal` de `../../../components/ui/Modal` (props `open, onClose, title, size, children` — já existentes).
- Produces: `export interface PhotoGalleryProps { images: string[]; onRemove: (url: string) => void }`, `export function PhotoGallery(props: PhotoGalleryProps): JSX.Element | null` — consumido pela Task 5.2 (`DemandForm`).

- [ ] **Step 1: Escrever o teste (falha primeiro)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGallery } from './PhotoGallery';

describe('PhotoGallery', () => {
  it('nao renderiza nada quando nao ha fotos', () => {
    const { container } = render(<PhotoGallery images={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('abre o preview ao clicar no icone de olho', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery images={['/uploads/foto-1.jpg']} onRemove={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByAltText('Pré-visualização da foto')[0]).toHaveAttribute('src', '/uploads/foto-1.jpg');
  });

  it('remove a foto ao clicar na lixeira, sem dialogo de confirmacao', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<PhotoGallery images={['/uploads/foto-1.jpg']} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(onRemove).toHaveBeenCalledWith('/uploads/foto-1.jpg');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd frontend
npx vitest run src/features/demands/components/PhotoGallery.test.tsx
```

Expected: FAIL — módulo `./PhotoGallery` não existe.

- [ ] **Step 3: Implementar `PhotoGallery.tsx`**

```tsx
import { useState, type JSX } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export interface PhotoGalleryProps {
  images: string[];
  onRemove: (url: string) => void;
}

export function PhotoGallery({ images, onRemove }: PhotoGalleryProps): JSX.Element | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {images.map((url) => (
          <li key={url} className="group relative h-16 w-16">
            <img src={url} alt="Foto da demanda" className="h-16 w-16 rounded-md object-cover" />
            <div className="absolute inset-0 hidden items-center justify-center gap-1 rounded-md bg-black/50 group-hover:flex">
              <button
                type="button"
                onClick={() => setPreviewUrl(url)}
                aria-label="Ver foto"
                className="rounded-full bg-white/90 p-1 text-ink hover:bg-white"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(url)}
                aria-label="Remover foto"
                className="rounded-full bg-white/90 p-1 text-danger hover:bg-white"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Modal
        open={previewUrl !== null}
        onClose={() => setPreviewUrl(null)}
        title="Pré-visualização da foto"
        size="md"
      >
        {previewUrl && (
          <img src={previewUrl} alt="Pré-visualização da foto" className="w-full rounded-md object-contain" />
        )}
      </Modal>
    </>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd frontend
npx vitest run src/features/demands/components/PhotoGallery.test.tsx
```

Expected: PASS nos 3 testes.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/features/demands/components/PhotoGallery.tsx src/features/demands/components/PhotoGallery.test.tsx
git commit -m "feat: adiciona PhotoGallery com preview em modal e remocao sem confirmacao"
```

---

### Task 5.2: Ligar `PhotoGallery` no `DemandForm`

**Files:**
- Modify: `frontend/src/features/demands/components/DemandForm.tsx`
- Modify: `frontend/src/features/demands/components/DemandForm.test.tsx`

**Interfaces:**
- Consumes: `PhotoGallery` (Task 5.1).

- [ ] **Step 1: Trocar o `<ul>` inline de fotos por `<PhotoGallery>`**

Em `frontend/src/features/demands/components/DemandForm.tsx`:

Adicionar o import:

```ts
import { PhotoGallery } from './PhotoGallery';
```

Substituir o bloco:

```tsx
{images.length > 0 && (
  <ul className="flex flex-wrap gap-2">
    {images.map((url) => (
      <li key={url}>
        <img src={url} alt="Foto da demanda" className="h-16 w-16 rounded-md object-cover" />
      </li>
    ))}
  </ul>
)}
```

por:

```tsx
<PhotoGallery images={images} onRemove={(url) => setImages((prev) => prev.filter((item) => item !== url))} />
```

- [ ] **Step 2: Adicionar teste cobrindo a remoção via `DemandForm`**

Em `frontend/src/features/demands/components/DemandForm.test.tsx`, adicionar mais um `it` no `describe('DemandForm', ...)`:

```tsx
it('remove uma foto enviada ao clicar na lixeira da galeria', async () => {
  const user = userEvent.setup();
  renderWithProviders(<DemandForm onSubmit={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Simular upload' }));
  expect(screen.getByAltText('Foto da demanda')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Remover foto' }));
  expect(screen.queryByAltText('Foto da demanda')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Rodar os testes de `demands` e confirmar que passam**

```bash
cd frontend
npx vitest run src/features/demands
```

Expected: PASS em tudo.

- [ ] **Step 4: Rodar a suíte inteira do frontend**

```bash
cd frontend
npm test
```

Expected: PASS.

- [ ] **Step 5: Testar manualmente no browser (fluxo golden path)**

```bash
cd frontend
npm run dev
```

Abrir `/demands/publish` (ou o caminho equivalente da rota), preencher categoria (digitar pra filtrar), título, descrição, endereço completo, UF via combobox, CEP com máscara, subir 2 fotos, passar o mouse sobre uma foto (deve aparecer olho + lixeira centralizados), clicar no olho (abre modal com a imagem grande), fechar, clicar na lixeira (foto some da lista imediatamente, sem prompt), clicar em "Publicar demanda" (botão roxo) e confirmar que a chamada de rede em `/api/demands` sai sem `budgetMin`/`budgetMax`/`addressId` e com os campos de endereço.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/features/demands/components/DemandForm.tsx src/features/demands/components/DemandForm.test.tsx
git commit -m "feat: DemandForm usa PhotoGallery com preview e remocao de fotos"
```
