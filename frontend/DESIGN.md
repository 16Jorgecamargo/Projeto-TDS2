---
name: Services Marketplace
description: Marketplace de serviços gerais — indigo de confiança, coral de urgência, direto ao ponto
colors:
  primary: "oklch(0.420 0.150 280)"
  primary-hover: "oklch(0.360 0.150 280)"
  accent: "oklch(0.680 0.190 45)"
  accent-hover: "oklch(0.610 0.190 45)"
  bg: "oklch(1.000 0.000 0)"
  surface: "oklch(0.960 0.014 280)"
  ink: "oklch(0.200 0.020 280)"
  muted: "oklch(0.520 0.012 280)"
typography:
  display:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-accent-hover:
    backgroundColor: "{colors.accent-hover}"
  card:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
---

# Design System: Services Marketplace

## 1. Overview

**Creative North Star: "The Working Handshake"**

Two profissionais fecham um acordo com um aperto de mão — rápido, direto, sem cerimônia, mas com peso de compromisso. É essa a sensação que a interface persegue: confiança que não precisa de ornamento pra se provar, e agilidade que não vira pressa descuidada. O indigo profundo carrega o peso do contrato assinado; o coral entra só no momento de decisão — aceitar, contratar, agir agora.

O sistema rejeita explicitamente aparência administrativa, CRUD tradicional cru, formulários enormes de uma vez só e tabelas gigantes como interface primária (herdado de `PRODUCT.md`). Cada tela é composta como painel — cards, timeline, ações rápidas — nunca como grade de dados nua.

**Key Characteristics:**
- Indigo (`primary`) domina estrutura: topbar, sidebar ativa, botões de ação principal.
- Coral (`accent`) é raro e sempre significa "aja agora": aceitar orçamento, badge novo, CTA de urgência.
- Superfícies planas em repouso; sombra só aparece como resposta a interação.
- Tipografia única (Manrope), sem mistura de famílias — hierarquia por peso e tamanho, não por fonte trocada.

## 2. Colors

Paleta **Committed**: uma cor de marca (indigo) carrega a maior parte da superfície estrutural; o coral é usado com extrema disciplina.

### Primary
- **Indigo Handshake** (`oklch(0.420 0.150 280)`): topbar, item de sidebar ativo, botão primário, links, foco de input. Nunca mais que ~40% de qualquer tela — domina estrutura, não preenchimento de conteúdo.

### Secondary
- **Working Coral** (`oklch(0.680 0.190 45)`): reservado para o momento de decisão — aceitar orçamento, badge "novo", status "ativo", CTA de urgência em contrato/disputa. Texto sobre ele é sempre branco (`bg`).

### Neutral
- **Pure Paper** (`oklch(1.000 0.000 0)`): fundo padrão de toda tela.
- **Handshake Surface** (`oklch(0.960 0.014 280)`): cards, painéis, sidebar em repouso, badges neutros — puxado ~10% pro hue do primary, nunca cinza puro.
- **Ink** (`oklch(0.200 0.020 280)`): texto de corpo, contraste ~15:1 vs `bg`.
- **Muted Ink** (`oklch(0.520 0.012 280)`): texto secundário, timestamps, legendas — contraste ~4.6:1 vs `bg`.

### Named Rules
**The Rarity Rule.** Coral aparece em no máximo um elemento por seção de tela. Se dois elementos coral competem no mesmo campo de visão, um deles perde a cor.

## 3. Typography

**Display Font:** Manrope (com fallback Inter, system-ui, sans-serif)
**Body Font:** Manrope
**Label/Mono Font:** Manrope (mesma família, peso 600, tracking positivo)

**Character:** Uma sans geométrica única carregando toda a hierarquia — direto, sem ruído de duas famílias competindo, hierarquia resolvida por peso e tamanho.

### Hierarchy
- **Display** (700, `clamp(2rem, 4vw, 3.5rem)`, 1.1): título de dashboard, hero de landing.
- **Headline** (700, `clamp(1.5rem, 2.5vw, 2rem)`, 1.2): título de seção, título de card grande.
- **Title** (600, 1.125rem, 1.4): título de card, nome de item de lista.
- **Body** (400, 1rem, 1.6): texto corrido, descrições, até 65–75ch por linha.
- **Label** (600, 0.8125rem, 1.3, tracking 0.01em): labels de campo, tags de status, itens de nav.

### Named Rules
**The One Voice Rule.** Uma única família tipográfica em todo o produto. Se a hierarquia não está clara com peso e tamanho, o problema é a escala, não a fonte.

## 4. Elevation

Sistema **flat-by-default**: superfícies em repouso não têm sombra. Sombra existe exclusivamente como resposta a estado — hover, foco, drag, modal aberto sobre o conteúdo. Card em repouso se distingue do fundo por cor de superfície (`surface` vs `bg`), não por sombra.

### Shadow Vocabulary
- **hover-lift** (`box-shadow: 0 4px 16px oklch(0.200 0.020 280 / 0.08)`): cards e botões ao passar o mouse/focar.
- **modal** (`box-shadow: 0 24px 64px oklch(0.200 0.020 280 / 0.18)`): modais e drawers sobre o backdrop.

### Named Rules
**The Response-Only Rule.** Se uma sombra existe num elemento em repouso, ela está errada — mova a distinção pra cor de superfície.

## 5. Components

### Buttons
- **Shape:** cantos levemente arredondados (`rounded: 6px`).
- **Primary:** fundo `Indigo Handshake`, texto branco, padding `10px 20px`.
- **Hover / Focus:** fundo escurece para `oklch(0.360 0.150 280)`; foco visível com anel de 2px na cor `primary` deslocado 2px do elemento.
- **Accent (CTA de urgência):** fundo `Working Coral`, texto branco — usar só quando a ação é "aja agora" (aceitar, contratar, confirmar pagamento).
- **Ghost:** sem fundo, texto `ink`, borda 1px `surface` — usado para ações secundárias (cancelar, voltar).

### Badges
- **Style:** fundo `surface`, texto `ink`, cantos totalmente arredondados (`rounded: full`), padding `4px 12px`.
- **Estado ativo/urgente:** fundo `accent`, texto branco.

### Cards / Containers
- **Corner Style:** `rounded: 16px`.
- **Background:** `bg` (branco) sobre fundo de página `surface`, ou `surface` sobre fundo `bg` — sempre um passo de contraste entre card e página.
- **Shadow Strategy:** nenhuma em repouso; `hover-lift` só quando o card é clicável.
- **Internal Padding:** `24px`.

### Inputs / Fields
- **Style:** borda 1px `surface` puxada mais escura, fundo `bg`, cantos `rounded: 6px`.
- **Focus:** borda muda para `primary`, anel de foco 2px.
- **Error:** borda `accent`-adjacent em vermelho semântico separado da paleta de marca (não reutilizar coral para erro).

### Navigation
- **Sidebar item (repouso):** texto `muted`, sem fundo.
- **Sidebar item (ativo):** fundo `surface`, texto `primary`, peso 600.
- **Topbar:** fundo `bg`, borda inferior 1px `surface`, fixo no topo, sem sombra em repouso.
- **Mobile bottom tabs:** mesmo padrão de estado ativo (texto `primary` + ícone preenchido) sobre fundo `bg` com borda superior 1px `surface`.

### Command Palette (Signature Component)
Modal centralizado com fundo `bg`, sombra `modal`, borda `rounded: 16px`. Resultado ativo (navegado por teclado) recebe fundo `surface`. Sem sombra nos itens da lista — só no container do modal.

## 6. Do's and Don'ts

### Do:
- **Do** usar indigo (`primary`) para toda estrutura de navegação e ação principal — ele é o peso de confiança do sistema.
- **Do** reservar coral (`accent`) só para o momento de decisão/urgência, nunca como cor de fundo geral.
- **Do** manter cards planos em repouso; sombra só entra como resposta a hover/foco/drag (**The Response-Only Rule**).
- **Do** compor toda tela como painel — cards, timeline, ações rápidas, indicadores.

### Don't:
- **Don't** dar aparência administrativa a nenhuma tela — herdado de `PRODUCT.md`.
- **Don't** usar CRUD tradicional cru (formulário → tabela → formulário) como padrão de interação.
- **Don't** empilhar formulários enormes num único passo; quebrar em etapas/wizard quando o formulário passar de ~5 campos.
- **Don't** usar tabela gigante como interface primária de nenhuma tela voltada a cliente ou profissional (admin pode usar tabela pontualmente, nunca como única visão).
- **Don't** misturar uma segunda família tipográfica — a hierarquia é peso/tamanho, não fonte trocada (**The One Voice Rule**).
- **Don't** usar coral em mais de um elemento por seção visível (**The Rarity Rule**).
