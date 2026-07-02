# Product

## Register

product

## Users

Três papéis: **Cliente** (publica demandas, contrata profissionais, paga via carteira interna), **Profissional** (recebe convites, envia orçamentos, executa serviços, gerencia portfólio/disponibilidade, saca carteira), **Administrador** (modera denúncias e disputas). Uso majoritariamente mobile e desktop, em momentos de decisão (escolher profissional, aceitar orçamento) e de acompanhamento (progresso de contrato, chat, notificações).

## Product Purpose

Marketplace de prestação de serviços gerais (tipo GetNinjas): cliente publica demanda → profissionais orçam → cliente aceita → contrato → execução com progresso → pagamento → avaliação → carteira do profissional → saque. Hoje o frontend é funcional mas sem navegação global, dashboards são formulários/listas cruas, e várias funcionalidades existentes na API (notificações, chat, carteira) não têm visibilidade adequada na UI. Sucesso = interface parecer um SaaS premium sem alterar nenhuma regra de negócio, endpoint, DTO, autenticação ou banco.

## Brand Personality

Confiável, ágil, direto. Combina segurança percebida (pagamento e contrato protegidos) com rapidez de conexão cliente-profissional e simplicidade sem jargão — sem se vestir de admin/CRUD.

## Anti-references

Aparência administrativa. CRUD tradicional. Formulários enormes de uma vez só. Tabelas gigantes como interface primária. Excesso de card idênticos repetidos.

## Design Principles

- Cada tela é um painel (dashboard/timeline/cards), nunca apenas uma lista ou formulário cru.
- Navegação sempre visível e descobrível — nada de funcionalidade só acessível digitando URL direta.
- Reaproveitar 100% dos endpoints/contratos existentes; toda melhoria vive exclusivamente na camada React.
- Dar visibilidade a dados que já existem na API mas hoje ficam escondidos (notificações, carteira, portfólio, avaliações).
- Estados vazio/carregando/erro são cidadãos de primeira classe em cada tela, não um afterthought.

## Accessibility & Inclusion

WCAG AA: contraste mínimo AA, navegação completa por teclado, suporte a screen reader (ARIA), foco visível em todos os elementos interativos, `prefers-reduced-motion` respeitado em toda animação.
