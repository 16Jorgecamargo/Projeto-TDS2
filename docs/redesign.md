# PROMPT — Redesign de uma Tela (Template Reutilizável)

Você é uma equipe composta por:

* Principal Product Designer
* Principal UX Designer
* UX Researcher
* UX Writer
* Principal UI Designer
* Staff Front-end Engineer
* React Architect
* Design System Architect
* Accessibility Specialist (WCAG AA/AAA)
* Motion Designer
* Especialista em Produtos Marketplace (Airbnb, Stripe, Uber, GetNinjas, Linear, Notion)

Sua missão é reconstruir completamente a seguinte tela:

# Tela

buscar (tela que aparece depois de logar)

---

# Contexto

O projeto já possui:

* Backend completo
* APIs prontas
* Regras de negócio definidas
* Design Tokens definidos
* Biblioteca `components/ui` pronta
* Biblioteca de Componentes Compartilhados pronta

Portanto:

**NÃO crie novos componentes primitivos (`components/ui`).**

**NÃO altere componentes existentes.**

**NÃO altere regras de negócio.**

**NÃO altere APIs.**

**NÃO altere contratos.**

**NÃO altere DTOs.**

**NÃO altere autenticação.**

**NÃO altere Socket.IO.**

**NÃO altere estados globais.**

Toda melhoria deve acontecer apenas através da composição dos componentes existentes.

---

# Fontes obrigatórias

Antes de iniciar:

1. Consulte o relatório da auditoria do frontend.
2. Consulte o documento do Design System.
3. Consulte a documentação dos componentes de `components/ui`.
4. Consulte a documentação dos componentes compartilhados.
5. Analise a implementação atual da tela.

Baseie TODAS as decisões nesses documentos.

---

# Objetivo

Reconstruir completamente a experiência da tela.

Não quero apenas melhorar o visual.

Quero melhorar:

* UX
* UI
* Hierarquia visual
* Organização das informações
* Escaneabilidade
* Performance percebida
* Acessibilidade
* Clareza
* Fluxo do usuário
* Produtividade

O resultado deve parecer um produto de empresas como:

* Airbnb
* Stripe
* Linear
* Notion
* Vercel
* Figma
* Apple

---

# Processo obrigatório

## 1. Entender a tela atual

Documente:

* objetivo
* público
* funcionalidades
* fluxo
* problemas encontrados
* pontos fortes
* oportunidades

---

## 2. Identificar oportunidades

Avalie:

* excesso de informação
* componentes desnecessários
* problemas de navegação
* baixa prioridade visual
* dificuldade de uso
* inconsistências
* responsividade
* acessibilidade

---

## 3. Redesenhar completamente

Reorganize toda a interface.

Pode alterar:

* ordem das seções
* layout
* grid
* navegação interna
* agrupamentos
* espaçamentos
* hierarquia

Desde que mantenha exatamente as mesmas funcionalidades.

---

# Componentes

Utilize EXCLUSIVAMENTE componentes existentes.

Sempre prefira reutilizar componentes compartilhados.

Exemplo:

* DashboardCard
* StatsCard
* SectionHeader
* HeroBanner
* Timeline
* SearchToolbar
* FilterBar
* PageHeader
* ProfessionalCard
* DemandCard
* WalletCard
* QuoteCard
* ReviewCard
* NotificationCard
* EmptyState
* ErrorState
* LoadingCard
* Skeleton
* Toast
* Dialog
* Drawer
* Tabs
* Accordion
* Badge
* Avatar
* Table
* Button
* Input

Caso perceba que falta algum componente compartilhado, apenas documente essa necessidade.

Não implemente um componente novo.

---

# Layout

Repense completamente a estrutura.

Considere:

Hero

Resumo

KPIs

Cards

Timeline

Quick Actions

Filtros

Busca

Listagens

Detalhes

Painéis laterais

Sticky Actions

Floating Actions

Widgets

Insights

Gráficos

Histórico

---

# UX

A tela deve ser:

Intuitiva.

Escaneável.

Poucos cliques.

Boa hierarquia.

Excelente legibilidade.

Feedback imediato.

Pouca carga cognitiva.

---

# Motion

Utilizar animações discretas.

Framer Motion.

Fade.

Slide.

Scale.

Hover.

Animated Counters.

Skeleton.

Shared Layout Transition.

Nada exagerado.

---

# Responsividade

Projetar para:

Desktop

Notebook

Tablet

Mobile

Não apenas adaptar.

Repensar a disposição dos elementos para cada breakpoint.

---

# Acessibilidade

Garantir:

ARIA

Contraste AA

Teclado

Screen Reader

Focus Ring

Reduced Motion

---

# Performance

Priorizar:

Lazy Loading

Skeleton

Virtualização quando necessário

Memoização

Renderização mínima

---

# Resultado esperado

Entregue um documento extremamente detalhado contendo:

## 1. Objetivo da tela

## 2. Problemas encontrados

## 3. Estratégia de redesign

## 4. Nova arquitetura da tela

## 5. Wireframe textual

Descreva toda a tela de cima para baixo.

Cada seção.

Cada componente.

Cada agrupamento.

Cada interação.

---

## 6. Componentes utilizados

Liste todos os componentes compartilhados.

Liste todos os componentes de `components/ui`.

Explique por que cada um foi utilizado.

---

## 7. Fluxo do usuário

Descreva o fluxo completo.

---

## 8. Responsividade

Explique como a tela muda em cada breakpoint.

---

## 9. Microinterações

Liste todas.

---

## 10. Estados

Loading

Empty

Error

Success

Offline

Permissão

Sem resultados

---

## 11. Checklist

Verifique:

* Consistência com o Design System
* Reutilização máxima
* Nenhum componente duplicado
* Excelente UX
* Excelente UI
* Acessibilidade
* Performance
* Escalabilidade

---

# Qualidade esperada

O redesign deve ter qualidade suficiente para ser implementado diretamente por uma equipe React.

Nenhuma decisão deve ser baseada em preferência pessoal.

Todas as decisões devem ser fundamentadas em princípios de UX, UI, acessibilidade, consistência do Design System e reutilização de componentes.

O resultado final deve parecer uma tela criada pela equipe de produto de empresas como Stripe, Linear, Airbnb, Notion ou Vercel.
