# 03 — Card, Avatar, Skeleton, EmptyState, ImageUpload

## Card

### Análise atual (`components/ui/Card.tsx`)

- Responsabilidade: contêiner de conteúdo agrupado (listagens, dashboards).
- Onde é usado: cards de busca, dashboard, listagens de contrato/demanda.
- Dependências: `cn`.
- API atual: `interactive` (boolean), resto de `HTMLAttributes<HTMLDivElement>`.
- Pontos fortes: simples, `interactive` já cobre o caso de hover clicável.
- Problemas: sem estrutura interna (`Header`/`Body`/`Footer`) — cada feature reimplementa padding/divisor manualmente; sem variante de borda/elevação (todo Card tem o mesmo `p-6` fixo, não serve pra card compacto de lista); boolean `interactive` é o único "estado" — não cobre `selected` (usado em fluxos de seleção, ex. escolher profissional).

### Objetivos do redesign

- Introduzir composição (`Card.Header`, `Card.Body`, `Card.Footer`) mantendo `Card` simples como contêiner raiz — sem quebrar o uso atual (`<Card>{children}</Card>` continua funcionando, sub-componentes são opcionais).
- Adicionar variantes de elevação/borda e estado `selected`.

### Nova API pública

```ts
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'bordered' | 'elevated';
  interactive?: boolean;
  selected?: boolean;
}

Card.Header: FC<HTMLAttributes<HTMLDivElement>>
Card.Body: FC<HTMLAttributes<HTMLDivElement>>
Card.Footer: FC<HTMLAttributes<HTMLDivElement>>
```

### Variants

`cva`, base `rounded-lg bg-bg`:

| Variant | Classes |
|---|---|
| `flat` | sem sombra/borda (default, igual ao atual) |
| `bordered` | `border border-border` |
| `elevated` | `shadow-xs` |

`interactive=true` soma `cursor-pointer transition-shadow hover:shadow-md` (igual comportamento atual, token `hover` renomeado pra `md`). `selected=true` soma `ring-2 ring-primary`.

### Sizes

Não aplicável — Card não tem `size`, padding é controlado por `Card.Header`/`Card.Body`/`Card.Footer` (cada um com `px-6 py-4` como default, ajustável via `className`).

### Estados

Default, hover (só quando `interactive`), selected (novo, `ring-2 ring-primary`), focus-visible (quando `interactive`, precisa ser focável — ver Acessibilidade).

### Anatomia

```
<Card>
  <Card.Header />   (opcional)
  <Card.Body />     (opcional — se omitido, children vai direto no Card)
  <Card.Footer />   (opcional)
</Card>
```

`Card.Header`/`Body`/`Footer` são `div`s simples com padding e (no `Footer`) borda superior (`border-t border-border`) — Context Pattern não é necessário aqui, é composição pura sem estado compartilhado.

### Tokens utilizados

Radius: `lg`. Shadow: `xs`, `md`. Cor: `bg`, `border`, `primary` (ring de selected). Espaçamento: `6` (px-6/py-6), `4` (py-4).

### Comportamento

`Card.Body` sem `Card.Header`/`Footer` é equivalente ao uso atual (`<Card><p>texto</p></Card>` continua idêntico).

### Acessibilidade

Quando `interactive`, Card deve ser `role="button"` + `tabIndex={0}` + handler de `Enter`/`Space` SE não houver um elemento focável nativo dentro (ex.: card que é inteiro um link). Documentar essa responsabilidade do consumidor: se o Card envolve um `<Link>` que ocupa toda a área (via `::after` absolute), não duplicar foco no Card — só o link é focável.

### Motion

`whileHover={{ y: -2 }}` quando `interactive`, `transition: { duration: duration.fast, ease: ease.standard }`. `selected` transiciona `ring` com `transition-shadow duration-base` (CSS, não precisa de framer-motion pra isso).

### Responsividade

Sem breakpoints próprios — padding de `Header`/`Body`/`Footer` pode ser sobrescrito via `className` pra densidade mobile.

### Exemplos de uso

```tsx
<Card variant="bordered">
  <Card.Header><h3>Título</h3></Card.Header>
  <Card.Body>Conteúdo</Card.Body>
  <Card.Footer><Button size="sm">Ação</Button></Card.Footer>
</Card>

<Card interactive selected={selectedId === item.id} onClick={() => select(item.id)}>
  {item.name}
</Card>
```

### Casos de uso

Card de busca de profissional, card de dashboard (métricas), item de listagem selecionável, card de contrato.

### Checklist de implementação

- [ ] Migrar variantes de elevação para `cva`
- [ ] Criar `Card.Header`/`Card.Body`/`Card.Footer` como compound components
- [ ] Adicionar prop `selected`
- [ ] Adicionar `whileHover` via framer-motion quando `interactive`
- [ ] Atualizar `Card.test.tsx` cobrindo composição e `selected`

---

## Avatar

### Análise atual (`components/ui/Avatar.tsx`)

- Responsabilidade: representar usuário (foto ou iniciais).
- Onde é usado: header, chat, listagem de profissionais, cards.
- Dependências: `cn`.
- API atual: `name` (obrigatório), `src`, `size` (`sm`/`md`/`lg`), `className`.
- Pontos fortes: fallback de iniciais já implementado, `aria-label` correto quando não há imagem.
- Problemas: sem indicador de status (online/offline — usado em chat, hoje resolvido fora do componente); sem `size` `xl` (usado em página de perfil); sem tratamento de erro de carregamento de imagem (`<img>` quebrada não cai pro fallback de iniciais).

### Objetivos do redesign

- Fallback automático pra iniciais quando a imagem falha ao carregar (`onError`), não só quando `src` é `null`.
- Adicionar `size` `xl` e indicador de status opcional via slot, sem virar prop boolean nova (`status` como prop tipada, não `isOnline` boolean solto).

### Nova API pública

```ts
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}
```

### Variants

Não há variant de cor — fundo do fallback continua `bg-primary` fixo (consistência de identidade visual, evitar cor aleatória por nome).

### Sizes

| Size | Classes |
|---|---|
| `sm` | `h-8 w-8 text-caption` (igual ao atual) |
| `md` | `h-10 w-10 text-body-sm` (igual ao atual) |
| `lg` | `h-14 w-14 text-h4` (igual ao atual) |
| `xl` | `h-20 w-20 text-h3` (novo — página de perfil) |

### Estados

Default (iniciais ou imagem), erro de carregamento (novo: cai pro fallback de iniciais via `onError`), com status (ponto colorido no canto).

### Anatomia

```
<span (wrapper relative)>
  <img> ou <span (iniciais)>
  {status && <span (dot posicionado absolute)>}
</span>
```

### Tokens utilizados

Radius: `full`. Cor: `primary` (fallback), `success`/`muted`/`warning` (status dot: online/offline/busy). Tipografia: `caption`, `body-sm`, `h4`, `h3`.

### Comportamento

`onError` na `<img>` seta estado interno `imageFailed=true`, forçando o fallback de iniciais mesmo com `src` preenchido.

### Acessibilidade

Mantém `alt={name}` na imagem e `role="img" aria-label={name}` no fallback (igual ao atual). Status dot tem `aria-hidden` (informação de status não é crítica via leitor de tela nesse componente sozinho — se for crítica, o consumidor expõe texto ao lado).

### Motion

Fallback de iniciais anima entrance quando substitui imagem quebrada: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`, `duration: duration.fast`. Sem motion em uso estático (avatar parado não anima).

### Responsividade

N/A — tamanho fixo por prop `size`.

### Exemplos de uso

```tsx
<Avatar name="Maria Silva" src={user.photoUrl} size="lg" />
<Avatar name="João" status="online" />
```

### Casos de uso

Header/topbar, item de chat, card de profissional, página de perfil.

### Checklist de implementação

- [ ] Adicionar `onError` com fallback pra iniciais
- [ ] Adicionar size `xl`
- [ ] Adicionar prop `status` com dot posicionado
- [ ] Atualizar `Avatar.test.tsx` cobrindo erro de imagem e status

---

## Skeleton

### Análise atual (`components/ui/Skeleton.tsx`)

- Responsabilidade: placeholder de carregamento.
- Onde é usado: quase toda tela com `useQuery` (padrão dominante identificado na auditoria).
- Dependências: `cn`.
- API atual: `className`, `aria-label` (default `"Carregando"`).
- Pontos fortes: já usa `role="status"`, já respeita `motion-reduce`.
- Problemas: é só um retângulo — cada feature monta manualmente combinações de Skeleton pra simular texto/avatar/card (sem composição pronta tipo `Skeleton.Text`/`Skeleton.Avatar`).

### Objetivos do redesign

- Manter o componente base (retângulo) intocável na API — só adicionar variantes de forma comuns como sub-exports, sem inventar sistema de layout complexo.

### Nova API pública

```ts
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text';
  'aria-label'?: string;
}
```

### Variants

`cva`, base `animate-pulse bg-surface motion-reduce:animate-none`:

| Variant | Classes |
|---|---|
| `rect` | `rounded-md` (default, igual ao atual) |
| `circle` | `rounded-full` (substitui compor manualmente `className="rounded-full"` — hoje já é feito ad-hoc em alguns lugares) |
| `text` | `rounded-sm h-4` (largura controlada por `className`, altura de linha de texto) |

### Sizes

Não aplicável — dimensão é sempre via `className` (`h-*`/`w-*`), como já é hoje.

### Estados

Único estado é "carregando" — Skeleton não tem outro modo.

### Anatomia

`<div role="status" aria-label={...} />` — sem filhos, sem composição interna.

### Tokens utilizados

Cor: `surface`. Radius: `md`, `full`, `sm`.

### Comportamento

Idêntico ao atual, só adiciona a prop `variant` (default `rect` reproduz 100% o comportamento existente).

### Acessibilidade

Mantém `role="status"` e `aria-label` (já corretos). `motion-reduce:animate-none` mantido.

### Motion

O próprio pulse é a animação — mantém `animate-pulse` do Tailwind (CSS puro), não precisa de framer-motion aqui (evita overhead de JS numa animação que roda em N instâncias simultâneas por tela).

### Responsividade

N/A.

### Exemplos de uso

```tsx
<Skeleton className="h-24 w-24" />
<Skeleton variant="circle" className="h-10 w-10" />
<Skeleton variant="text" className="w-3/4" />
```

### Casos de uso

Loading de lista, loading de avatar, loading de linha de texto — sempre enquanto `isLoading` de uma query.

### Checklist de implementação

- [ ] Migrar classes pra `cva` com `variant`
- [ ] Atualizar `Skeleton.test.tsx` cobrindo `variant`

---

## EmptyState

### Análise atual (`components/ui/EmptyState.tsx`)

- Responsabilidade: comunicar ausência de conteúdo (lista vazia, sem resultados).
- Onde é usado: páginas 403/404 (conforme commits recentes), listagens vazias.
- Dependências: `cn`.
- API atual: `title`, `description?`, `action?`, `className`.
- Pontos fortes: já usado consistentemente nas páginas 403/404 recém-migradas.
- Problemas: sem slot de ícone/ilustração (título sozinho fica pobre visualmente); a auditoria identificou que EmptyState hoje também mascara erro de rede (`isError` cai no mesmo visual de "vazio") — isso é problema de uso nas features, não do componente em si, mas o componente pode oferecer uma variante que deixe essa distinção clara pro consumidor.

### Objetivos do redesign

- Adicionar slot de ícone/ilustração.
- Adicionar `variant` semântica (`empty`/`error`) pra parar de mascarar erro de rede como "vazio" — resolve o problema na camada certa (o componente oferece o visual certo; a feature decide qual usar com base em `isError` vs `data.length === 0`).

### Nova API pública

```ts
interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'empty' | 'error';
}
```

### Variants

`cva`, base `flex flex-col items-center gap-2 rounded-lg px-6 py-12 text-center`:

| Variant | Classes |
|---|---|
| `empty` | `bg-surface` (default, igual ao atual) |
| `error` | `bg-danger/5 border border-danger/20` |

### Sizes

Não aplicável — tamanho é sempre full-width do contêiner pai.

### Estados

Estático, sem interação própria (o `action` passado como children é que carrega interatividade).

### Anatomia

```
<div>
  {icon && <div className="text-muted">{icon}</div>}
  <p (title)>
  {description && <p (description)>}
  {action && <div>{action}</div>}
</div>
```

### Tokens utilizados

Cor: `surface`, `danger`, `ink`, `muted`. Radius: `lg`. Tipografia: `h4`(title), `body-sm`(description). Espaçamento: `6`/`12`.

### Comportamento

`variant="error"` não muda a estrutura, só o visual — o ícone padrão sugerido pra `error` é `AlertTriangle` do lucide (consumidor decide, não é forçado pelo componente).

### Acessibilidade

`icon` decorativo recebe `aria-hidden="true"` internamente. Quando `variant="error"`, o contêiner ganha `role="alert"` (anuncia pra leitor de tela); `variant="empty"` não usa `role="alert"` (não é uma condição que precisa interromper o usuário).

### Motion

Entrance simples quando substitui um Skeleton: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`, `duration: duration.base`.

### Responsividade

Padding responsivo: `py-8` em mobile, `py-12` a partir de `sm:`.

### Exemplos de uso

```tsx
<EmptyState title="Nenhuma demanda encontrada" description="Crie sua primeira demanda para começar." action={<Button>Criar demanda</Button>} />
<EmptyState variant="error" icon={<AlertTriangle />} title="Erro ao carregar" description="Tente novamente em instantes." action={<Button variant="ghost" onClick={refetch}>Tentar novamente</Button>} />
```

### Casos de uso

Lista vazia, resultado de busca vazio, página 403/404, erro de carregamento de query (`isError`).

### Checklist de implementação

- [ ] Adicionar slot `icon`
- [ ] Adicionar `variant` (`empty`/`error`) com `cva`
- [ ] Adicionar `role="alert"` condicional
- [ ] Adicionar motion de entrance
- [ ] Atualizar `EmptyState.test.tsx` cobrindo `variant` e `icon`

---

## ImageUpload

### Análise atual (`components/ui/ImageUpload.tsx`)

- Responsabilidade: upload de imagem única com preview.
- Onde é usado: upload de foto de perfil/anexos (via `features/uploads/api`).
- Dependências: `useToast`, `Skeleton`, `cn`, `uploadImage` de `features/uploads/api` (fora do escopo de UI — **não alterar**, é regra de negócio).
- API atual: `onUploaded`, `label`, `className`.
- Pontos fortes: já limpa `ObjectURL` no unmount (`useEffect` cleanup), já usa toast de erro.
- Problemas: sem drag-and-drop (só clique); sem preview de erro de validação de tipo/tamanho antes de tentar upload; visual do input é só um botão de texto — sem área de drop nem estado de "arrastando arquivo sobre".

### Objetivos do redesign

Puramente visual — mesma lógica de upload (`onUploaded`, `uploadImage`, cleanup de `ObjectURL`), sem tocar na camada de rede/hooks. Adiciona drag-and-drop e estado visual de dropzone.

### Nova API pública

```ts
interface ImageUploadProps {
  onUploaded: (result: UploadResult) => void;
  label?: string;
  className?: string;
}
```

Sem mudança na assinatura pública — só no visual/interação interna (dropzone).

### Variants

Único visual (dropzone), sem variantes de cor/tom — não é esse tipo de componente.

### Sizes

Não aplicável — dimensão do preview (`h-24 w-24`) mantida, ajustável via `className`.

### Estados

Default (dropzone vazia), dragging (novo: borda `border-primary` + `bg-primary/5` enquanto arquivo é arrastado sobre a área), uploading (Skeleton, igual hoje), preview (imagem enviada, igual hoje), erro (toast, igual hoje).

### Anatomia

```
<div>
  <label/dropzone (input file sr-only dentro)>
  {uploading && <Skeleton />}
  {!uploading && preview && <img />}
</div>
```

### Tokens utilizados

Cor: `border`, `primary`, `ink`, `muted`. Radius: `sm`(label), `md`(preview).

### Comportamento

Idêntico ao atual (`handleChange` chamando `uploadImage`), só adiciona handlers `onDragOver`/`onDragLeave`/`onDrop` que alimentam o mesmo fluxo de `handleChange` (extraído para função compartilhada que recebe `File` direto, chamada tanto pelo `<input onChange>` quanto pelo `onDrop`).

### Acessibilidade

Mantém `aria-label={label}` no input (igual atual). Dropzone com `role="button"` implícito via `label`, mantém foco visível ao usar Tab (já funciona via `<label>` nativo).

### Motion

Borda de dragging anima com `transition-colors duration-fast` (CSS, sem necessidade de framer-motion — é só troca de cor de borda). Preview de imagem tem entrance: `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}`.

### Responsividade

Dropzone ocupa `w-fit` (igual atual) — não estica pra `w-full` a menos que o consumidor passe `className`.

### Exemplos de uso

```tsx
<ImageUpload onUploaded={(result) => setPhotoUrl(result.url)} label="Enviar foto de perfil" />
```

### Casos de uso

Foto de perfil (profissional/cliente), anexo de imagem em disputa/review.

### Checklist de implementação

- [ ] Extrair lógica de upload de `handleChange` pra função compartilhada `processFile(file: File)`
- [ ] Adicionar `onDragOver`/`onDragLeave`/`onDrop` chamando `processFile`
- [ ] Adicionar estado visual `dragging` (borda/bg)
- [ ] Adicionar motion de entrance no preview
- [ ] Atualizar `ImageUpload.test.tsx` cobrindo drag-and-drop
