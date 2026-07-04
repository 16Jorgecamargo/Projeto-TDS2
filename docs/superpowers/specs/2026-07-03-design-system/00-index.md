# Design System — Projeto-TDS (Passo 2 do Redesign)

Spec da nova biblioteca de componentes primitivos em `frontend/src/components/ui`. Este documento **não implementa código** — define a API, os tokens e o comportamento que servirão de base para a implementação (fase seguinte, via plano de execução) e, depois, para o redesign das telas.

## Escopo

Redesign completo dos **11 componentes existentes** em `components/ui` (nenhum componente novo é criado neste passo):

- Avatar
- Badge
- Button
- Card
- Drawer
- EmptyState
- ImageUpload
- Modal
- Skeleton
- Toast
- Tooltip

Fora de escopo: Dialog, Tabs, Select, Combobox, Calendar, DatePicker, Table, Command, DropdownMenu e demais primitivos citados no briefing original que não existem hoje no projeto. A auditoria prévia (`docs/frontend-audit/relatorio.md`) mostrou que esses padrões, quando existem, são resolvidos com HTML nativo ou código ad-hoc dentro das features — criar primitivos compartilhados para eles é decisão de um passo futuro, não deste.

## Decisões de escopo (tomadas com o usuário)

| Decisão | Resolução |
|---|---|
| Quais componentes redesenhar | Só os 11 existentes |
| Novas dependências | Adicionar `class-variance-authority` (cva), `framer-motion`, `lucide-react`; `lucide-react` substitui `@heroicons/react` |
| Dark mode | Fora de escopo — só light mode. Tokens ficam organizados para permitir dark mode depois, mas não há toggle nem valores dark neste passo |
| Entregável deste passo | Só a spec (este conjunto de documentos). Implementação em código fica para um plano de execução separado |
| Escala de tokens | Escala completa pedida no briefing original (espaçamento 4–128, radius xs–full, shadow xs–floating), mesmo sem consumidor imediato para todos os valores |
| Motion | Todos os 11 componentes recebem motion via `framer-motion` (hover/tap/entrance/exit conforme o componente), não só as camadas de overlay que já animavam hoje |

## Ordem de leitura

1. `01-tokens.md` — fundação: cores, tipografia, espaçamento, radius, shadow, motion
2. `02-primitives-buttons-inputs.md` — Button, Badge
3. `03-primitives-content.md` — Card, Avatar, Skeleton, EmptyState
4. `04-primitives-overlay.md` — Modal, Drawer, Tooltip, Toast
5. `05-implementation-notes.md` — dependências, convenções de arquivo, checklist de a11y/motion transversal

`ImageUpload` é tratado em `03-primitives-content.md` junto com Avatar (ambos lidam com mídia/imagem).

## Próximos passos após esta spec

1. Usuário revisa os documentos.
2. Skill `writing-plans` gera plano de implementação (dividido em fases por arquivo, conforme convenção do projeto).
3. Implementação dos 11 componentes em código, com testes.
4. Passo 3 (fora deste escopo): redesign das telas usando só os novos primitivos.
