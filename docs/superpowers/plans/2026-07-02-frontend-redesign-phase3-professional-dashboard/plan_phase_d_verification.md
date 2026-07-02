# Fase D — Verificação Visual Interativa (Task 15)

Ver `plan_index.md` para Global Constraints.

### Task 15: Verificação visual via Playwright MCP (feita pelo controller, não delegada a subagent)

Igual ao que foi feito ao final da Fase 2: o controller (não um subagent) dirige a sessão interativa do Playwright MCP, tirando screenshots reais das telas implementadas nas Tasks 1-14, corrigindo ao vivo qualquer bug real encontrado — não é uma spec de e2e delegada.

**Pré-requisitos antes de começar:**
- Todas as Tasks 1-14 completas e commitadas.
- Backend rodando (porta 3000).
- Frontend dev server rodando (`cd frontend && npm run dev`, porta 5173).
- Um usuário de papel `professional` com login válido — se não existir, criar um via `/register` selecionando o papel `professional`, verificar o e-mail (ou usar o fluxo de teste já estabelecido no projeto para contornar a verificação em ambiente de dev).

**Roteiro de verificação (desktop, então repetir os pontos-chave em 375px):**

1. Login como profissional → confirmar que `/` redireciona para `ProfessionalDashboardPage` (não mais para a Landing Page) — este é o bug corrigido na Task 8.
2. Screenshot de `/professional/dashboard`: confirmar que os 6 widgets renderizam (Ações rápidas, Receita, Agenda, Contratos em andamento, Resumo do perfil, Avaliações recentes), com `EmptyState` correto nos que não têm dado (usuário novo não deve ter contratos/avaliações ainda).
3. Clicar em "Editar perfil" (tanto pelo Quick Action quanto pelo link do `DashboardProfileSummaryCard`) → confirmar que navega para `/professional/profile`.
4. Em `/professional/profile`: preencher e salvar o `ProfileForm`, confirmar que o valor persiste após reload.
5. Adicionar um item de portfólio, depois testar o upload de foto nesse item (via `ImageUpload`) — confirmar que a miniatura aparece tanto no `PortfolioManager` quanto na pré-visualização `PortfolioGallery` acima dele, após reload.
6. Adicionar um slot de disponibilidade, confirmar que aparece tanto no `AvailabilityManager` quanto na pré-visualização `AvailabilityGrid` acima dele.
7. Adicionar uma área de atendimento, confirmar que aparece na lista.
8. Verificar a navegação: sidebar/navbar mobile do profissional deve mostrar "Perfil" apontando para `/professional/profile` (não mais duas entradas duplicadas "Portfólio/Perfil" e "Disponibilidade" apontando para a rota antiga).
9. Testar pelo menos um breakpoint mobile (375px) nas telas do passo 2 e 4 — mesma prática já validada na Fase 2, que encontrou um bug real só visível em mobile.

**Se qualquer bug real for encontrado** (não apenas um Minor cosmético já esperado): corrigir ao vivo, rodar a suíte de testes afetada, e commitar a correção com uma mensagem clara (ex.: `fix(professional-dashboard): <descrição do bug encontrado na verificação visual>`), no mesmo padrão usado para os 2 bugs reais encontrados durante a verificação visual da Fase 2 (schema de URL de imagem + proxy de `/uploads` no Vite dev server).

**Ao final:**
- [ ] Rodar a suíte completa do frontend uma última vez: `cd frontend && npx vitest run`
- [ ] Rodar typecheck e lint: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings 0`
- [ ] Rodar os testes de integração do backend afetados: `cd backend && npx vitest run src/modules/portfolio/portfolio.routes.test.ts`
- [ ] Atualizar `.superpowers/sdd/progress-phase3.md` marcando a Fase 3 como completa, incluindo o commit HEAD final.
