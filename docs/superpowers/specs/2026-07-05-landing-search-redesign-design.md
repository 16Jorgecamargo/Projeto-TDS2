# Redesign de LandingPage e SearchPage — Design

Data: 2026-07-05

## Escopo

Reconstruir `LandingPage` e `SearchPage` (`frontend/src/features/landing/`) via composição dos primitivos existentes em `components/ui`, corrigindo gaps funcionais identificados na auditoria e expandindo o conteúdo da Landing (hoje curta demais, parece amadora). Sem novos primitivos em `components/ui`, sem alteração de API/DTO/regra de negócio/contrato.

## Contexto atual

- Ambas as telas já passaram por um restyle puro (fase anterior, só tokens, "sem redesenho de conteúdo/fluxo" — decisão explícita e já executada). Este redesign vai além: reorganiza conteúdo/fluxo, mantendo as mesmas funcionalidades de negócio.
- `LandingPage.tsx`: hero (headline + `SearchBar` + badges de confiança hardcoded) + `CategoryGrid`. 46 linhas, sem grid de seções, sem prova social, sem CTA de fechamento — a auditoria e o usuário concordam que está curta demais.
- `SearchPage.tsx`: `SearchFilters` (lateral) + `ProfessionalResults` (grid). Gaps confirmados pela auditoria:
  - `sort`/`onlyAvailable` são `useState` local, não persistem na URL (perdem ao recarregar/compartilhar) — só `q`/`city`/`state`/`categoryId` vão pra URL.
  - Sem paginação visível, apesar de `SearchResponse` já trazer `page`/`limit`/`total`.
  - Sem debounce nos inputs de `SearchFilters` — cada tecla dispara refetch.
  - `SearchFilters` não usa Zod/RHF (diferente de `SearchBar`, que usa `searchFormSchema`) — validação inconsistente entre as duas entradas de busca.
  - `ProfessionalResults` erro é `EmptyState` sem ação de retry.
  - `CategoryGrid` renderiza o mesmo ícone genérico (`Squares2X2Icon`) pra toda categoria — API não retorna ícone por categoria.
- Nenhum componente compartilhado do tipo `PageHeader`/`SearchToolbar`/`FilterBar`/`HeroBanner`/`Pagination` existe hoje — só os 11 primitivos de `components/ui` (`Avatar`, `Badge`, `Button`, `Card`, `Drawer`, `EmptyState`, `ImageUpload`, `Modal`, `Skeleton`, `Toast`, `Tooltip`). Nenhum `Table`/`Tabs`/`Accordion`/`Select` existe — fora de escopo do design system atual.
- Fontes de dados reais disponíveis sem qualquer novo endpoint: `useSearchProfessionals` (retorna `total` real, e `ratingAverage`/`ratingCount` por item — permite "profissionais em destaque" via slice ordenado client-side, e uma contagem real de profissionais), `useCategories` (contagem real de categorias ativas), `fetchProfessionalReviews`/`useProfessionalReviews` por `professionalId` (endpoint público de reviews, permite depoimentos reais dos profissionais em destaque, ao custo de N chamadas extras).

## Decisões (validadas com o usuário)

1. **Corrigir gaps funcionais**, não só visual: URL como fonte única de verdade (todos os filtros + sort + onlyAvailable + page), debounce, validação unificada, paginação real, retry no erro, ícone por categoria via mapa local (sem depender de campo novo da API).
2. **Componentes compartilhados novos** em `frontend/src/features/landing/components/` (composição de primitivos, não primitivos novos): `PageHeader`, `SearchToolbar`, `FilterBar`, `Pagination`.
3. **Paginação numerada clássica** (não infinite-scroll), sincronizada via `?page=`.
4. **Landing expandida** com conteúdo real onde possível: Hero, tira de confiança com números reais, Categorias em destaque, Profissionais em destaque (dados reais), Como funciona (estático), Depoimentos (reviews reais dos profissionais em destaque), FAQ (estático).

## Arquitetura

### Componentes novos (composição, `frontend/src/features/landing/components/`)

**`PageHeader`**
```ts
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}
```
Título + subtítulo + slot de ação à direita. Usado no topo de `SearchPage`. Composição pura de `<h1>`/`<p>`, sem primitivo novo.

**`SearchToolbar`**
```ts
interface SearchToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  sort: 'rating' | 'price';
  onSortChange: (value: 'rating' | 'price') => void;
}
```
Campo de busca (reusa padrão visual de `AuthField`-like input, mas local a esta feature — não importa de `features/auth`), botão "Filtros" (visível só abaixo de `lg:`, abre `Drawer`), `<select>` de ordenação restilizado com tokens. Debounce de 400ms aplicado internamente antes de chamar `onQueryChange`.

**`FilterBar`**
```ts
interface FilterBarProps {
  categoryId?: string;
  onCategoryChange: (value?: string) => void;
  city?: string;
  onCityChange: (value?: string) => void;
  state?: string;
  onStateChange: (value?: string) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
}
```
Substitui `SearchFilters.tsx` (renomeado/reescrito). Usa `searchFormSchema` (o mesmo Zod schema do `SearchBar`) via `react-hook-form` — unifica validação. Renderizado dentro de `Drawer` (mobile/tablet) ou fixo numa coluna lateral (`w-64`, desktop `lg:+`) — mesmo componente, dois containers diferentes escolhidos pela página.

**`Pagination`**
```ts
interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}
```
Números de página + Anterior/Próxima. `nav aria-label="Paginação"`, página atual com `aria-current="page"`. Só renderiza (retorna `null`) quando `total <= limit`. Em mobile, mostra só Anterior/Próxima + "página X de Y" (sem números intermediários).

### Utilitário novo (não é componente, feature-local)

**`categoryIcon.ts`** (`frontend/src/features/landing/lib/categoryIcon.ts`)
```ts
export function getCategoryIcon(categoryName: string): LucideIcon
```
Mapa de palavras-chave (case-insensitive, ex.: "limpeza"→`SprayCan`, "elétric"→`Zap`, "encanad"→`Wrench`, "pintura"→`PaintRoller`, "jardim"→`Trees`, "reforma"→`Hammer`, "aula"/"professor"→`GraduationCap`, "beleza"→`Sparkles`, "tecnologia"/"ti"→`Laptop`, "transporte"→`Truck`) com fallback `Squares2X2`-equivalente do lucide-react (`LayoutGrid`). Roda inteiramente client-side, sem alteração de API.

### Query nova (reuso do endpoint existente, sem novo endpoint)

**`useFeaturedProfessionals`** (`frontend/src/features/landing/queries.ts`, nova função no arquivo existente)
```ts
function useFeaturedProfessionals(limit = 3)
```
Chama `useSearchProfessionals({ limit: 12 })` (sem filtros) e faz `.sort((a, b) => b.ratingAverage - a.ratingAverage).slice(0, limit)` no `select` do React Query — nenhum parâmetro novo no backend, só uso client-side do que a API já retorna.

### Query de depoimentos

Para os `limit` profissionais retornados por `useFeaturedProfessionals`, a `LandingPage` chama `useProfessionalReviews(professionalId, { page: 1, limit: 1 })` (hook já existente, `features/reviews`) para cada um, pegando a review mais recente/relevante de cada. Isso é N chamadas adicionais (N = profissionais em destaque, tipicamente 3) — aceito pelo usuário como custo do conteúdo real.

## Wireframe — LandingPage

1. **Hero** (`bg-surface`, full-width dentro do `AppShell`): headline "Encontre o profissional certo", subheadline, `SearchBar` centralizado (`max-w-2xl`), 3 badges de confiança (mantém conteúdo atual: pagamento protegido / profissionais avaliados / resposta rápida).
2. **Tira de confiança com números reais** (`bg-bg`, `border-y border-border`, faixa horizontal, 2-3 números): "X profissionais cadastrados" (via `total` de uma chamada `useSearchProfessionals({ limit: 1 })`), "Y categorias de serviço" (via `useCategories().length`). Números renderizados com `Skeleton` enquanto carregam, `Animated Counter` (Framer Motion `useSpring`) ao aparecer.
3. **Categorias em destaque**: grid responsivo de `Card interactive` (mantém), cada card ganha ícone específico via `getCategoryIcon(category.name)`.
4. **Profissionais em destaque**: `<h2>` + grid de 3 `ProfessionalCard` (componente já existente, reusado sem alteração), dados de `useFeaturedProfessionals(3)`. Loading: 3 `Skeleton` no formato do card. Vazio (sem profissionais cadastrados ainda): seção inteira omitida (`return null` do bloco), não mostra `EmptyState` numa landing pública.
5. **Como funciona**: 3 passos estáticos ("Busque", "Compare", "Contrate") em `Card flat` (grid 3 colunas desktop, coluna única mobile), ícone lucide-react + título curto + descrição de 1 linha cada.
6. **Depoimentos**: grid de até 3 `Card flat` com a review mais recente de cada profissional em destaque (nome do profissional via `Avatar` + nota + trecho do comentário). Se um profissional em destaque não tiver review, seu card é omitido da seção (não quebra o grid, só renderiza os que têm dado real). Se nenhum tiver review, a seção inteira é omitida.
7. **FAQ**: lista de 5-6 perguntas estáticas (ex.: "Como funciona o pagamento?", "Profissionais são verificados?"), cada uma um `Card flat` com cabeçalho clicável que expande/recolhe a resposta (estado local `useState<string | null>` guardando qual está aberta — comportamento tipo accordion, sem criar primitivo `Accordion` novo em `components/ui`, é composição local desta página).
8. **CTA de fechamento**: faixa final (`bg-primary text-bg`) convidando profissionais a se cadastrarem, com `Button asChild` linkando pra `/register`.

## Wireframe — SearchPage

1. `PageHeader` — título "Resultados da busca", subtítulo com contagem (`aria-live="polite"`, ex. "42 profissionais encontrados").
2. `SearchToolbar` — busca inline (debounced) + botão "Filtros" (abre `Drawer` contendo `FilterBar`, visível só abaixo de `lg:`) + `<select>` de ordenação.
3. Layout: desktop (`lg:+`) — grid 2 colunas, `FilterBar` fixo (`w-64`) + coluna de resultados. Mobile/tablet — `FilterBar` só dentro do `Drawer`, resultados full-width.
4. Grid de `ProfessionalCard` (mantém componente, populado por `ProfessionalResults` reescrito para ler/escrever todos os filtros — incluindo `sort`/`onlyAvailable`/`page` — via `useSearchParams`).
5. `Pagination` no rodapé, só quando `total > limit`.

## Fluxo do usuário

Visitante entra em `/` → vê Hero com busca, rola pra ver categorias/destaques/prova social/FAQ → clica numa categoria (vai pra `/search?categoryId=...`) ou busca por texto (vai pra `/search?q=...`) → em `/search`, ajusta filtros/ordenação/disponibilidade (tudo refletido na URL, compartilhável) → navega páginas via `Pagination` → clica num `ProfessionalCard` (fluxo já existente, inalterado) → se erro de rede, vê `EmptyState` com "Tentar novamente" → se filtro não retorna nada, vê `EmptyState` com "Limpar filtros".

## Responsividade

| Breakpoint | Landing | Search |
|---|---|---|
| Mobile (<768px) | Hero empilhado, badges em coluna, tira de números em coluna, categorias 2 colunas, destaque/depoimentos 1 coluna, Como funciona 1 coluna, FAQ full-width | `SearchToolbar` com botão Filtros abrindo `Drawer`; resultados 1 coluna; `Pagination` compacta (Anterior/Próxima + "X de Y") |
| Tablet (768–1023px) | Categorias 4 colunas, destaque/depoimentos 2 colunas, Como funciona coluna única | `FilterBar` ainda no `Drawer`; resultados 2 colunas |
| Desktop/notebook (≥1024px) | Categorias 6 colunas, destaque/depoimentos/Como funciona 3 colunas lado a lado | `FilterBar` fixo lateral (`w-64`); resultados 2 colunas; `Pagination` numerada completa |

## Microinterações (Framer Motion, reusa `lib/motion.ts`)

- Hero: fade+slide-up no mount (`fadeVariants`+`spring.gentle`), uma vez.
- `Card interactive` (categorias, destaque): `whileHover={{y:-2}}` já embutido no primitivo — sem duplicar.
- Troca de página/filtro em Search: `AnimatePresence mode="wait"` na grid de resultados, fade rápido (`duration.fast`).
- `Drawer` de filtros: motion nativo do primitivo — mantém.
- Contador de números reais na Landing: `useSpring`/`useTransform` do Framer Motion animando o valor ao carregar.
- FAQ: expandir/recolher resposta com `AnimatePresence` + altura automática (`initial={{height:0}} animate={{height:'auto'}}`), `duration.fast`.
- Skeleton→conteúdo: cross-fade curto (`duration.fast`).

## Acessibilidade

- `PageHeader`/`SearchToolbar`: contagem de resultados em região `aria-live="polite"`.
- `Pagination`: `nav aria-label="Paginação"`, `aria-current="page"` na página ativa.
- `Drawer` de filtros: foco vai pro primeiro campo ao abrir (comportamento já existente do primitivo via focus trap).
- FAQ: cabeçalho clicável é `<button aria-expanded={isOpen} aria-controls={answerId}>`, resposta com `id={answerId}`.
- Contraste AA nos ícones de categoria e badges (tokens já validados).
- `prefers-reduced-motion`: coberto globalmente via `MotionConfig reducedMotion="user"` (já em `App.tsx`, nenhuma mudança necessária).

## Estados

- **Loading**: `Skeleton` em cada seção com dado assíncrono (categorias, destaque, depoimentos, números, resultados de busca) — sempre no formato do conteúdo final (evita layout shift).
- **Empty**: categorias vazias → `EmptyState` (mantém); destaque/depoimentos vazios → seção omitida (não é erro, é ausência de dado numa landing pública); busca sem resultado → `EmptyState` com ação "Limpar filtros".
- **Error**: `ProfessionalResults` → `EmptyState` variant error com ação "Tentar novamente" (`refetch()` do React Query).
- **Success**: grids normais + `Pagination` quando aplicável.
- **Offline**: tratado como Error (sem detector de conectividade novo — fora de escopo, nenhum componente disponível pra isso).
- **Permissão**: não aplicável, ambas as telas são públicas.

## Componentes reusados vs novos

**Reusados sem alteração**: `Card` (+`interactive`/`flat`), `Button` (+`asChild`), `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Drawer`, `ProfessionalCard` (feature `professional`, já existente).

**Novos (composição de feature, não primitivos)**: `PageHeader`, `SearchToolbar`, `FilterBar` (substitui `SearchFilters`), `Pagination`, todos em `frontend/src/features/landing/components/`.

**Utilitário novo**: `getCategoryIcon` (`frontend/src/features/landing/lib/categoryIcon.ts`).

**Query nova (reuso de endpoint existente)**: `useFeaturedProfessionals` em `frontend/src/features/landing/queries.ts`.

**Nenhum novo componente em `components/ui`.**

## Fora de escopo

Novos primitivos em `components/ui` (`Table`/`Tabs`/`Accordion`/`Select` reais), endpoint de stats agregadas no backend, endpoint de "featured professionals" no backend, endpoint de FAQ/CMS, detector de conectividade offline, dark mode, alteração de API/DTO/regras de negócio/Socket.IO/estado global.
