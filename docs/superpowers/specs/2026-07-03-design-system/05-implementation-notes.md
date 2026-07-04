# 05 — Notas de Implementação Transversais

Este arquivo não introduz nada novo por componente — cobre o que se repete em todos os 11 e fica fora de lugar em cada doc individual.

## Dependências novas

Adicionar em `frontend/package.json` (`dependencies`):

- `class-variance-authority` — variants tipadas (substitui `Record<Variant, string>` manual em Button/Badge/Card/Skeleton/EmptyState/Toast)
- `framer-motion` — motion em todos os 11 componentes
- `lucide-react` — substitui `@heroicons/react` em todos os usos (spinner do Button, ícones de fechar em Modal/Drawer/Toast, ícones de exemplo em Badge/EmptyState)

Remover (fase de implementação, não desta spec): `@heroicons/react`, só depois de confirmado que nenhum uso restou fora de `components/ui` (a auditoria já lista onde heroicons aparece — checar contra esse inventário antes de remover a dependência do `package.json`).

`tailwind-merge` e `clsx` (via `cn` em `lib/utils.ts`) são mantidos — cva não substitui a necessidade de mesclar classes externas (`className` do consumidor ainda passa por `cn`).

## Convenções de arquivo

- Cada componente continua em arquivo próprio (`ComponentName.tsx` + `ComponentName.test.tsx`), sem introduzir pasta por componente — os 11 são pequenos o bastante pra não precisar de `index.ts` + `Component.tsx` + `Component.styles.ts` separados.
- Variants de `cva` ficam no topo do próprio arquivo do componente (não em arquivo `.variants.ts` separado) — evita indireção desnecessária pra componentes desse tamanho.
- Tokens de motion (`duration`, `ease`, `spring`, `fadeVariants`, `scaleVariants`, `slideVariants`) ficam centralizados em `frontend/src/lib/motion.ts` (novo arquivo), importados por quem precisa — evita duplicar constantes de animação nos 11 arquivos.
- `Slot` (para `asChild` do Button) fica em `frontend/src/lib/slot.tsx` (novo arquivo, implementação mínima do padrão, não depender de `@radix-ui/react-slot` como dependência nova só por isso — é ~30 linhas, ver implementação de referência do shadcn/ui).

## Checklist transversal de acessibilidade (repete-se em todos)

- [ ] Contraste de texto AA (4.5:1 pra texto normal, 3:1 pra texto grande) checado em cada combinação cor de fundo/texto nova (`success`, `warning`, `danger`, `info`)
- [ ] `focus-visible` com anel usando token `focus`, nunca `outline: none` sem substituto
- [ ] Nenhuma informação transmitida só por cor (Badge/Toast sempre têm texto ou ícone junto do tom)
- [ ] Componentes interativos (`Button`, `Card interactive`, dropzone do `ImageUpload`) navegáveis 100% por teclado
- [ ] `prefers-reduced-motion` respeitado — todo componente com motion usa `useReducedMotion` do framer-motion pra reduzir/remover transições de escala e translate quando o usuário pediu (Skeleton já faz isso via `motion-reduce:` do Tailwind, os demais fazem via framer-motion)

## Checklist transversal de motion

- [ ] `duration`/`ease`/`spring` sempre importados de `lib/motion.ts`, nunca valores mágicos inline
- [ ] Motion de overlay (Modal/Drawer/Toast/Tooltip) sempre via `AnimatePresence` — sem exceção, já que todos alternam mount/unmount
- [ ] Motion de hover/tap (Button/Card) usa `whileHover`/`whileTap`, não `initial`/`animate` (evita relayout desnecessário)
- [ ] Nenhum componente anima propriedades que disparam layout (`width`/`height`/`top`/`left`) — sempre `transform`/`opacity`

## Testes

Todos os 11 já têm `.test.tsx` — o redesign deve estender os arquivos existentes (não recriar do zero), adicionando casos pra cada item novo listado no "checklist de implementação" de cada componente em `02`/`03`/`04`. Convenção mantida: `@testing-library/react` + `vitest` (já configurado no projeto, sem mudança de ferramenta de teste).

## Ordem de implementação sugerida (para o plano de execução)

1. `lib/motion.ts` + `lib/slot.tsx` (fundação compartilhada)
2. Tokens: `tailwind.config.js` + `index.css` (cores/radius/shadow/tipografia novos)
3. Button, Badge (menor risco, mais usados, validam o padrão `cva`+motion antes de propagar)
4. Card, Avatar, Skeleton, EmptyState, ImageUpload
5. Modal, Drawer (focus trap é o item de maior risco técnico — reservar tempo)
6. Tooltip, Toast
7. Trocar `@heroicons/react` → `lucide-react` nos 11 componentes e remover a dependência antiga do `package.json` depois de confirmado que não sobrou uso fora de `components/ui`
