## Fase A — Chat (Tasks 1-2)

### Task 1: Restilizar `ChatWindow`

**Files:**
- Modify: `frontend/src/features/chat/components/ChatWindow.tsx`
- Test: `frontend/src/features/chat/components/ChatWindow.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useMessages(roomId)`, `useChatSocket(roomId)` de `frontend/src/features/chat/queries.ts` (já existentes, assinaturas inalteradas). `useAuthStore` de `frontend/src/stores/auth.ts` (já existente, `useAuthStore.getState().setAuth(user, token)` / `.clear()` pra testes, mesmo padrão usado em `ContractListPage.test.tsx`). `Card`, `Skeleton`, `EmptyState`, `Button` de `frontend/src/components/ui/`. `cn` de `frontend/src/lib/utils.ts`.
- Produces: `ChatWindow` mantém a mesma prop `{ roomId: string }` — nenhuma mudança de interface, só de estilo interno.

- [ ] **Step 1: Escrever os testes falhos**

Crie `frontend/src/features/chat/components/ChatWindow.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWindow } from './ChatWindow';
import { useMessages, useChatSocket } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useMessages: vi.fn(), useChatSocket: vi.fn() }));

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
  });

  it('mostra skeleton de carregamento', () => {
    vi.mocked(useMessages).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send: vi.fn() });

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByLabelText('Carregando conversa')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha mensagens', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
    } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send: vi.fn() });

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument();
  });

  it('renderiza mensagens e envia nova mensagem pelo socket', async () => {
    const send = vi.fn();
    vi.mocked(useMessages).mockReturnValue({
      data: {
        items: [
          { id: 'm1', roomId: 'r1', senderId: 'u1', content: 'Oi', createdAt: '2026-07-01T12:00:00Z' },
          { id: 'm2', roomId: 'r1', senderId: 'u2', content: 'Ola', createdAt: '2026-07-01T12:01:00Z' },
        ],
        page: 1,
        limit: 20,
        total: 2,
      },
      isLoading: false,
    } as never);
    vi.mocked(useChatSocket).mockReturnValue({ send });
    const user = userEvent.setup();

    render(<ChatWindow roomId="r1" />);

    expect(screen.getByText('Oi')).toBeInTheDocument();
    expect(screen.getByText('Ola')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Mensagem'), 'Nova mensagem');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(send).toHaveBeenCalledWith('Nova mensagem');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/chat/components/ChatWindow.test.tsx`
Esperado: FAIL — o teste de skeleton falha porque `aria-label="Carregando conversa"` ainda não existe (a implementação atual usa `<p>Carregando conversa...</p>` sem esse label).

- [ ] **Step 3: Restilizar `ChatWindow.tsx`**

Substitua o conteúdo de `frontend/src/features/chat/components/ChatWindow.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useMessages, useChatSocket } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps): JSX.Element {
  const { data, isLoading } = useMessages(roomId);
  const { send } = useChatSocket(roomId);
  const [draft, setDraft] = useState('');
  const currentUserId = useAuthStore((state) => state.user?.id);

  if (isLoading || !data) {
    return <Skeleton className="h-full w-full" aria-label="Carregando conversa" />;
  }

  return (
    <Card className="flex h-full flex-col p-0">
      <ul className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {data.items.length === 0 ? (
          <li>
            <EmptyState title="Nenhuma mensagem ainda" />
          </li>
        ) : (
          data.items.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <li key={message.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-xs rounded-lg px-4 py-2 text-sm',
                    isOwn ? 'bg-accent text-bg' : 'bg-surface text-ink',
                  )}
                >
                  <p>{message.content}</p>
                  <p className={cn('mt-1 text-xs', isOwn ? 'text-bg/70' : 'text-muted')}>
                    {new Date(message.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <form
        className="flex gap-2 border-t border-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) {
            send(draft.trim());
            setDraft('');
          }
        }}
      >
        <input
          className="flex-1 rounded-sm border border-surface px-3 py-2 text-sm text-ink"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Enviar
        </Button>
      </form>
    </Card>
  );
}

export default ChatWindow;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/chat/components/ChatWindow.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/chat/components/ChatWindow.tsx frontend/src/features/chat/components/ChatWindow.test.tsx
git commit -m "style(chat): restiliza ChatWindow com tokens da fase 1"
```

---

### Task 2: Restilizar `ChatIndexPage` e `ChatPage`

**Files:**
- Modify: `frontend/src/features/chat/pages/ChatIndexPage.tsx`
- Modify: `frontend/src/features/chat/pages/ChatPage.tsx`
- Modify (se necessário): `frontend/src/features/chat/pages/ChatIndexPage.test.tsx` (manter passando sem quebrar)
- Test: `frontend/src/features/chat/pages/ChatPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `ChatWindow` (Task 1, prop `{ roomId: string }` inalterada). `EmptyState` de `components/ui/`.
- Produces: nenhuma interface nova — só estilo de página.

- [ ] **Step 1: Confirmar que o teste existente de `ChatIndexPage` continua válido**

`frontend/src/features/chat/pages/ChatIndexPage.test.tsx` já existe e testa:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatIndexPage } from './ChatIndexPage';

describe('ChatIndexPage', () => {
  it('mostra o estado vazio explicando como abrir uma conversa', () => {
    render(<ChatIndexPage />);
    expect(screen.getByText('Nenhuma conversa selecionada')).toBeInTheDocument();
  });
});
```
Esse teste não deve ser alterado — a restilização de `ChatIndexPage` só pode mudar classes de espaçamento/layout ao redor do `EmptyState`, nunca o texto do título.

- [ ] **Step 2: Escrever o teste falho de `ChatPage`**

Crie `frontend/src/features/chat/pages/ChatPage.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './ChatPage';

vi.mock('../components/ChatWindow', () => ({
  ChatWindow: ({ roomId }: { roomId: string }) => <div>chat-window-{roomId}</div>,
}));

describe('ChatPage', () => {
  it('mostra o titulo e a janela de chat para a sala da rota', () => {
    render(
      <MemoryRouter initialEntries={['/chat/r1']}>
        <Routes>
          <Route path="/chat/:roomId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Conversa' })).toBeInTheDocument();
    expect(screen.getByText('chat-window-r1')).toBeInTheDocument();
  });

  it('mostra mensagem para selecionar conversa quando nao ha roomId', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Selecione uma conversa.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar teste para confirmar a baseline**

Rode: `cd frontend && npx vitest run src/features/chat/pages/ChatPage.test.tsx`
Esperado: PASS (2/2) já com a implementação atual — esta task só muda classes/estilo, não comportamento, então o teste serve de rede de segurança (garantir que a restilização não quebra o comportamento existente), não de ciclo RED/GREEN de comportamento novo. Confirme que passa antes de mexer no arquivo.

- [ ] **Step 4: Restilizar `ChatIndexPage.tsx`**

Substitua o conteúdo de `frontend/src/features/chat/pages/ChatIndexPage.tsx`:
```tsx
import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';

export function ChatIndexPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}

export default ChatIndexPage;
```

- [ ] **Step 5: Restilizar `ChatPage.tsx`**

Substitua o conteúdo de `frontend/src/features/chat/pages/ChatPage.tsx`:
```tsx
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { ChatWindow } from '../components/ChatWindow';

export function ChatPage(): JSX.Element {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <p className="p-6 text-muted">Selecione uma conversa.</p>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-ink">Conversa</h1>
      <div className="flex-1">
        <ChatWindow roomId={roomId} />
      </div>
    </div>
  );
}

export default ChatPage;
```

- [ ] **Step 6: Rodar os testes para confirmar que continuam passando**

Rode: `cd frontend && npx vitest run src/features/chat/pages/ChatIndexPage.test.tsx src/features/chat/pages/ChatPage.test.tsx`
Esperado: PASS (1/1 e 2/2), idêntico ao resultado do Step 3/1 — confirma que a restilização não alterou nenhum comportamento coberto pelos testes.

- [ ] **Step 7: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/chat/pages/ChatIndexPage.tsx frontend/src/features/chat/pages/ChatPage.tsx frontend/src/features/chat/pages/ChatPage.test.tsx
git commit -m "style(chat): restiliza ChatIndexPage e ChatPage com tokens da fase 1"
```

---
