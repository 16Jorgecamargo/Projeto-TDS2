# Phase 3 — Card, Avatar, Skeleton, EmptyState, ImageUpload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever Card, Avatar, Skeleton, EmptyState e ImageUpload conforme `docs/superpowers/specs/2026-07-03-design-system/03-primitives-content.md`.

**Architecture:** Card ganha composição opcional (`Card.Header/Body/Footer`) sem quebrar o uso direto atual (root detecta filhos estruturados via `Children.toArray` e só aplica padding próprio quando não há nenhum). Avatar ganha fallback automático de erro de imagem e indicador de status. Skeleton e EmptyState ganham `variant`. ImageUpload ganha drag-and-drop reaproveitando a mesma função de upload.

**Tech Stack:** `class-variance-authority`, `framer-motion`, `lucide-react` (não usado diretamente nestes 5, ícones são passados pelo consumidor).

## Global Constraints

Ver `plan_index.md`. Depende de Phase 0 (`lib/motion.ts`) e Phase 1 (tokens `border`, `success`, `warning`, `danger`, `info`, `muted`). `ImageUpload` não pode ter sua lógica de upload/rede alterada (`uploadImage` de `features/uploads/api` é regra de negócio, fora de escopo) — só a interação de drag-and-drop é nova.

---

### Task 1: Reescrever `Card`

**Files:**
- Modify: `frontend/src/components/ui/Card.tsx`
- Modify: `frontend/src/components/ui/Card.test.tsx`

**Interfaces:**
- Consumes: `cn`, `duration`/`ease` de `lib/motion.ts`.
- Produces: `Card` (`forwardRef<HTMLDivElement, CardProps>` com `Card.Header`, `Card.Body`, `Card.Footer` anexados via `Object.assign`), `CardProps { variant?: 'flat'|'bordered'|'elevated'; interactive?: boolean; selected?: boolean }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Card.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renderiza o conteúdo com padding padrão quando usado sem composição', () => {
    render(<Card data-testid="card">Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveClass('p-6');
  });

  it('não duplica padding quando usa Card.Header/Body/Footer', () => {
    render(
      <Card data-testid="card">
        <Card.Header>Título</Card.Header>
        <Card.Body>Corpo</Card.Body>
      </Card>,
    );
    expect(screen.getByTestId('card')).not.toHaveClass('p-6');
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Corpo')).toBeInTheDocument();
  });

  it('aplica ring quando selected', () => {
    render(
      <Card selected data-testid="card">
        Selecionado
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('ring-2');
  });

  it('aplica cursor-pointer quando interactive', () => {
    render(
      <Card interactive data-testid="card">
        Clicável
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('cursor-pointer');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Card.test.tsx`
Expected: FAIL (`Card.Header` não existe, `selected`/`interactive` classes ainda não implementadas dessa forma).

- [ ] **Step 3: Reescrever `Card.tsx`**

```tsx
import { Children, forwardRef, isValidElement } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration, ease } from '../../lib/motion';
import { cn } from '../../lib/utils';

const cardVariants = cva('rounded-lg bg-bg', {
  variants: {
    variant: {
      flat: '',
      bordered: 'border border-border',
      elevated: 'shadow-xs',
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
    selected: {
      true: 'ring-2 ring-primary',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'flat',
    interactive: false,
    selected: false,
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
}

function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...rest} />;
}

function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...rest} />;
}

function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-border px-6 py-4', className)} {...rest} />;
}

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant, interactive, selected, className, children, ...rest },
  ref,
) {
  const hasStructuredChildren = Children.toArray(children).some(
    (child) =>
      isValidElement(child) &&
      (child.type === CardHeader || child.type === CardBody || child.type === CardFooter),
  );

  const classes = cn(
    cardVariants({ variant, interactive, selected }),
    !hasStructuredChildren && 'p-6',
    className,
  );

  if (interactive) {
    return (
      <motion.div
        ref={ref}
        className={classes}
        whileHover={{ y: -2 }}
        transition={{ duration: duration.fast, ease: ease.standard }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
});

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Card.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Rodar o typecheck (29 arquivos fora de `ui` usam `<Card>` hoje)**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros — a API pública (`children`, `interactive`, `className`, resto de `HTMLAttributes`) continua compatível com todo uso existente, `Card.Header`/`Body`/`Footer` são aditivos.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ui/Card.tsx src/components/ui/Card.test.tsx
git commit -m "refactor: reescreve Card com composicao Header/Body/Footer, selected e motion"
```

---

### Task 2: Reescrever `Avatar`

**Files:**
- Modify: `frontend/src/components/ui/Avatar.tsx`
- Modify: `frontend/src/components/ui/Avatar.test.tsx`

**Interfaces:**
- Consumes: `cn`, `duration` de `lib/motion.ts`.
- Produces: `Avatar` (`FC<AvatarProps>`), `AvatarProps { name: string; src?: string | null; size?: 'sm'|'md'|'lg'|'xl'; status?: 'online'|'offline'|'busy'; className?: string }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/Avatar.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renderiza iniciais quando não há src', () => {
    render(<Avatar name="Maria Silva" />);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('renderiza imagem quando há src', () => {
    render(<Avatar name="Maria Silva" src="https://example.com/foto.jpg" />);
    expect(screen.getByRole('img', { name: 'Maria Silva' })).toHaveAttribute(
      'src',
      'https://example.com/foto.jpg',
    );
  });

  it('cai para iniciais quando a imagem falha ao carregar', () => {
    render(<Avatar name="Maria Silva" src="https://example.com/quebrada.jpg" />);
    const img = screen.getByRole('img', { name: 'Maria Silva' });
    fireEvent.error(img);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('aplica o tamanho xl', () => {
    render(<Avatar name="Maria Silva" size="xl" />);
    expect(screen.getByText('MS')).toHaveClass('h-20');
  });

  it('renderiza o indicador de status', () => {
    render(<Avatar name="Maria Silva" status="online" />);
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('bg-success');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Avatar.test.tsx`
Expected: FAIL nos testes de fallback de erro, `size="xl"` e `status`.

- [ ] **Step 3: Reescrever `Avatar.tsx`**

```tsx
import { useState } from 'react';
import type { JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

const avatarVariants = cva('inline-flex items-center justify-center rounded-full font-semibold', {
  variants: {
    size: {
      sm: 'h-8 w-8 text-caption',
      md: 'h-10 w-10 text-body-sm',
      lg: 'h-14 w-14 text-h4',
      xl: 'h-20 w-20 text-h3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const statusClasses: Record<'online' | 'offline' | 'busy', string> = {
  online: 'bg-success',
  offline: 'bg-muted',
  busy: 'bg-warning',
};

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
export type AvatarStatus = 'online' | 'offline' | 'busy';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span className={cn('relative inline-flex', className)}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          onError={() => setImageFailed(true)}
          className={cn('rounded-full object-cover', avatarVariants({ size }))}
        />
      ) : (
        <motion.span
          role="img"
          aria-label={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration.fast }}
          className={cn('bg-primary text-bg', avatarVariants({ size }))}
        >
          {initials(name)}
        </motion.span>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-bg',
            statusClasses[status],
          )}
        />
      )}
    </span>
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Avatar.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Avatar.tsx src/components/ui/Avatar.test.tsx
git commit -m "refactor: adiciona fallback de erro, size xl e status ao Avatar"
```

---

### Task 3: Reescrever `Skeleton`

**Files:**
- Modify: `frontend/src/components/ui/Skeleton.tsx`
- Modify: `frontend/src/components/ui/Skeleton.test.tsx`

**Interfaces:**
- Consumes: `cn`.
- Produces: `Skeleton` (`FC<SkeletonProps>`), `SkeletonProps { variant?: 'rect'|'circle'|'text' }` (mais `HTMLAttributes<HTMLDivElement>` e `aria-label`).

- [ ] **Step 1: Escrever o teste novo (falhando)**

Adicionar ao final de `frontend/src/components/ui/Skeleton.test.tsx` (mantendo os testes existentes do arquivo):

```tsx
  it('aplica rounded-full quando variant=circle', () => {
    render(<Skeleton variant="circle" />);
    expect(screen.getByRole('status')).toHaveClass('rounded-full');
  });

  it('aplica rounded-md por padrão (variant=rect)', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveClass('rounded-md');
  });
```

(Se o arquivo usar `describe`/`it` só uma vez, adicionar estes dois `it` dentro do bloco `describe('Skeleton', ...)` já existente.)

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/Skeleton.test.tsx`
Expected: FAIL no teste de `variant="circle"` (prop não existe ainda).

- [ ] **Step 3: Reescrever `Skeleton.tsx`**

```tsx
import type { HTMLAttributes, JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const skeletonVariants = cva('animate-pulse bg-surface motion-reduce:animate-none', {
  variants: {
    variant: {
      rect: 'rounded-md',
      circle: 'rounded-full',
      text: 'rounded-sm h-4',
    },
  },
  defaultVariants: {
    variant: 'rect',
  },
});

export type SkeletonVariant = NonNullable<VariantProps<typeof skeletonVariants>['variant']>;

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  'aria-label'?: string;
}

export function Skeleton({
  variant,
  className,
  'aria-label': ariaLabel = 'Carregando',
  ...rest
}: SkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(skeletonVariants({ variant }), className)}
      {...rest}
    />
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/Skeleton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Skeleton.tsx src/components/ui/Skeleton.test.tsx
git commit -m "refactor: adiciona variant circle/text ao Skeleton via cva"
```

---

### Task 4: Reescrever `EmptyState`

**Files:**
- Modify: `frontend/src/components/ui/EmptyState.tsx`
- Modify: `frontend/src/components/ui/EmptyState.test.tsx`

**Interfaces:**
- Consumes: `cn`, `duration` de `lib/motion.ts`.
- Produces: `EmptyState` (`FC<EmptyStateProps>`), `EmptyStateProps { icon?: ReactNode; title: string; description?: string; action?: ReactNode; variant?: 'empty'|'error' }`.

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir todo o conteúdo de `frontend/src/components/ui/EmptyState.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(<EmptyState title="Nada aqui" description="Crie o primeiro item" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Crie o primeiro item')).toBeInTheDocument();
  });

  it('renderiza a ação quando fornecida', () => {
    render(<EmptyState title="Nada aqui" action={<button>Criar</button>} />);
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('renderiza o ícone quando fornecido', () => {
    render(<EmptyState title="Nada aqui" icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('usa role alert e fundo danger quando variant=error', () => {
    render(<EmptyState title="Erro ao carregar" variant="error" />);
    const region = screen.getByRole('alert');
    expect(region).toHaveClass('border-danger/20');
  });

  it('não usa role alert quando variant=empty (padrão)', () => {
    render(<EmptyState title="Nada aqui" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx`
Expected: FAIL nos testes de `icon` e `variant="error"`.

- [ ] **Step 3: Reescrever `EmptyState.tsx`**

```tsx
import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { duration } from '../../lib/motion';
import { cn } from '../../lib/utils';

const emptyStateVariants = cva(
  'flex flex-col items-center gap-2 rounded-lg px-6 py-8 text-center sm:py-12',
  {
    variants: {
      variant: {
        empty: 'bg-surface',
        error: 'bg-danger/5 border border-danger/20',
      },
    },
    defaultVariants: {
      variant: 'empty',
    },
  },
);

export type EmptyStateVariant = NonNullable<VariantProps<typeof emptyStateVariants>['variant']>;

export interface EmptyStateProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant,
  className,
  ...rest
}: EmptyStateProps): JSX.Element {
  return (
    <motion.div
      role={variant === 'error' ? 'alert' : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.base }}
      className={cn(emptyStateVariants({ variant }), className)}
      {...rest}
    >
      {icon && (
        <div aria-hidden="true" className="text-muted">
          {icon}
        </div>
      )}
      <p className="text-h4 text-ink">{title}</p>
      {description && <p className="text-body-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
```

- [ ] **Step 4: Rodar os testes e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/EmptyState.tsx src/components/ui/EmptyState.test.tsx
git commit -m "refactor: adiciona icon slot e variant error ao EmptyState"
```

---

### Task 5: Adicionar drag-and-drop ao `ImageUpload`

**Files:**
- Modify: `frontend/src/components/ui/ImageUpload.tsx`
- Modify: `frontend/src/components/ui/ImageUpload.test.tsx`

**Interfaces:**
- Consumes: `uploadImage`/`UploadResult` de `features/uploads/api` (sem alteração — regra de negócio), `useToast`, `Skeleton`.
- Produces: `ImageUpload` com a mesma assinatura pública (`onUploaded`, `label`, `className`) — mudança é só de interação interna (dropzone).

- [ ] **Step 1: Escrever o teste novo (falhando)**

Adicionar ao final do `describe('ImageUpload', ...)` em `frontend/src/components/ui/ImageUpload.test.tsx` (mantendo os testes existentes e os imports já presentes no arquivo, que já incluem `fireEvent`... se não incluir, adicionar `fireEvent` ao import de `@testing-library/react` no topo do arquivo):

```tsx
  it('processa arquivo solto via drag-and-drop', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/drop.jpg', filename: 'drop.jpg', size: 2048 });
    const onUploaded = vi.fn();
    render(<ImageUpload onUploaded={onUploaded} />);

    const label = screen.getByText('Enviar imagem').closest('label') as HTMLLabelElement;
    const file = new File(['conteudo'], 'drop.jpg', { type: 'image/jpeg' });

    fireEvent.drop(label, { dataTransfer: { files: [file] } });

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({ url: '/uploads/drop.jpg', filename: 'drop.jpg', size: 2048 }),
    );
  });
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd frontend && npx vitest run src/components/ui/ImageUpload.test.tsx`
Expected: FAIL no teste de drag-and-drop (handler `onDrop` ainda não existe).

- [ ] **Step 3: Reescrever `ImageUpload.tsx`**

```tsx
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type JSX } from 'react';
import { motion } from 'framer-motion';
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
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  async function processFile(file: File) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    const localPreview = URL.createObjectURL(file);
    previewRef.current = localPreview;
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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'inline-flex w-fit cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-body-sm font-semibold text-ink transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary',
        )}
      >
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
        <motion.img
          src={preview}
          alt="Pre-visualizacao da imagem enviada"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-24 w-24 rounded-md object-cover"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar todos os testes do arquivo e confirmar sucesso**

Run: `cd frontend && npx vitest run src/components/ui/ImageUpload.test.tsx`
Expected: PASS em todos os testes (existentes + o novo de drag-and-drop).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/ImageUpload.tsx src/components/ui/ImageUpload.test.tsx
git commit -m "feat: adiciona drag-and-drop ao ImageUpload"
```
