Você é uma equipe composta por:

- Product Designer Sênior
- UX Researcher
- UX Writer
- Front-end Architect
- Staff React Engineer
- Especialista em Design Systems
- Especialista em Gamificação de UX
- Especialista em Produtos Marketplace (Airbnb, GetNinjas, Uber, Fiverr)

Sua missão é realizar um redesign completo do frontend do projeto.

IMPORTANTE

NÃO altere absolutamente nenhuma regra de negócio.

NÃO altere o backend.

NÃO altere endpoints.

NÃO altere contratos da API.

NÃO altere DTOs.

NÃO altere autenticação.

NÃO altere sockets.

NÃO altere banco de dados.

Toda melhoria deve acontecer EXCLUSIVAMENTE na camada React.

Considere que o backend já está pronto.

Sempre reutilize os endpoints existentes.

Caso alguma funcionalidade esteja difícil de utilizar, reorganize a interface.

Caso seja necessário criar novas páginas ou componentes apenas para melhorar UX, faça isso sem medo.

Caso alguma informação já exista na API mas hoje não seja exibida de maneira eficiente, utilize-a.

Sempre priorize experiência do usuário.

━━━━━━━━━━━━━━━━━━━━━━

## Stack

React 19

Vite

TypeScript

Tailwind

TanStack Query

React Hook Form

Zod

Socket.io

React Router

Zustand

━━━━━━━━━━━━━━━━━━━━━━

## Contexto do Produto

O sistema é um Marketplace de Prestação de Serviços semelhante ao GetNinjas.

Existem três tipos de usuários.

Cliente.

Profissional.

Administrador.

Fluxo principal:

Cliente publica demanda.

↓

Profissionais enviam orçamentos.

↓

Cliente aceita um orçamento.

↓

Contrato é criado.

↓

Execução do serviço.

↓

Atualizações de progresso.

↓

Pagamento.

↓

Avaliações.

↓

Carteira do profissional.

↓

Saque.

Além disso existem:

Chat

Carteira

Notificações

Disputas

Administração

LGPD

Configurações

Convites

Portfólio

Disponibilidade

Áreas de atendimento

━━━━━━━━━━━━━━━━━━━━━━

## Documento base

Analise completamente o documento contendo todas as telas atuais do sistema.

Antes de sugerir qualquer alteração, compreenda como cada tela funciona hoje.

Identifique:

- problemas de UX

- problemas de UI

- inconsistências

- duplicações

- telas pobres

- formulários cansativos

- fluxos quebrados

- navegação ruim

- oportunidades de melhoria

━━━━━━━━━━━━━━━━━━━━━━

## Objetivo

Transformar o sistema em um produto moderno.

O resultado deve parecer um SaaS Premium.

Referências:

Airbnb

Stripe

Linear

Notion

Figma

Framer

Uber

GetNinjas

Discord

Apple

Vercel

━━━━━━━━━━━━━━━━━━━━━━

## Estilo

Quero um visual extremamente moderno.

Não quero aparência administrativa.

Não quero CRUD tradicional.

Não quero formulários enormes.

Não quero tabelas gigantes.

Quero:

Cards

Dashboard

Timeline

Quick Actions

Widgets

Resumo

Indicadores

Hero Cards

Animações

Hover

Glassmorphism leve

Sombras suaves

Muito espaçamento

Ícones consistentes

Empty States

Skeleton Loading

Motion Design

Microinterações

━━━━━━━━━━━━━━━━━━━━━━

## Navegação

Repense completamente.

Hoje praticamente não existe navegação.

Crie uma arquitetura moderna.

Sugestão:

Sidebar recolhível

Topbar

Breadcrumb

Pesquisa global

Quick Search

Notification Center

Command Palette (Ctrl + K)

Perfil do usuário

Switcher de perfil

Menu contextual

━━━━━━━━━━━━━━━━━━━━━━

## Dashboard Cliente

Não quero uma simples lista.

Quero um verdadeiro painel.

Mostrar:

Demandas abertas

Demandas em andamento

Últimos orçamentos

Contratos ativos

Serviços concluídos

Profissionais favoritos

Notificações

Últimas avaliações

Próximos pagamentos

Ações rápidas

Publicar demanda

Buscar profissional

Ver contratos

━━━━━━━━━━━━━━━━━━━━━━

## Dashboard Profissional

Hoje é apenas um formulário.

Transforme em um painel profissional.

Mostrar:

Receita do mês

Novos convites

Demandas próximas

Agenda

Serviços em andamento

Avaliações recentes

Performance

Perfil

Portfólio

Disponibilidade

Resumo financeiro

Carteira

Ranking

━━━━━━━━━━━━━━━━━━━━━━

## Dashboard Admin

Criar um dashboard completo.

Indicadores.

Usuários.

Novos cadastros.

Disputas.

Denúncias.

Contratos.

Pagamentos.

Carteira.

Saques.

Gráficos.

KPIs.

━━━━━━━━━━━━━━━━━━━━━━

## Landing

Refazer completamente.

Hero.

Categorias.

Como funciona.

Depoimentos.

Vídeos.

CTA.

━━━━━━━━━━━━━━━━━━━━━━

## Busca

Transformar em experiência semelhante ao Airbnb.

Filtros laterais.

Mapa opcional.

Cards ricos.

Ordenação.

Favoritos.

Badges.

Avaliações.

Preço.

Disponibilidade.

━━━━━━━━━━━━━━━━━━━━━━

## Perfil Público

Transformar em um perfil premium.

Banner.

Avatar.

Galeria.

Portfólio.

Serviços.

Especialidades.

Avaliações.

Linha do tempo.

Disponibilidade.

Botão contratar.

Botão chat.

Botão favorito.

━━━━━━━━━━━━━━━━━━━━━━

## Demandas

Melhorar completamente.

Timeline.

Status.

Arquivos.

Fotos.

Comentários.

Histórico.

Orçamentos.

Indicadores.

━━━━━━━━━━━━━━━━━━━━━━

## Contratos

Criar experiência semelhante ao Trello.

Progresso.

Checklist.

Timeline.

Fotos.

Atualizações.

Chat lateral.

Pagamento.

Disputa.

━━━━━━━━━━━━━━━━━━━━━━

## Carteira

Dashboard financeiro.

Saldo.

Saldo pendente.

Receitas.

Gráficos.

Extrato.

Filtros.

Saques.

Indicadores.

━━━━━━━━━━━━━━━━━━━━━━

## Chat

Inspirado no Discord.

Lista lateral.

Conversas.

Busca.

Indicador online.

Digitando.

Upload.

Emoji.

Anexos.

━━━━━━━━━━━━━━━━━━━━━━

## Notificações

Central completa.

Agrupar por data.

Categorias.

Filtros.

Pesquisar.

━━━━━━━━━━━━━━━━━━━━━━

## Configurações

Separar em abas.

Conta.

Perfil.

Segurança.

LGPD.

Notificações.

Tema.

Idioma.

Privacidade.

━━━━━━━━━━━━━━━━━━━━━━

## Componentes

Caso necessário criar:

HeroCard

DashboardCard

StatsCard

QuickActionCard

Timeline

ActivityFeed

ProfileCard

ReviewCard

QuoteCard

DemandCard

ContractCard

WalletCard

NotificationCard

ChatSidebar

SearchBar Premium

Command Palette

Context Menu

Floating Button

Drawer

Bottom Sheet

Wizard

Stepper

Toast

Popover

Tooltip

Progress Ring

Charts

Calendar

Availability Calendar

Portfolio Gallery

Photo Viewer

Image Upload

Review Modal

Loading Skeleton

Error State

Empty State

Success State

━━━━━━━━━━━━━━━━━━━━━━

## Motion Design

Utilizar:

Framer Motion

Hover

Fade

Scale

Slide

Parallax leve

Page Transition

Animated Counters

Animated Progress

Ripple

━━━━━━━━━━━━━━━━━━━━━━

## Responsividade

Desktop

Notebook

Tablet

Celular

Tudo deve funcionar perfeitamente.

━━━━━━━━━━━━━━━━━━━━━━

## Acessibilidade

ARIA

Contraste AA

Navegação por teclado

Screen Reader

Foco visível

━━━━━━━━━━━━━━━━━━━━━━

## Organização

Proponha uma nova arquitetura de pastas.

Organize por Feature.

Componentes compartilhados.

Layouts.

Providers.

Hooks.

UI.

Domain.

━━━━━━━━━━━━━━━━━━━━━━

## Resultado esperado

Quero um documento extremamente detalhado.

Para CADA tela existente:

- analisar
- criticar
- apontar problemas
- explicar melhorias
- redesenhar completamente

Caso seja necessário criar novas telas, crie.

Caso seja necessário dividir telas existentes em várias menores, faça.

Caso seja necessário criar dashboards novos, faça.

Caso seja necessário criar novos componentes, faça.

Caso seja necessário alterar completamente a navegação, faça.

No final entregue:

- Novo Sitemap
- Fluxo completo dos usuários
- Wireframe textual de todas as telas
- Componentes novos
- Componentes removidos
- Design System
- Guia de UX
- Guia de UI
- Arquitetura React
- Estrutura de pastas
- Responsividade
- Plano de migração incremental (sem quebrar o backend)
- Checklist de implementação priorizado (Alta, Média e Baixa prioridade)

O objetivo é que esse documento tenha qualidade suficiente para servir como especificação oficial do novo frontend e possa ser implementado diretamente por uma equipe de desenvolvimento React.