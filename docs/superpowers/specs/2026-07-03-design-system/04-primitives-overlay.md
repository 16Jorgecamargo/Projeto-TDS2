# 04 — Modal, Drawer, Tooltip, Toast

## Modal

### Análise atual (`components/ui/Modal.tsx`)

- Responsabilidade: diálogo modal centralizado, bloqueante.
- Onde é usado: confirmações, formulários curtos (`PaymentDialog`, `WithdrawDialog` citados na auditoria).
- Dependências: `createPortal`, `cn`.
- API atual: `open`, `onClose`, `title`, `children`, `className`.
- Pontos fortes: já usa portal, já fecha com `Escape`, já tem `role="dialog"`/`aria-modal`.
- Problemas: **sem focus trap** (auditoria confirma: "Modal/Drawer compartilhados não implementam gestão de foco") — Tab escapa pro conteúdo atrás do modal; sem foco automático no primeiro elemento ao abrir nem devolução de foco ao fechar; sem clique no backdrop pra fechar (só `Escape`); sem animação de entrada/saída (aparece/some abruptamente); título é sempre string simples (sem slot pra ações no header, ex. botão extra ao lado do "×").

### Objetivos do redesign

- Focus trap completo (entrada, ciclo, devolução ao fechar) — é o problema de acessibilidade mais crítico identificado na auditoria.
- Fechar ao clicar no backdrop (comportamento padrão esperado, hoje ausente).
- Animação de entrada/saída via `AnimatePresence`.
- Slot de header mais flexível sem perder a simplicidade do uso comum (`title` como string continua funcionando).

### Nova API pública

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean; // default true
  className?: string;
}
```

### Variants

Não há variant de tom — Modal é neutro por natureza (o conteúdo interno decide tom, ex. um Modal de confirmação de exclusão usa `Button variant="danger"` dentro).

### Sizes

| Size | Classes |
|---|---|
| `sm` | `max-w-sm` |
| `md` | `max-w-lg` (default, igual ao atual) |
| `lg` | `max-w-2xl` |

### Estados

Fechado (não renderiza — igual atual, `open=false` retorna `null` antes do `AnimatePresence` decidir a saída), abrindo (animação de entrada), aberto, fechando (animação de saída antes de desmontar).

### Anatomia

```
<AnimatePresence>
  {open && (
    <portal>
      <motion.div (backdrop) onClick={closeOnBackdropClick ? onClose : undefined}>
        <motion.div role="dialog" aria-modal aria-labelledby aria-describedby>
          <header>
            <h2 id="...">{title}</h2>
            <button aria-label="Fechar">×</button>
          </header>
          {description && <p id="...">{description}</p>}
          {children}
        </motion.div>
      </motion.div>
    </portal>
  )}
</AnimatePresence>
```

### Tokens utilizados

Cor: `bg`, `ink`, `muted`, `overlay` (backdrop, substitui `bg-ink/40` hardcoded). Radius: `lg`, `xl`. Shadow: `xl` (era `modal`). Z-index: `modal-backdrop`, `modal` (mantidos).

### Comportamento

Focus trap: ao abrir, foco vai pro primeiro elemento focável dentro do dialog (ou pro próprio dialog via `tabIndex={-1}` se não houver nenhum); `Tab`/`Shift+Tab` ciclam só dentro do dialog; ao fechar, foco retorna ao elemento que tinha foco antes de abrir (guardado em `ref` no `useEffect` de abertura). `Escape` continua fechando (mantido). Clique no backdrop fecha por default, desativável via `closeOnBackdropClick={false}` (para modais de confirmação onde fechar sem decisão é indesejado).

### Acessibilidade

`role="dialog"` + `aria-modal="true"` mantidos. `aria-labelledby` aponta pro `id` do `<h2>` (substitui `aria-label={title}` — mais correto porque o título já está visualmente presente, não precisa duplicar como string solta). `aria-describedby` opcional quando `description` existe. Focus trap implementado com hook próprio (`useFocusTrap`, `lib/hooks/useFocusTrap.ts`) ou lib leve — decisão de implementação, não de spec.

### Motion

`AnimatePresence` com backdrop (`fadeVariants`, `duration.base`) e conteúdo (`scaleVariants`: `initial={{ opacity: 0, scale: 0.96 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.96 }}`, `transition: spring.snappy`).

### Responsividade

Em telas `< sm`, modal ocupa `w-full` com margem (`m-4`) em vez de `max-w-*` fixo — já implícito no `p-4` do backdrop atual, mantido.

### Exemplos de uso

```tsx
<Modal open={isOpen} onClose={close} title="Confirmar exclusão" size="sm" closeOnBackdropClick={false}>
  <p>Essa ação não pode ser desfeita.</p>
  <div className="mt-4 flex justify-end gap-2">
    <Button variant="ghost" onClick={close}>Cancelar</Button>
    <Button variant="danger" onClick={confirm}>Excluir</Button>
  </div>
</Modal>
```

### Casos de uso

`PaymentDialog`, `WithdrawDialog`, confirmações de exclusão/ação destrutiva, formulários curtos.

### Checklist de implementação

- [ ] Implementar focus trap + devolução de foco
- [ ] Adicionar fechar por clique no backdrop (com opt-out)
- [ ] Migrar `aria-label` pra `aria-labelledby`/`aria-describedby`
- [ ] Adicionar `size`
- [ ] Envolver com `AnimatePresence` + `scaleVariants`
- [ ] Trocar `bg-ink/40` por token `overlay`
- [ ] Atualizar `Modal.test.tsx` cobrindo focus trap, backdrop click, `size`

---

## Drawer

### Análise atual (`components/ui/Drawer.tsx`)

- Responsabilidade: painel lateral deslizante.
- Onde é usado: navegação mobile, filtros, painéis de detalhe.
- Dependências: `createPortal`, `cn`.
- API atual: `open`, `onClose`, `title`, `side` (`left`/`right`), `children` (sem `className`, inconsistente com Modal que tem).
- Pontos fortes: já fecha com `Escape`, já fecha ao clicar no backdrop (`onClick={onClose}` no overlay — diferente do Modal, que não tinha isso).
- Problemas: mesma falta de focus trap do Modal; sem animação de slide (aparece abrupto, apesar do nome "Drawer" sugerir deslizar); `side` não cobre `bottom` (usado em mobile bottom-sheet, hoje resolvido fora do componente ou não existe); largura fixa `w-72` (não configurável).

### Objetivos do redesign

- Focus trap (mesmo padrão do Modal, reaproveitando o mesmo hook/lib).
- Animação de slide real (hoje o nome promete e o componente não entrega).
- Adicionar `side="bottom"` pra bottom-sheet mobile.
- Adicionar `className` (paridade com Modal) e `size` pra largura configurável.

### Nova API pública

```ts
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}
```

### Variants

Não há variant de tom (mesma razão do Modal — neutro, conteúdo decide).

### Sizes

Para `side="left"/"right"`: `sm` = `w-64`, `md` = `w-72` (default, igual atual), `lg` = `w-96`. Para `side="bottom"`: `sm` = `max-h-[40vh]`, `md` = `max-h-[60vh]`, `lg` = `max-h-[85vh]`.

### Estados

Mesmos do Modal (fechado/abrindo/aberto/fechando).

### Anatomia

Igual ao Modal, com `slideVariants(side)` no lugar de `scaleVariants`, e classe de posicionamento condicional por `side` (`left-0`/`right-0 h-full` ou `bottom-0 w-full` pra `bottom`).

### Tokens utilizados

Iguais ao Modal: `overlay`, `bg`, `ink`, `muted`, shadow `xl`, z-index `modal-backdrop`/`modal`.

### Comportamento

Igual ao Modal (focus trap, `Escape`, backdrop click — já existia aqui, mantido). `side="bottom"` soma handle visual de arraste (barra horizontal no topo, só decorativo, sem swipe-to-close nesta spec — swipe é fora de escopo, feature futura).

### Acessibilidade

Mesmo padrão do Modal (`aria-labelledby`, `aria-describedby`, focus trap).

### Motion

`slideVariants` parametrizado: `left` desliza de `x: -100%` pra `0`, `right` de `x: 100%` pra `0`, `bottom` de `y: 100%` pra `0`. `transition: spring.gentle` (drawer é maior que modal, spring mais suave evita "chacoalhar").

### Responsividade

`side="bottom"` é o padrão recomendado pra mobile (documentar como convenção, não forçar via media query dentro do componente — decisão de uso fica com a feature).

### Exemplos de uso

```tsx
<Drawer open={isOpen} onClose={close} title="Filtros" side="right" size="sm">
  <FilterForm />
</Drawer>

<Drawer open={isOpen} onClose={close} title="Detalhes" side="bottom">
  <DetailContent />
</Drawer>
```

### Casos de uso

Menu de navegação mobile, painel de filtros de busca, bottom-sheet de detalhe em mobile.

### Checklist de implementação

- [ ] Implementar focus trap (reaproveitar hook do Modal)
- [ ] Adicionar `slideVariants` com `AnimatePresence`
- [ ] Adicionar `side="bottom"`
- [ ] Adicionar `size` e `className`
- [ ] Atualizar `Drawer.test.tsx` cobrindo `side="bottom"`, focus trap, animação

---

## Tooltip

### Análise atual (`components/ui/Tooltip.tsx`)

- Responsabilidade: rótulo contextual sob hover/foco.
- Onde é usado: ícones sem texto, ações compactas.
- Dependências: `cn`, `useId`.
- API atual: `label`, `children`, `className`.
- Pontos fortes: já usa `useId` + `aria-describedby` corretamente, já cobre hover e foco (teclado incluso).
- Problemas: posição fixa (`bottom-full`, sempre acima) — não tem `side`/`align`, quebra perto da borda da tela; sem delay de abertura (aparece instantâneo no hover, pode ser ruído visual ao passar o mouse rápido por vários itens); sem animação.

### Objetivos do redesign

- Adicionar `side` (`top`/`bottom`/`left`/`right`) mantendo `top`... na verdade hoje é sempre acima (`bottom-full` = tooltip fica acima do trigger) — manter esse como default `side="top"`.
- Delay configurável de abertura (default pequeno, ex. 200ms) sem exigir prop na maioria dos usos.

### Nova API pública

```ts
interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number; // default 200
  className?: string;
}
```

### Variants

Sem variant de cor — tooltip é sempre `bg-ink text-bg` (mantido, alto contraste proposital).

### Sizes

Não aplicável — largura é `whitespace-nowrap` (mantido), cresce com o texto.

### Estados

Escondido, aguardando delay (novo), visível.

### Anatomia

Igual ao atual (`span` wrapper relative + `span` do tooltip), só com posicionamento condicional por `side` em vez de fixo `bottom-full`.

### Tokens utilizados

Cor: `ink`, `bg`. Radius: `sm`. Z-index: `tooltip` (mantido). Espaçamento: `2` (mb-2/adaptado por side).

### Comportamento

`onMouseEnter`/`onFocus` inicia timer de `delayMs`; `onMouseLeave`/`onBlur` cancela o timer e esconde imediatamente (sem delay pra fechar — só pra abrir, é o padrão esperado).

### Acessibilidade

Mantido: `role="tooltip"`, `aria-describedby` (via `useId`), funciona com teclado (foco já cobre isso hoje). Sem alteração de comportamento de acessibilidade, só visual.

### Motion

`AnimatePresence` com `fadeVariants` + leve translate de 4px na direção oposta ao `side` (efeito de "entrar deslizando de perto"), `duration: duration.fast`.

### Responsividade

N/A — tooltip não é usado em telas pequenas tipicamente (padrão é ocultar tooltips em touch, mas isso é decisão de feature, não do componente).

### Exemplos de uso

```tsx
<Tooltip label="Editar"><button><Pencil size={16} /></button></Tooltip>
<Tooltip label="Remover" side="left" delayMs={400}><button><Trash size={16} /></button></Tooltip>
```

### Casos de uso

Ícones de ação em toolbar, botões icon-only do Button (`size="icon"`).

### Checklist de implementação

- [ ] Adicionar `side` com posicionamento condicional
- [ ] Adicionar `delayMs` com timer
- [ ] Envolver com `AnimatePresence` + fade/translate
- [ ] Atualizar `Tooltip.test.tsx` cobrindo `side` e delay

---

## Toast

### Análise atual (`components/ui/Toast.tsx`)

- Responsabilidade: notificação transitória, empilhável, com store global.
- Onde é usado: `ImageUpload` (erro), poucas outras features (auditoria aponta que a maioria das mutations não usa toast de sucesso/erro — gap de UX, não do componente).
- Dependências: `zustand` (store próprio `useToastStore`), `createPortal`.
- API atual: `useToast()` retorna `{ toast(message, tone?) }`; `tone` é `'default' | 'error'`; auto-dismiss fixo em 5000ms; `ToastProvider` monta o portal.
- Pontos fortes: store já desacoplado da UI (bom padrão), auto-dismiss já implementado, dedupe de container via `id="toast-viewport"`.
- Problemas: só 2 tons (`default`/`error`) — falta `success`/`warning`/`info`, obrigando features a usar `error` pra tudo que não é o "default" cinza; sem ação inline (ex. toast com botão "Desfazer"); sem pausar auto-dismiss no hover (padrão esperado — hoje o toast some enquanto o mouse ainda está em cima lendo); sem animação de entrada/saída (só aparece/some, apesar de já estar empilhado com `gap-2`).

### Objetivos do redesign

- Cobrir semântica completa de tom.
- Pausar timer no hover.
- Permitir ação inline opcional (ex. desfazer).
- Animação de entrada/saída via `AnimatePresence` (a lista já é dinâmica, ganho imediato).

### Nova API pública

```ts
interface ToastAction {
  label: string;
  onClick: () => void;
}

function useToast(): {
  toast: (message: string, options?: { tone?: 'default' | 'success' | 'warning' | 'error' | 'info'; action?: ToastAction; durationMs?: number }) => void;
};
```

`ToastProvider` sem mudança de assinatura (continua sem props).

### Variants

`cva` no `ToastCard`, base `pointer-events-auto w-80 rounded-md px-4 py-3 text-body-sm font-medium shadow-lg`:

| Tone | Classes |
|---|---|
| `default` | `bg-ink text-bg` (mantido) |
| `success` | `bg-success text-bg` |
| `warning` | `bg-warning text-ink` (fundo claro, texto escuro pra contraste) |
| `error` | `bg-danger text-bg` (era `bg-accent`, corrigido — accent não é semanticamente erro) |
| `info` | `bg-info text-bg` |

### Sizes

Único tamanho (`w-80`, mantido) — toast não varia por `size`, varia por conteúdo (texto quebra linha naturalmente).

### Estados

Entrando, visível (timer rodando), pausado (hover, timer suspenso), saindo.

### Anatomia

```
<motion.div (ToastCard)>
  <span>{message}</span>
  {action && <button>{action.label}</button>}
  <button aria-label="Fechar">×</button>
</motion.div>
```

### Tokens utilizados

Cor: `ink`, `bg`, `success`, `warning`, `danger`, `info`. Radius: `md`. Shadow: `lg` (era `modal`, mais apropriado pro peso visual de toast). Z-index: `toast` (mantido).

### Comportamento

Timer de auto-dismiss (`durationMs`, default 5000ms, mantido) pausa em `onMouseEnter` e retoma o tempo restante em `onMouseLeave` (não reinicia do zero — usa timestamp de início + tempo decorrido). `action`, quando presente, chama `onClick` e depois dispensa o toast automaticamente.

### Acessibilidade

`role="status"` mantido para `default`/`success`/`info`; `role="alert"` para `error`/`warning` (interrompe leitor de tela, apropriado pra erro). Botão de ação e botão de fechar mantêm `aria-label` explícito.

### Motion

`AnimatePresence` na lista de `ToastCard`: entrada `initial={{ opacity: 0, y: 16, scale: 0.95 }}`, `animate={{ opacity: 1, y: 0, scale: 1 }}`, saída `exit={{ opacity: 0, x: 32 }}` (desliza pra fora lateralmente, distingue visualmente de "novo toast entrando"), `transition: spring.snappy`.

### Responsividade

Em `< sm`, `w-80` fixo vira `w-[calc(100%-2rem)]` (evita cortar/vazar em telas pequenas — gap identificado, hoje não tratado).

### Exemplos de uso

```tsx
const { toast } = useToast();
toast('Demanda criada com sucesso', { tone: 'success' });
toast('Falha ao enviar imagem', { tone: 'error' });
toast('Item removido', { tone: 'default', action: { label: 'Desfazer', onClick: undo } });
```

### Casos de uso

Confirmação de sucesso em mutations (gap hoje quase não coberto, conforme auditoria), erro de rede, ações com desfazer.

### Checklist de implementação

- [ ] Migrar `ToastCard` pra `cva` com tons completos
- [ ] Adicionar pausa de timer no hover (timestamp + tempo restante)
- [ ] Adicionar `action` opcional
- [ ] Envolver lista com `AnimatePresence`
- [ ] Adicionar `role="alert"` condicional por tom
- [ ] Ajustar largura responsiva (`< sm`)
- [ ] Atualizar `Toast.test.tsx` cobrindo tons novos, pausa e `action`
