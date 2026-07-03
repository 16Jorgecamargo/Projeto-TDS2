## Fase E — Verificação Final (Task 12)

### Task 12: Verificação final da Fase 5

Esta task NÃO é dispatch de subagent implementador — é executada pelo controller pessoalmente, seguindo o mesmo padrão da Task 13 da Fase 4 (verificação visual interativa não delegada a subagent).

**Pré-requisito:** Tasks 1-11 completas e commitadas (Fases A, B, C, D).

- [ ] **Step 1: Rodar a suíte completa, typecheck e lint do frontend**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa, incluindo todos os testes novos das Tasks 1-11 e todos os testes já existentes das fases anteriores (nenhuma regressão).

- [ ] **Step 2: Subir o ambiente de desenvolvimento**

Suba backend e frontend em modo dev (mesmo processo usado nas verificações das Fases 2, 3 e 4).

- [ ] **Step 3: Verificação visual interativa via Playwright MCP**

O controller deve navegar manualmente (via Playwright MCP) por cada uma das 4 áreas, em desktop e em pelo menos um breakpoint mobile (375px), cobrindo:

- **Chat**: abrir `/chat` direto (deve mostrar o `EmptyState` restilizado); abrir uma conversa a partir de um contrato existente (botão "Chat" na tela de detalhe de contrato, já ligado desde a Fase 4) e confirmar que `ChatWindow` mostra as bolhas com as cores de token (`bg-accent`/`bg-surface`), envia mensagem, e a mensagem aparece em tempo real.
- **Notificações**: confirmar que o sino no `Topbar` mostra o contador de não lidas com a cor de accent; abrir `/notifications` e confirmar que a lista aparece dentro de `Card`, com `Badge` "Não lida" nos itens pendentes, e que "Marcar lida" funciona e faz o badge sumir.
- **Admin**: logar como usuário `admin`, abrir `/admin`, confirmar que denúncias e disputas aparecem em `Card`s separados com `Badge` de status correto (`urgent` pra pendente/aberto, `neutral` pra resolvido), abrir o `Modal` de resolução de uma denúncia e de uma disputa, confirmar que a disputa exige nota preenchida pra habilitar "Confirmar" e a denúncia aceita nota vazia, confirmar de fato uma resolução e ver o item sumir/mudar de status na lista.
- **Configurações**: abrir `/settings`, confirmar que as 3 seções aparecem visualmente distintas, salvar preferências, marcar/desmarcar um consentimento, abrir o `Modal` de confirmação de exclusão de conta, cancelar sem confirmar, e por fim confirmar a exclusão dentro do modal e ver o estado "Exclusão agendada" aparecer.

Qualquer bug real encontrado durante essa verificação deve ser corrigido diretamente pelo controller antes de considerar a Fase 5 completa (mesmo padrão da Task 13 da Fase 4).

- [ ] **Step 4: Atualizar o ledger da fase**

Registre em `.superpowers/sdd/progress-phase5.md` a conclusão de todas as 12 tasks e o resultado da verificação visual (bugs encontrados e corrigidos, se houver; observações não-bloqueantes, se houver).

- [ ] **Step 5: Marcar a Fase 5 como completa**

Escreva no ledger: `FASE 5 COMPLETA. HEAD final: <hash do último commit>.` — isso fecha o redesign completo do frontend (Fases 1-5).
