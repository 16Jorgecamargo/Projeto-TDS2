# Upload de Imagens — Frontend (Tasks 7-9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for the full goal, architecture, and Global Constraints — they apply to every task below. Depends on [plan_phase_backend.md](plan_phase_backend.md) (the `POST /api/uploads/images` endpoint). Work from `frontend/` unless noted.

---

### Task 7: `uploads` API client

**Files:**
- Create: `frontend/src/features/uploads/api.ts`
- Test: `frontend/src/features/uploads/api.test.ts`

**Interfaces:**
- Consumes: `http` from `frontend/src/lib/http.ts` (existing axios instance, `baseURL: '/api'`, already attaches the auth bearer token via interceptor).
- Produces: `UploadResult { url: string; filename: string; size: number }`, `uploadImage(file: File): Promise<UploadResult>`. Consumed by the `ImageUpload` component (Task 8).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { uploadImage } from './api';

vi.mock('../../lib/http', () => ({ http: { post: vi.fn() } }));

describe('uploadImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o arquivo como multipart/form-data e retorna o resultado', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: { url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 },
    } as never);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const result = await uploadImage(file);

    expect(result).toEqual({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    expect(http.post).toHaveBeenCalledWith('/uploads/images', expect.any(FormData));
  });

  it('propaga o erro quando a requisicao falha', async () => {
    vi.mocked(http.post).mockRejectedValue(new Error('network error'));

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    await expect(uploadImage(file)).rejects.toThrow('network error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/uploads/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Write the implementation**

```ts
import { http } from '../../lib/http';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<UploadResult>('/uploads/images', formData);
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/uploads/api.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/uploads/api.ts frontend/src/features/uploads/api.test.ts
git commit -m "feat(uploads): adiciona cliente de API para upload de imagens"
```

---

### Task 8: `ImageUpload` component

**Files:**
- Create: `frontend/src/components/ui/ImageUpload.tsx`
- Test: `frontend/src/components/ui/ImageUpload.test.tsx`

**Interfaces:**
- Consumes: `uploadImage`, `UploadResult` from `frontend/src/features/uploads/api.ts` (Task 7); `useToast`, `useToastStore` from `frontend/src/components/ui/Toast.tsx` (Fase 1, already exists); `Skeleton` from `frontend/src/components/ui/Skeleton.tsx` (Fase 1, already exists); `cn` from `frontend/src/lib/utils.ts`.
- Produces: `ImageUploadProps { onUploaded: (result: UploadResult) => void; label?: string; className?: string }`, `ImageUpload` component. This is the reusable component future phases (2, 3, 4) will import into `DemandForm`, `PortfolioManager`, `ProfileForm`, `ProgressUpdateForm` — none of those are touched in this plan.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from './ImageUpload';
import { uploadImage } from '../../features/uploads/api';
import { useToastStore } from './Toast';

vi.mock('../../features/uploads/api', () => ({ uploadImage: vi.fn() }));

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
  });

  it('renderiza o rotulo', () => {
    render(<ImageUpload onUploaded={vi.fn()} label="Foto da demanda" />);
    expect(screen.getByLabelText('Foto da demanda')).toBeInTheDocument();
  });

  it('envia o arquivo selecionado e chama onUploaded com o resultado', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={onUploaded} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 }),
    );
  });

  it('mostra skeleton enquanto o upload esta em andamento', async () => {
    let resolveUpload: (value: { url: string; filename: string; size: number }) => void = () => {};
    vi.mocked(uploadImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={vi.fn()} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    expect(screen.getByRole('status', { name: 'Enviando imagem' })).toBeInTheDocument();

    resolveUpload({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Enviando imagem' })).not.toBeInTheDocument(),
    );
  });

  it('mostra toast de erro quando o upload falha', async () => {
    vi.mocked(uploadImage).mockRejectedValue(new Error('falhou'));
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={vi.fn()} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1));
    expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/ImageUpload.test.tsx`
Expected: FAIL — `Cannot find module './ImageUpload'`

- [ ] **Step 3: Write the implementation**

```tsx
import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { uploadImage, type UploadResult } from '../../features/uploads/api';
import { useToast } from './Toast';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';

export interface ImageUploadProps {
  onUploaded: (result: UploadResult) => void;
  label?: string;
  className?: string;
}

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';

export function ImageUpload({ onUploaded, label = 'Enviar imagem', className }: ImageUploadProps): JSX.Element {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const result = await uploadImage(file);
      onUploaded(result);
    } catch {
      toast('Falha ao enviar imagem', 'error');
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-sm border border-surface px-3 py-2 text-sm font-semibold text-ink hover:border-primary">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          onChange={handleChange}
          className="sr-only"
          aria-label={label}
        />
      </label>
      {uploading && <Skeleton className="h-24 w-24" aria-label="Enviando imagem" />}
      {!uploading && preview && (
        <img
          src={preview}
          alt="Pre-visualizacao da imagem enviada"
          className="h-24 w-24 rounded-md object-cover"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/ImageUpload.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/ImageUpload.tsx frontend/src/components/ui/ImageUpload.test.tsx
git commit -m "feat(uploads): adiciona componente ImageUpload reutilizavel"
```

---

### Task 9: Verificacao final do frontend

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: exits 0

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exits 0

- [ ] **Step 3: Full frontend test suite**

Run: `npm run test`
Expected: PASS, every suite green (existing suites + `api.test.ts`, `ImageUpload.test.tsx`)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exits 0

---

This completes the Upload de Imagens feature. `ImageUpload` and `uploadImage()` are ready to be imported by Fase 2 (`DemandForm`), Fase 3 (`PortfolioManager`, `ProfileForm`), and Fase 4 (`ProgressUpdateForm`) — each wires it in as part of its own plan.
